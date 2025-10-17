const createResponse = () => {
  const res = {
    statusCode: null,
    payload: null
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.payload = data;
    return res;
  });
  return res;
};

const createMockUserModel = () => {
  const select = jest.fn().mockResolvedValue([
    { name: 'Alice', email: 'alice@example.com', role: 'resident', createdAt: new Date() }
  ]);
  const limit = jest.fn().mockReturnValue({ select });
  const sort = jest.fn().mockReturnValue({ limit });

  return {
    countDocuments: jest.fn().mockResolvedValue(6),
    aggregate: jest
      .fn()
      .mockResolvedValueOnce([
        { _id: 'resident', count: 4 },
        { _id: 'collector', count: 2 }
      ])
      .mockResolvedValueOnce([
        { _id: { day: new Date().toISOString().slice(0, 10), role: 'resident' }, count: 2 }
      ]),
    find: jest.fn().mockReturnValue({ sort }),
    select
  };
};

const createMockBinModel = () => {
  const select = jest.fn().mockResolvedValue([
    { _id: 'bin1', status: 'full', type: 'Plastic', createdAt: new Date() }
  ]);
  return {
    countDocuments: jest.fn().mockResolvedValue(3),
    aggregate: jest.fn().mockResolvedValue([
      { _id: 'Plastic', count: 2 },
      { _id: 'Glass', count: 1 }
    ]),
    find: jest.fn().mockReturnValue({ select }),
    schema: {
      path: jest.fn((field) => {
        if (field === 'status') return null;
        if (field === 'type') return {};
        return null;
      })
    }
  };
};

const createMockCollectionModel = () => {
  const select = jest.fn().mockResolvedValue([
    { _id: 'col1', status: 'PENDING', createdAt: new Date() }
  ]);
  return {
    countDocuments: jest.fn().mockResolvedValue(5),
    aggregate: jest.fn().mockResolvedValue([
      { _id: 'PENDING', count: 4 },
      { _id: 'COLLECTED', count: 1 }
    ]),
    find: jest.fn().mockReturnValue({ select })
  };
};

const loadController = ({ userModel, binModel, collectionModel, withVirtualCollection = false } = {}) => {
  jest.resetModules();
  const userMock = userModel || createMockUserModel();
  const binMock = binModel || (binModel === null ? null : createMockBinModel());

  jest.doMock('../../src/models/User', () => userMock);

  if (binModel === false) {
    jest.doMock('../../src/models/Bin', () => {
      throw new Error('Bin model unavailable');
    });
  } else {
    jest.doMock('../../src/models/Bin', () => binMock);
  }

  if (collectionModel === false) {
    jest.doMock('../../src/models/Collection', () => {
      throw new Error('Collection model unavailable');
    });
  } else if (collectionModel) {
    jest.doMock('../../src/models/Collection', () => collectionModel, { virtual: withVirtualCollection });
  } else {
    jest.doMock('../../src/models/Collection', () => createMockCollectionModel(), {
      virtual: true
    });
  }

  // eslint-disable-next-line global-require
  const controller = require('../../src/controllers/adminController');
  return { controller, mocks: { userMock, binMock } };
};

describe('adminController.getDashboard', () => {
  test('responds with metrics and charts', async() => {
    const { controller, mocks } = loadController();
    const res = createResponse();

    await controller.getDashboard({}, res);

    expect(mocks.userMock.countDocuments).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      metrics: expect.any(Object),
      charts: expect.any(Object),
      recentUsers: expect.any(Array)
    }));
  });

  test('handles errors gracefully', async() => {
    const errorUserModel = createMockUserModel();
    errorUserModel.countDocuments.mockRejectedValue(new Error('db down'));

    const { controller } = loadController({ userModel: errorUserModel });
    const res = createResponse();

    await controller.getDashboard({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to load admin dashboard data' });
  });

  test('continues when collection aggregation fails', async() => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const collectionModel = {
      ...createMockCollectionModel(),
      aggregate: jest.fn().mockRejectedValue(new Error('agg fail'))
    };

    const { controller } = loadController({ collectionModel, withVirtualCollection: true });
    const res = createResponse();

    await controller.getDashboard({}, res);

    expect(warnSpy).toHaveBeenCalledWith('[ADMIN][DASHBOARD][COLLECTIONS]', 'agg fail');
    expect(res.payload.charts.collectionStatuses).toBeNull();
    warnSpy.mockRestore();
  });

  test('continues when bin aggregation fails', async() => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const binModel = {
      ...createMockBinModel(),
      aggregate: jest.fn().mockRejectedValue(new Error('bin agg fail')),
      schema: {
        path: jest.fn((field) => (field === 'status' ? {} : null))
      }
    };

    const { controller } = loadController({ binModel });
    const res = createResponse();

    await controller.getDashboard({}, res);

    expect(warnSpy).toHaveBeenCalledWith('[ADMIN][DASHBOARD][BINS]', 'bin agg fail');
    expect(res.payload.charts.binStatus).toBeNull();
    warnSpy.mockRestore();
  });

  test('omits collection chart when aggregation empty', async() => {
    const collectionModel = {
      ...createMockCollectionModel(),
      aggregate: jest.fn().mockResolvedValue([])
    };

    const { controller } = loadController({ collectionModel, withVirtualCollection: true });
    const res = createResponse();

    await controller.getDashboard({}, res);

    expect(res.payload.charts.collectionStatuses).toBeNull();
  });

  test('omits bin chart when aggregation empty', async() => {
    const binModel = {
      ...createMockBinModel(),
      aggregate: jest.fn().mockResolvedValue([])
    };

    const { controller } = loadController({ binModel });
    const res = createResponse();

    await controller.getDashboard({}, res);

    expect(res.payload.charts.binStatus).toBeNull();
  });
});

