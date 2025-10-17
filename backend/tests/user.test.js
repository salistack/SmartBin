const { sendCollectionRequest } = require('../src/controllers/collectionController');
const Bin = require('../src/models/Bin');
const CollectionRequest = require('../src/models/CollectionRequest');
const { createMockRequest, createMockResponse } = require('./testUtils');

jest.mock('../src/models/Bin', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/CollectionRequest', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

describe('User Component - sendCollectionRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 201 when collection request is successful', async () => {
    // Arrange
    const mockBin = {
      _id: 'bin-123',
      type: 'Plastic',
      filthLevel: 120,
      maxLevel: 100,
      owner: { address: { street: 'Main', city: 'Metro' } },
      populate: jest.fn(),
    };
    Bin.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockBin),
    });
    CollectionRequest.findOne.mockResolvedValue(null);
    CollectionRequest.create.mockResolvedValue({ _id: 'req-1' });

    const req = createMockRequest({ body: { binId: 'bin-123' }, user: { id: 'user-1' } });
    const res = createMockResponse();

    // Act
    await sendCollectionRequest(req, res);

    // Assert
    expect(Bin.findById).toHaveBeenCalledWith('bin-123');
    expect(CollectionRequest.findOne).toHaveBeenCalledWith({ bin: mockBin._id, status: 'PENDING' });
    expect(CollectionRequest.create).toHaveBeenCalledWith({
      bin: mockBin._id,
      binType: mockBin.type,
      address: mockBin.owner?.address,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual(expect.objectContaining({
      message: 'Collection request created',
      collectionRequest: { _id: 'req-1' },
    }));
  });

  test('should return 404 when bin is not found', async () => {
    // Arrange
    Bin.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const req = createMockRequest({ body: { binId: 'missing-bin' }, user: { id: 'user-1' } });
    const res = createMockResponse();

    // Act
    await sendCollectionRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: 'Bin not found' });
    expect(CollectionRequest.create).not.toHaveBeenCalled();
  });

  test('should allow request when filth level equals threshold', async () => {
    // Arrange
    const mockBin = {
      _id: 'bin-edge',
      type: 'Organic',
      filthLevel: 100,
      maxLevel: 100,
      owner: { address: { street: 'Edge', city: 'Limit' } },
    };
    Bin.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockBin),
    });
    CollectionRequest.findOne.mockResolvedValue(null);
    CollectionRequest.create.mockResolvedValue({ _id: 'req-edge' });

    const req = createMockRequest({ body: { binId: 'bin-edge' }, user: { id: 'user-2' } });
    const res = createMockResponse();

    // Act
    await sendCollectionRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual(expect.objectContaining({
      message: 'Collection request created',
    }));
  });

  test('should return 500 when database call fails', async () => {
    // Arrange
    Bin.findById.mockReturnValue({
      populate: jest.fn().mockRejectedValue(new Error('DB down')),
    });
    const req = createMockRequest({ body: { binId: 'bin-db-error' }, user: { id: 'user-3' } });
    const res = createMockResponse();

    // Act
    await sendCollectionRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'DB down' });
  });
});
