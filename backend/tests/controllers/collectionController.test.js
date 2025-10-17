jest.mock('../../src/models/Bin', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../src/models/CollectionRequest', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn()
}));

const collectionController = require('../../src/controllers/collectionController');
const Bin = require('../../src/models/Bin');
const CollectionRequest = require('../../src/models/CollectionRequest');
const { HTTP_STATUS } = require('../../src/constants');

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

const buildRequest = (overrides = {}) => ({
  body: {
    binId: 'bin1',
    ...(overrides.body || {})
  },
  user: {
    id: 'user1',
    role: 'resident',
    ...(overrides.user || {})
  }
});

const resetMocks = () => {
  jest.clearAllMocks();
  CollectionRequest.findOne.mockReset();
  CollectionRequest.create.mockReset();
  CollectionRequest.findById.mockReset();
  CollectionRequest.find.mockReset();
  Bin.find.mockReset();
  Bin.findById.mockReset();
  CollectionRequest.findOne.mockResolvedValue(null);
};

beforeEach(resetMocks);

describe('collectionController.sendCollectionRequest', () => {

  const buildBin = (overrides = {}) => ({
    _id: 'bin1',
    maxLevel: 100,
    filthLevel: 100,
    type: 'Plastic',
    owner: { _id: 'user1', address: { city: 'City' } },
    ...overrides
  });

  const mockPopulate = (value) => {
    Bin.findById.mockImplementation(() => ({ populate: jest.fn().mockResolvedValue(value) }));
  };

  test('returns 404 when bin not found', async() => {
    mockPopulate(null);
    const res = createRes();

    await collectionController.sendCollectionRequest(buildRequest(), res, jest.fn());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bin not found' });
  });

  test('prevents residents requesting for other bins', async() => {
    mockPopulate(buildBin({ owner: { _id: 'other-user' } }));
    const res = createRes();

    await collectionController.sendCollectionRequest(buildRequest(), res, jest.fn());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ message: 'You can only request collection for your own bins' });
  });

  test('rejects when bin not full', async() => {
    mockPopulate(buildBin({ filthLevel: 50 }));
    const res = createRes();

    await collectionController.sendCollectionRequest(buildRequest(), res, jest.fn());
    await flushPromises();

  expect(Bin.findById).toHaveBeenCalledWith('bin1');
  expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
  expect(res.payload).toEqual({ message: 'Bin is not full yet' });
  });

  test('rejects when request already pending', async() => {
    mockPopulate(buildBin());
    CollectionRequest.findOne.mockResolvedValue({ _id: 'existing' });
    const res = createRes();

    const next = jest.fn();
    await collectionController.sendCollectionRequest(buildRequest(), res, next);
    await flushPromises();

    if (next.mock.calls.length) {
      throw next.mock.calls[0][0];
    }

  expect(Bin.findById).toHaveBeenCalledWith('bin1');
  expect(CollectionRequest.findOne).toHaveBeenCalledTimes(1);
    const findResult = CollectionRequest.findOne.mock.results[0]?.value;
    await expect(findResult).resolves.toEqual({ _id: 'existing' });
  expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
  expect(res.payload).toEqual({ message: 'Collection request already pending' });
  expect(CollectionRequest.findOne).toHaveBeenCalledWith({ bin: 'bin1', status: 'PENDING' });
  });

  test('creates collection request for full bin', async() => {
    const bin = buildBin();
    mockPopulate(bin);
    CollectionRequest.findOne.mockResolvedValue(null);
    const created = { id: 'req1' };
    CollectionRequest.create.mockResolvedValue(created);
    const res = createRes();

    const next = jest.fn();
    await collectionController.sendCollectionRequest(buildRequest(), res, next);
    await flushPromises();

    if (next.mock.calls.length) {
      throw next.mock.calls[0][0];
    }

    expect(Bin.findById).toHaveBeenCalledWith('bin1');
    expect(CollectionRequest.create).toHaveBeenCalledWith({
      bin: bin._id,
      binType: bin.type,
      address: bin.owner.address
    });
    expect(res.statusCode).toBe(HTTP_STATUS.CREATED);
    expect(res.payload).toEqual({ message: 'Collection request created', collectionRequest: created });
  });
});

describe('collectionController.updateRequestStatus', () => {
  const reqBase = {
    params: { requestId: 'req1' },
    body: { status: 'COLLECTED' }
  };

  test('rejects invalid status', async() => {
    const res = createRes();
    await collectionController.updateRequestStatus({ ...reqBase, body: { status: 'INVALID' } }, res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid status. Allowed values: PENDING, COLLECTED' });
  });

  test('returns 404 when request missing', async() => {
    CollectionRequest.findById.mockResolvedValue(null);
    const res = createRes();
    await collectionController.updateRequestStatus(reqBase, res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ message: 'Request not found' });
  });

  test('updates request and resets bin when collected', async() => {
    const request = {
      _id: 'req1',
      bin: 'bin1',
      status: 'PENDING',
      save: jest.fn().mockResolvedValue(null)
    };
    CollectionRequest.findById.mockResolvedValue(request);
    const bin = { filthLevel: 50, save: jest.fn().mockResolvedValue(null) };
    Bin.findById.mockResolvedValue(bin);
    const res = createRes();

    const next = jest.fn();
    await collectionController.updateRequestStatus(reqBase, res, next);
    await flushPromises();

    if (next.mock.calls.length) {
      throw next.mock.calls[0][0];
    }

  expect(request.save).toHaveBeenCalled();
  expect(bin.filthLevel).toBe(0);
  expect(res.payload).toEqual({ message: 'Request status updated', request });
  expect(Bin.findById).toHaveBeenCalledWith('bin1');
  });
});

describe('collectionController listing endpoints', () => {
  test('getPendingRequests returns populated requests', async() => {
    const pending = [{ id: 1 }];
    CollectionRequest.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(pending)
    });
    const res = createRes();

    await collectionController.getPendingRequests({}, res, jest.fn());
    await flushPromises();

    expect(CollectionRequest.find).toHaveBeenCalledWith({ status: 'PENDING' });
    expect(res.json).toHaveBeenCalledWith({ requests: pending });
  });

  test('getCollectedRequests returns sorted requests', async() => {
    const collected = [{ id: 2 }];
    const populateInner = jest.fn().mockResolvedValue(collected);
    const populateOuter = jest.fn().mockReturnValue({ populate: populateInner });
    CollectionRequest.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(collected)
      })
    });
    const res = createRes();

    await collectionController.getCollectedRequests({}, res, jest.fn());
    await flushPromises();

    expect(CollectionRequest.find).toHaveBeenCalledWith({ status: 'COLLECTED' });
    expect(res.json).toHaveBeenCalledWith({ requests: collected });
  });

  test('getUserRequests fetches requests for user bins', async() => {
    const select = jest.fn().mockResolvedValue([{ _id: 'bin1' }, { _id: 'bin2' }]);
    Bin.find.mockReturnValue({ select });
    CollectionRequest.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
    });
    const res = createRes();

    await collectionController.getUserRequests({ user: { id: 'user1' } }, res, jest.fn());
    await flushPromises();

    expect(select).toHaveBeenCalledWith('_id');
  expect(Bin.find).toHaveBeenCalledWith({ owner: 'user1' });
  expect(CollectionRequest.find).toHaveBeenCalledWith({ bin: { $in: ['bin1', 'bin2'] } });
  expect(res.payload).toEqual({ requests: [{ id: 1 }, { id: 2 }] });
  });
});