describe('adminController reports and listings', () => {
  test('getUsersReport returns user list', async() => {
    const mockUsers = createMockUserModel();
    const select = jest.fn().mockResolvedValue([{ name: 'Bob' }]);
    mockUsers.find.mockReturnValue({ select });

    const { controller } = loadController({ userModel: mockUsers });
    const res = createResponse();

    await controller.getUsersReport({}, res);

    expect(select).toHaveBeenCalledWith('name email role createdAt');
    expect(res.json).toHaveBeenCalledWith([{ name: 'Bob' }]);
  });

  test('getUsersReport handles errors', async() => {
    const mockUsers = createMockUserModel();
    const select = jest.fn().mockRejectedValue(new Error('fail'));
    mockUsers.find.mockReturnValue({ select });

    const { controller } = loadController({ userModel: mockUsers });
    const res = createResponse();

    await controller.getUsersReport({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to generate users report' });
  });

  test('getBinsReport returns bins when model available', async() => {
    const mockBins = createMockBinModel();
    const select = jest.fn().mockResolvedValue([{ _id: 'bin1' }]);
    mockBins.find.mockReturnValue({ select });

    const { controller } = loadController({ binModel: mockBins });
    const res = createResponse();

    await controller.getBinsReport({}, res);

    expect(select).toHaveBeenCalledWith('_id status type createdAt');
    expect(res.json).toHaveBeenCalledWith([{ _id: 'bin1' }]);
  });

  test('getBinsReport returns 404 when bins model missing', async() => {
    const { controller } = loadController({ binModel: false });
    const res = createResponse();

    await controller.getBinsReport({}, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ message: 'Bins model not available' });
  });

  test('getCollectionsReport returns data', async() => {
    const mockCollections = createMockCollectionModel();
    const select = jest.fn().mockResolvedValue([{ _id: 'col1' }]);
    mockCollections.find.mockReturnValue({ select });

    const { controller } = loadController({ collectionModel: mockCollections, withVirtualCollection: true });
    const res = createResponse();

    await controller.getCollectionsReport({}, res);

    expect(select).toHaveBeenCalledWith('_id status createdAt');
    expect(res.json).toHaveBeenCalledWith([{ _id: 'col1' }]);
  });

  test('getCollectionsReport returns 404 when collection model missing', async() => {
    const { controller } = loadController({ collectionModel: false });
    const res = createResponse();

    await controller.getCollectionsReport({}, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ message: 'Collections model not available' });
  });

  test('getOverviewReport aggregates totals', async() => {
    const mockUsers = createMockUserModel();
    const mockBins = createMockBinModel();
    const mockCollections = createMockCollectionModel();

    const { controller } = loadController({
      userModel: mockUsers,
      binModel: mockBins,
      collectionModel: mockCollections,
      withVirtualCollection: true
    });
    const res = createResponse();

    await controller.getOverviewReport({}, res);

    expect(res.json).toHaveBeenCalledWith({ totalUsers: 6, totalBins: 3, totalCollections: 5 });
  });

  test('getUsers lists users', async() => {
    const mockUsers = createMockUserModel();
    const select = jest.fn().mockResolvedValue([{ name: 'Alice' }]);
    mockUsers.find.mockReturnValue({ select });

    const { controller } = loadController({ userModel: mockUsers });
    const res = createResponse();

    await controller.getUsers({}, res);
    expect(res.json).toHaveBeenCalledWith([{ name: 'Alice' }]);
  });

  test('getBins lists bins', async() => {
    const mockBins = createMockBinModel();
    const select = jest.fn().mockResolvedValue([{ _id: 'bin1' }]);
    mockBins.find.mockReturnValue({ select });

    const { controller } = loadController({ binModel: mockBins });
    const res = createResponse();

    await controller.getBins({}, res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'bin1' }]);
  });

  test('getBins returns empty list when model missing', async() => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { controller } = loadController({ binModel: false });
    const res = createResponse();

    await controller.getBins({}, res);

    expect(warnSpy).toHaveBeenCalledWith('[ADMIN][BINS] Bin model unavailable; returning empty list.');
    expect(res.payload).toEqual([]);
    warnSpy.mockRestore();
  });

  test('getCollections lists collections', async() => {
    const mockCollections = createMockCollectionModel();
    const select = jest.fn().mockResolvedValue([{ _id: 'col1' }]);
    mockCollections.find.mockReturnValue({ select });

    const { controller } = loadController({ collectionModel: mockCollections, withVirtualCollection: true });
    const res = createResponse();

    await controller.getCollections({}, res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'col1' }]);
  });

  test('getCollections returns empty list when model missing', async() => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { controller } = loadController({ collectionModel: false });
    const res = createResponse();

    await controller.getCollections({}, res);

    expect(warnSpy).toHaveBeenCalledWith('[ADMIN][COLLECTIONS] Collection model unavailable; returning empty list.');
    expect(res.payload).toEqual([]);
    warnSpy.mockRestore();
  });
});

