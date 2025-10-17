const {
  updateRequestStatus,
  getPendingRequests,
  getCollectedRequests,
  getUserRequests,
} = require('../src/controllers/collectionController');
const Bin = require('../src/models/Bin');
const CollectionRequest = require('../src/models/CollectionRequest');
const { createMockRequest, createMockResponse } = require('./testUtils');

jest.mock('../src/models/Bin', () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../src/models/CollectionRequest', () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

describe('Collector Component - updateRequestStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update status and reset bin when collection succeeds', async () => {
    // Arrange
    const mockRequest = {
      _id: 'req-1',
      bin: 'bin-1',
      status: 'PENDING',
      save: jest.fn(),
    };
    const mockBin = {
      _id: 'bin-1',
      filthLevel: 80,
      save: jest.fn(),
    };
    CollectionRequest.findById.mockResolvedValue(mockRequest);
    Bin.findById.mockResolvedValue(mockBin);

    const req = createMockRequest({
      params: { requestId: 'req-1' },
      body: { status: 'COLLECTED' },
      user: { id: 'collector-1' },
    });
    const res = createMockResponse();

    // Act
    await updateRequestStatus(req, res);

    // Assert
    expect(CollectionRequest.findById).toHaveBeenCalledWith('req-1');
    expect(mockRequest.save).toHaveBeenCalled();
    expect(mockRequest.status).toBe('COLLECTED');
    expect(mockBin.filthLevel).toBe(0);
    expect(mockBin.save).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ message: 'Request status updated' }));
  });

  test('should return 404 when request cannot be found', async () => {
    // Arrange
    CollectionRequest.findById.mockResolvedValue(null);
    const req = createMockRequest({ params: { requestId: 'missing' }, body: { status: 'COLLECTED' } });
    const res = createMockResponse();

    // Act
    await updateRequestStatus(req, res);

    // Assert
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Request not found' });
    expect(Bin.findById).not.toHaveBeenCalled();
  });

  test('should handle already collected requests gracefully', async () => {
    // Arrange
    const mockRequest = {
      _id: 'req-2',
      bin: 'bin-2',
      status: 'COLLECTED',
      save: jest.fn(),
    };
    const mockBin = {
      _id: 'bin-2',
      filthLevel: 0,
      save: jest.fn(),
    };
    CollectionRequest.findById.mockResolvedValue(mockRequest);
    Bin.findById.mockResolvedValue(mockBin);

    const req = createMockRequest({ params: { requestId: 'req-2' }, body: { status: 'COLLECTED' } });
    const res = createMockResponse();

    // Act
    await updateRequestStatus(req, res);

    // Assert
    expect(mockRequest.save).toHaveBeenCalled();
    expect(mockBin.save).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.request.status).toBe('COLLECTED');
  });

  test('should return 500 when saving fails', async () => {
    // Arrange
    const mockRequest = {
      _id: 'req-3',
      bin: 'bin-3',
      status: 'PENDING',
      save: jest.fn().mockRejectedValue(new Error('save failed')),
    };
    CollectionRequest.findById.mockResolvedValue(mockRequest);

    const req = createMockRequest({ params: { requestId: 'req-3' }, body: { status: 'COLLECTED' } });
    const res = createMockResponse();

    // Act
    await updateRequestStatus(req, res);

    // Assert
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'save failed' });
  });
});

describe('Collector Component - request listings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should list pending requests for collectors', async () => {
    // Arrange
    const list = [{ _id: 'req-10' }];
    CollectionRequest.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(list),
    });
    const req = createMockRequest({ user: { id: 'collector-9' } });
    const res = createMockResponse();

    // Act
    await getPendingRequests(req, res);

    // Assert
    expect(CollectionRequest.find).toHaveBeenCalledWith({ status: 'PENDING' });
    expect(res.body).toEqual({ requests: list });
  });

  test('should surface errors while listing pending requests', async () => {
    // Arrange
    CollectionRequest.find.mockReturnValue({
      populate: jest.fn().mockRejectedValue(new Error('list failed')),
    });
    const res = createMockResponse();

    // Act
    await getPendingRequests(createMockRequest(), res);

    // Assert
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'list failed' });
  });

  test('should list collected request history', async () => {
    // Arrange
    const history = [{ _id: 'req-11' }];
    CollectionRequest.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(history),
      }),
    });
    const res = createMockResponse();

    // Act
    await getCollectedRequests(createMockRequest(), res);

    // Assert
    expect(CollectionRequest.find).toHaveBeenCalledWith({ status: 'COLLECTED' });
    expect(res.body).toEqual({ requests: history });
  });

  test('should list requests belonging to the authenticated user', async () => {
    // Arrange
    Bin.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'bin-88' }, { _id: 'bin-99' }]),
    });
    CollectionRequest.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ _id: 'req-22', bin: 'bin-88' }]),
    });
    const req = createMockRequest({ user: { id: 'resident-7' } });
    const res = createMockResponse();

    // Act
    await getUserRequests(req, res);

    // Assert
    expect(Bin.find).toHaveBeenCalledWith({ owner: 'resident-7' });
    expect(CollectionRequest.find).toHaveBeenCalledWith({ bin: { $in: ['bin-88', 'bin-99'] } });
    expect(res.body.requests).toEqual([{ _id: 'req-22', bin: 'bin-88' }]);
  });
});
