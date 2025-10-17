jest.mock('../../src/models/Bin', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn()
}));

const binController = require('../../src/controllers/binController');
const Bin = require('../../src/models/Bin');
const { HTTP_STATUS, BIN_TYPES_ARRAY, VALIDATION_LIMITS } = require('../../src/constants');

const createRes = () => {
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

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('binController.createBin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Bin.create.mockReset();
    Bin.findById.mockReset();
    Bin.find.mockReset();
  });

  test('rejects invalid bin type', async() => {
    const req = { body: { type: 'INVALID' }, user: { id: 'user1' } };
    const res = createRes();

    await binController.createBin(req, res, jest.fn());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      message: `Invalid bin type. Allowed types: ${BIN_TYPES_ARRAY.join(', ')}`
    });
    expect(Bin.create).not.toHaveBeenCalled();
  });

  test('creates bin for valid request', async() => {
    const req = { body: { type: BIN_TYPES_ARRAY[0] }, user: { id: 'user1' } };
    const res = createRes();
    const bin = { id: 'bin1' };
    Bin.create.mockResolvedValue(bin);

    await binController.createBin(req, res, jest.fn());
  await flushPromises();

    expect(Bin.create).toHaveBeenCalledWith({ owner: 'user1', type: BIN_TYPES_ARRAY[0], maxLevel: 100 });
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bin created successfully', bin });
  });
});

describe('binController.updateFilthLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Bin.create.mockReset();
    Bin.findById.mockReset();
    Bin.find.mockReset();
  });

  const buildReq = (body = {}, user = { id: 'user1', role: 'resident' }) => ({
    params: { binId: 'bin1' },
    body,
    user
  });

  const buildBinDoc = (overrides = {}) => ({
    _id: 'bin1',
    owner: { _id: 'user1' },
    filthLevel: 50,
    maxLevel: 100,
    save: jest.fn().mockResolvedValue(null),
    ...overrides
  });

  const mockFind = (bin) => {
    Bin.findById.mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(bin)
    }));
  };

  test('rejects non-numeric addedFilth', async() => {
    const res = createRes();
    await binController.updateFilthLevel(buildReq({ addedFilth: 'NaN' }), res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: 'addedFilth must be a valid number' });
  });

  test('rejects negative addedFilth', async() => {
    const res = createRes();
    await binController.updateFilthLevel(buildReq({ addedFilth: -5 }), res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: 'addedFilth cannot be negative' });
  });

  test('enforces maximum limit', async() => {
    const res = createRes();
    await binController.updateFilthLevel(buildReq({ addedFilth: VALIDATION_LIMITS.FILTH_LEVEL_MAX + 1 }), res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: `addedFilth value too large (max: ${VALIDATION_LIMITS.FILTH_LEVEL_MAX})` });
  });

  test('returns 404 when bin missing', async() => {
    mockFind(null);
    const res = createRes();
    await binController.updateFilthLevel(buildReq({ addedFilth: 10 }), res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bin not found' });
  });

  test('prevents resident from updating other bins', async() => {
    const bin = buildBinDoc({ owner: { _id: 'owner-id' } });
    mockFind(bin);
    const res = createRes();
    await binController.updateFilthLevel(buildReq({ addedFilth: 10 }), res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  test('successfully updates bin respecting max level', async() => {
    const bin = buildBinDoc({ filthLevel: 95, maxLevel: 100 });
    mockFind(bin);
    const res = createRes();
    const next = jest.fn();

    await binController.updateFilthLevel(buildReq({ addedFilth: 10 }), res, next);
    await flushPromises();

    if (next.mock.calls.length) {
      throw next.mock.calls[0][0];
    }

    expect(bin.save).toHaveBeenCalled();
    expect(bin.filthLevel).toBe(100);
    expect(res.json).toHaveBeenCalledWith({ message: 'Filth level updated', bin });
    expect(Bin.findById).toHaveBeenCalledWith('bin1');
  });

  test('allows admin to update any bin', async() => {
    const bin = buildBinDoc({ owner: { _id: 'other-user' }, filthLevel: 10 });
    mockFind(bin);
    const res = createRes();

    const next = jest.fn();
    await binController.updateFilthLevel(buildReq({ addedFilth: 5 }, { id: 'admin', role: 'admin' }), res, next);
    await flushPromises();

    if (next.mock.calls.length) {
      throw next.mock.calls[0][0];
    }

    expect(res.json).toHaveBeenCalledWith({ message: 'Filth level updated', bin });
  });
});

describe('binController.getMyBins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Bin.create.mockReset();
    Bin.findById.mockReset();
    Bin.find.mockReset();
  });

  test('returns formatted bins for current user', async() => {
    const bins = [
      { _id: '1', type: 'Plastic', filthLevel: 50, maxLevel: 100, createdAt: new Date(), updatedAt: new Date() },
      { _id: '2', type: 'Glass', filthLevel: 120, maxLevel: 150, createdAt: new Date(), updatedAt: new Date() }
    ];

    const lean = jest.fn().mockResolvedValue(bins);
    const sort = jest.fn().mockReturnValue({ lean });
    Bin.find.mockReturnValue({ sort });

    const req = { user: { id: 'user1' } };
    const res = createRes();

    await binController.getMyBins(req, res, jest.fn());
    await flushPromises();

    expect(Bin.find).toHaveBeenCalledWith({ owner: 'user1' });
    expect(res.json).toHaveBeenCalledWith({
      bins: expect.arrayContaining([
        expect.objectContaining({ id: '1', percent: 50, isFull: false }),
        expect.objectContaining({ id: '2', percent: 80, isFull: false })
      ])
    });
  });
});