describe('adminController.optimizeRoute', () => {
  test('requires area and schedule', async() => {
    const { controller } = loadController();
    const res = createResponse();

    await controller.optimizeRoute({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Area and schedule (start/end) are required.' });
  });

  test('returns simulated data when no bins require collection', async() => {
    const mockBinModel = createMockBinModel();
    mockBinModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    const { controller } = loadController({ binModel: mockBinModel });
    const res = createResponse();
    const body = { area: 'Zone A', schedule: { start: '08:00', end: '12:00' }, truck: { id: 'TRK-1' } };

    await controller.optimizeRoute({ body }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      summary: expect.objectContaining({ selectedBins: 0 }),
      estimated: { distanceKm: 0, durationMinutes: 0 }
    }));
  });

  test('generates prioritized route for candidate bins', async() => {
    const mockBinModel = createMockBinModel();
    const now = new Date();
    mockBinModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: 'bin1', fillLevel: 80, updatedAt: now },
        { _id: 'bin2', fillLevel: 90, updatedAt: now }
      ])
    });

    const { controller } = loadController({ binModel: mockBinModel });
    const res = createResponse();
    const body = { area: 'Zone A', schedule: { start: '08:00', end: '12:00' }, truck: { capacity: 1 } };

    await controller.optimizeRoute({ body }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      summary: expect.objectContaining({ selectedBins: 1 }),
      route: expect.arrayContaining([expect.objectContaining({ binId: 'bin2' })])
    }));
  });

  test('optimizeRoute returns sample route when bin model missing', async() => {
    const { controller } = loadController({ binModel: false });
    const res = createResponse();
    const body = { area: 'Downtown', schedule: { start: '07:00', end: '09:00' } };

    await controller.optimizeRoute({ body }, res);

    expect(res.payload).toEqual(expect.objectContaining({
      warnings: expect.arrayContaining(['Bin model unavailable.']),
      delivery: expect.objectContaining({ status: 'sample' })
    }));
  });

  test('optimizeRoute falls back when bin query fails', async() => {
    const select = jest.fn().mockRejectedValue(new Error('Query failed'));
    const failingBinModel = {
      ...createMockBinModel(),
      find: jest.fn().mockReturnValue({ select })
    };

    const { controller } = loadController({ binModel: failingBinModel });
    const res = createResponse();
    const body = { area: 'Zone B', schedule: { start: '09:00', end: '11:00' }, truck: {} };

    await controller.optimizeRoute({ body }, res);

    expect(res.payload).toEqual(expect.objectContaining({
      warnings: expect.arrayContaining(['Bin query failed; using simulation data.'])
    }));
  });
});
