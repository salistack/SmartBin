const {
  getDashboard,
  getUsers,
  getBins,
  getCollections,
  getUsersReport,
  getBinsReport,
  getCollectionsReport,
  getOverviewReport,
} = require('../src/controllers/adminController');
const adminRoutes = require('../src/routes/adminRoutes');
const User = require('../src/models/User');
const Bin = require('../src/models/Bin');
const Collection = require('../src/models/Collection');
const { createMockRequest, createMockResponse } = require('./testUtils');

jest.mock('../src/models/User', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../src/models/Bin', () => {
  const schemaPath = jest.fn((field) => (field === 'status' ? {} : null));
  return {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
    schema: { path: schemaPath },
  };
});

jest.mock('../src/models/Collection', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
}), { virtual: true });

describe('Admin Panel Component', () => {
  const locateRequireAdmin = () => {
    const layer = adminRoutes.stack.find((entry) => entry.route && entry.route.path === '/dashboard');
    return layer.route.stack[1].handle; // index 0 -> auth, 1 -> requireAdmin
  };

  const mockUserFindChain = (result) => {
    const chain = {
      sort: jest.fn(),
      limit: jest.fn(),
      select: jest.fn().mockResolvedValue(result),
    };
    chain.sort.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    User.find.mockReturnValue(chain);
    return chain;
  };

  const mockBinFindChain = (result) => {
    Bin.find.mockReturnValue({ select: jest.fn().mockResolvedValue(result) });
  };

  const mockCollectionFindChain = (result) => {
    Collection.find.mockReturnValue({ select: jest.fn().mockResolvedValue(result) });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should build dashboard metrics for admins', async () => {
    // Arrange
    User.countDocuments.mockResolvedValue(42);
    User.aggregate.mockResolvedValueOnce([
      { _id: 'resident', count: 30 },
      { _id: 'collector', count: 10 },
      { _id: 'admin', count: 2 },
    ]);
    User.aggregate.mockResolvedValueOnce([
      { _id: { day: '2025-10-10', role: 'resident' }, count: 3 },
      { _id: { day: '2025-10-11', role: 'collector' }, count: 1 },
    ]);
    mockUserFindChain([
      { name: 'Alice', email: 'alice@test.com', role: 'resident', createdAt: new Date() },
    ]);
    Bin.countDocuments.mockResolvedValue(12);
    Bin.aggregate.mockResolvedValue([
      { _id: 'ready', count: 7 },
      { _id: 'waiting', count: 5 },
    ]);
    Collection.countDocuments.mockResolvedValue(9);
    Collection.aggregate.mockResolvedValue([
      { _id: 'PENDING', count: 4 },
      { _id: 'COLLECTED', count: 5 },
    ]);

    const req = createMockRequest({ user: { id: 'admin-1', role: 'admin' } });
    const res = createMockResponse();

    // Act
    await getDashboard(req, res);

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.body.metrics.users.total).toBe(42);
    expect(res.body.metrics.bins.total).toBe(12);
    expect(res.body.metrics.collections.total).toBe(9);
    expect(res.body.charts.roleDistribution.series).toEqual([30, 10, 2]);
    expect(res.body.recentUsers).toHaveLength(1);
  });

  test('should block non-admin access to dashboard route', async () => {
    // Arrange
    const requireAdmin = locateRequireAdmin();
    const req = createMockRequest({ user: { id: 'user-5', role: 'resident' } });
    const res = createMockResponse();
    const next = jest.fn();

    // Act
    await requireAdmin(req, res, next);

    // Assert
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ message: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle empty datasets gracefully', async () => {
    // Arrange
    User.countDocuments.mockResolvedValue(0);
    User.aggregate.mockResolvedValueOnce([]);
    User.aggregate.mockResolvedValueOnce([]);
    mockUserFindChain([]);
    Bin.countDocuments.mockResolvedValue(0);
    Bin.aggregate.mockResolvedValue([]);
    Collection.countDocuments.mockResolvedValue(0);
    Collection.aggregate.mockResolvedValue([]);

    const req = createMockRequest({ user: { id: 'admin-2', role: 'admin' } });
    const res = createMockResponse();

    // Act
    await getDashboard(req, res);

    // Assert
    expect(res.body.metrics.users.total).toBe(0);
    expect(res.body.metrics.bins.total).toBe(0);
    expect(res.body.metrics.collections.total).toBe(0);
    expect(res.body.charts.roleDistribution.series).toEqual([0, 0, 0]);
    expect(res.body.recentUsers).toEqual([]);
  });

  test('should propagate database errors when loading dashboard', async () => {
    // Arrange
    User.countDocuments.mockRejectedValue(new Error('aggregation failed'));
    const req = createMockRequest({ user: { id: 'admin-3', role: 'admin' } });
    const res = createMockResponse();

    // Act
    await getDashboard(req, res);

    // Assert
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Failed to load admin dashboard data' });
  });

  test('should list users, bins, and collections', async () => {
    // Arrange
    mockUserFindChain([{ name: 'Collector Carl', role: 'collector' }]);
    mockBinFindChain([{ _id: 'bin-77', status: 'ready' }]);
    mockCollectionFindChain([{ _id: 'col-55', status: 'PENDING' }]);

    const usersRes = createMockResponse();
    const binsRes = createMockResponse();
    const collectionsRes = createMockResponse();

    // Act
    await getUsers(createMockRequest({ user: { role: 'admin' } }), usersRes);
    await getBins(createMockRequest({ user: { role: 'admin' } }), binsRes);
    await getCollections(createMockRequest({ user: { role: 'admin' } }), collectionsRes);

    // Assert
    expect(usersRes.body).toEqual([{ name: 'Collector Carl', role: 'collector' }]);
    expect(binsRes.body).toEqual([{ _id: 'bin-77', status: 'ready' }]);
    expect(collectionsRes.body).toEqual([{ _id: 'col-55', status: 'PENDING' }]);
  });

  test('should generate users, bins, and collections reports', async () => {
    // Arrange
    mockUserFindChain([{ name: 'Resident Rita' }]);
    mockBinFindChain([{ _id: 'bin-12', status: 'ready' }]);
    mockCollectionFindChain([{ _id: 'col-12', status: 'COLLECTED' }]);

    const usersReportRes = createMockResponse();
    const binsReportRes = createMockResponse();
    const collectionsReportRes = createMockResponse();

    // Act
    await getUsersReport(createMockRequest(), usersReportRes);
    await getBinsReport(createMockRequest(), binsReportRes);
    await getCollectionsReport(createMockRequest(), collectionsReportRes);

    // Assert
    expect(usersReportRes.body).toEqual([{ name: 'Resident Rita' }]);
    expect(binsReportRes.body).toEqual([{ _id: 'bin-12', status: 'ready' }]);
    expect(collectionsReportRes.body).toEqual([{ _id: 'col-12', status: 'COLLECTED' }]);
  });

  test('should summarise overview report totals', async () => {
    // Arrange
    User.countDocuments.mockResolvedValue(5);
    Bin.countDocuments.mockResolvedValue(3);
    Collection.countDocuments.mockResolvedValue(7);
    const res = createMockResponse();

    // Act
    await getOverviewReport(createMockRequest(), res);

    // Assert
    expect(res.body).toEqual({ totalUsers: 5, totalBins: 3, totalCollections: 7 });
  });
});
