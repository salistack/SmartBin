const { optimizeRoute } = require('../src/controllers/adminController');
const Bin = require('../src/models/Bin');
const { createMockRequest, createMockResponse } = require('./testUtils');

jest.mock('../src/models/Bin', () => {
  const schemaPath = jest.fn();
  return {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    schema: { path: schemaPath },
  };
});

const attachBinFindSelect = (value, asError = false) => {
  const select = asError ? jest.fn().mockRejectedValue(value) : jest.fn().mockResolvedValue(value);
  Bin.find.mockReturnValue({ select });
  return select;
};

describe('Route Optimization Component - optimizeRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return optimized route for multiple bins', async () => {
    // Arrange
    const mockBins = [
      { _id: 'bin-1', fillLevel: 90, status: 'overflow', capacity: 200, updatedAt: new Date('2025-01-01') },
      { _id: 'bin-2', fillLevel: 80, status: 'full', capacity: 200, updatedAt: new Date('2025-01-02') },
      { _id: 'bin-3', fillLevel: 40, status: 'available', capacity: 200 },
    ];
  attachBinFindSelect(mockBins);

    const req = createMockRequest({
      body: {
        area: 'Sector 7',
        schedule: { start: '09:00', end: '12:00' },
        truck: { id: 'TRK-007', capacity: 2 },
      },
      user: { role: 'admin' },
    });
    const res = createMockResponse();

    // Act
    await optimizeRoute(req, res);

    // Assert
    expect(Bin.find).toHaveBeenCalled();
    expect(res.body.summary.selectedBins).toBe(2);
    expect(res.body.route).toHaveLength(2);
    expect(res.body.warnings).toHaveLength(0);
    expect(res.body.delivery.status).toBe('dispatched');
  });

  test('should return 400 when required scheduling fields are missing', async () => {
    // Arrange
    const req = createMockRequest({
      body: { area: '', schedule: { start: '', end: '' } },
      user: { role: 'admin' },
    });
    const res = createMockResponse();

    // Act
    await optimizeRoute(req, res);

    // Assert
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Area and schedule (start/end) are required.' });
    expect(Bin.find).not.toHaveBeenCalled();
  });

  test('should handle single bin without unnecessary warnings', async () => {
    // Arrange
    attachBinFindSelect([
      { _id: 'solo-bin', fillLevel: 95, status: 'needs-collection', updatedAt: new Date('2025-01-03') },
    ]);
    const req = createMockRequest({
      body: {
        area: 'Alley 5',
        schedule: { start: '08:00', end: '10:00' },
        truck: { id: 'TRK-101', capacity: 5 },
      },
    });
    const res = createMockResponse();

    // Act
    await optimizeRoute(req, res);

    // Assert
    expect(res.body.summary.selectedBins).toBe(1);
    expect(res.body.route).toHaveLength(1);
    expect(res.body.estimated.distanceKm).toBeCloseTo(2.4);
    expect(res.body.warnings).toEqual([]);
  });

  test('should queue run when no bins qualify for optimization', async () => {
    // Arrange
    attachBinFindSelect([
      { _id: 'low-bin-one', fillLevel: 30, status: 'available' },
      { _id: 'low-bin-two', fillLevel: 10, status: 'empty' },
    ]);
    const req = createMockRequest({
      body: {
        area: 'Dormitory Wing',
        schedule: { start: '06:00', end: '09:00' },
        truck: { id: 'TRK-202' },
      },
    });
    const res = createMockResponse();

    // Act
    await optimizeRoute(req, res);

    // Assert
    expect(res.body.summary.selectedBins).toBe(0);
    expect(res.body.warnings).toEqual([
      'No bins in the selected area require collection.',
    ]);
    expect(res.body.delivery.status).toBe('pending-dispatch');
  });

  test('should return sample route when bin query fails', async () => {
    // Arrange
  attachBinFindSelect(new Error('map provider timeout'), true);
    const req = createMockRequest({
      body: {
        area: 'Downtown',
        schedule: { start: '07:00', end: '11:00' },
        truck: { id: 'TRK-404' },
      },
    });
    const res = createMockResponse();

    // Act
    await optimizeRoute(req, res);

    // Assert
    expect(res.body.route.length).toBeGreaterThan(0);
    expect(res.body.warnings).toEqual(expect.arrayContaining([
      'Bin query failed; using simulation data.',
    ]));
    expect(res.body.delivery.status).toBe('sample');
  });

  test('should return sample route when unexpected processing error occurs', async () => {
    // Arrange
    attachBinFindSelect(null);
    const req = createMockRequest({
      body: {
        area: 'Uptown',
        schedule: { start: '13:00', end: '15:00' },
        truck: { id: 'TRK-505' },
      },
    });
    const res = createMockResponse();

    // Act
    await optimizeRoute(req, res);

    // Assert
    expect(res.body.delivery.status).toBe('sample');
    expect(res.body.warnings.some((warning) => warning.includes('Cannot read'))).toBe(true);
  });
});
