const {
  requireRole,
  requireAdmin,
  requireCollector,
  requireResident
} = require('../../src/middlewares/roleMiddleware');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('roleMiddleware', () => {
  test('requireRole denies missing user', () => {
    const res = createRes();
    requireRole('admin')({}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });

  test('requireRole denies unauthorized user', () => {
    const res = createRes();
    requireRole(['admin', 'collector'])({ user: { role: 'resident' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Access denied. Required roles: admin, collector' });
  });

  test('requireRole allows authorized user', () => {
    const next = jest.fn();
    requireRole('admin')({ user: { role: 'admin' } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('requireAdmin wrapper enforces admin role', () => {
    const res = createRes();
    requireAdmin()({ user: { role: 'resident' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('requireCollector accepts collector or admin', () => {
    const next = jest.fn();
    requireCollector()({ user: { role: 'collector' } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('requireResident only allows residents', () => {
    const res = createRes();
    requireResident()({ user: { role: 'collector' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
