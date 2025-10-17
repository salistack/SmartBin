const {
  requireRequestBody,
  requireFields,
  requireJsonContentType,
  validateEnum,
  validateNumber,
  validateObjectId
} = require('../../src/middlewares/validationMiddleware');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('validationMiddleware', () => {
  test('requireRequestBody rejects empty body', () => {
    const res = createRes();
    requireRequestBody({ body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Request body missing. Ensure you send JSON and set Content-Type: application/json' });
  });

  test('requireRequestBody calls next when body provided', () => {
    const next = jest.fn();
    requireRequestBody({ body: { name: 'Alice' } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('requireFields validates presence', () => {
    const res = createRes();
    requireFields(['name', 'email'])({ body: { name: 'Alice' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields: email' });
  });

  test('requireFields passes when all fields present', () => {
    const next = jest.fn();
    requireFields(['name', 'email'])({ body: { name: 'Alice', email: 'a@b.com' } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('requireJsonContentType enforces header', () => {
    const res = createRes();
    requireJsonContentType({ method: 'POST', get: () => 'text/plain' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Content-Type must be application/json' });
  });

  test('requireJsonContentType skips non-mutating methods', () => {
    const next = jest.fn();
    requireJsonContentType({ method: 'GET', get: () => null }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('requireJsonContentType allows proper json header', () => {
    const next = jest.fn();
    requireJsonContentType({ method: 'PUT', get: () => 'application/json' }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('validateEnum rejects invalid values', () => {
    const res = createRes();
    validateEnum('role', ['admin', 'user'])({ body: { role: 'guest' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid role. Allowed values: admin, user' });
  });

  test('validateEnum rejects missing required field', () => {
    const res = createRes();
    validateEnum('role', ['admin', 'user'])({ body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'role is required' });
  });

  test('validateEnum accepts optional missing value', () => {
    const next = jest.fn();
    validateEnum('role', ['admin'], true)({ body: {} }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('validateEnum accepts allowed value', () => {
    const next = jest.fn();
    validateEnum('role', ['admin', 'user'])({ body: { role: 'admin' } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('validateNumber enforces numeric bounds', () => {
    const res = createRes();
    validateNumber('count', { min: 1, max: 5, integer: true })({ body: { count: 10 } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'count must be between 1 and 5' });
  });

  test('validateNumber rejects missing required field', () => {
    const res = createRes();
    validateNumber('count')({ body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'count is required' });
  });

  test('validateNumber rejects non-numeric values', () => {
    const res = createRes();
    validateNumber('count')({ body: { count: 'NaN' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'count must be a valid number' });
  });

  test('validateNumber enforces integer when requested', () => {
    const res = createRes();
    validateNumber('count', { integer: true })({ body: { count: 2.5 } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'count must be an integer' });
  });

  test('validateNumber accepts optional missing field', () => {
    const next = jest.fn();
    validateNumber('count', { optional: true })({ body: {} }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('validateNumber passes valid payload', () => {
    const next = jest.fn();
    validateNumber('count', { min: 1, max: 5 })({ body: { count: 3 } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('validateObjectId rejects invalid ids', () => {
    const res = createRes();
    validateObjectId('id')({ params: { id: '123' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id format' });
  });

  test('validateObjectId accepts valid ids', () => {
    const next = jest.fn();
    validateObjectId('id')({ params: { id: '507f1f77bcf86cd799439011' } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
