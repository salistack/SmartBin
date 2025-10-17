const jwt = require('jsonwebtoken');

const buildFindById = (result, { reject = false } = {}) => {
  const select = reject
    ? jest.fn().mockRejectedValue(result)
    : jest.fn().mockResolvedValue(result);
  return jest.fn().mockReturnValue({ select });
};

const mockUserModel = () => ({
  findById: buildFindById(null)
});

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware', () => {
  const loadMiddleware = (userModel = mockUserModel()) => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    jest.doMock('../../src/models/User', () => userModel);
    // eslint-disable-next-line global-require
    const middleware = require('../../src/middlewares/authMiddleware');
    return { middleware, userModel };
  };

  test('rejects missing authorization header', async() => {
  const { middleware } = loadMiddleware();
    const res = createRes();

    await middleware({ headers: {} }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing or invalid Authorization header' });
  });

  test('rejects invalid tokens', async() => {
    const { middleware } = loadMiddleware();
    const res = createRes();
    const req = { headers: { authorization: 'Bearer invalid.token' } };

    await middleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
  });

  test('returns 401 when user not found', async() => {
    const userModel = {
      findById: buildFindById(null)
    };
    const { middleware } = loadMiddleware(userModel);

    const token = jwt.sign({ id: 'user1' }, 'test-secret');
    const res = createRes();

    await middleware({ headers: { authorization: `Bearer ${token}` } }, res, jest.fn());

    expect(userModel.findById).toHaveBeenCalledWith('user1');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  test('attaches user and calls next when valid', async() => {
    const user = { _id: 'user1', name: 'Alice', email: 'alice@example.com', role: 'resident' };
    const userModel = {
      findById: buildFindById(user)
    };
    const { middleware } = loadMiddleware(userModel);

    const token = jwt.sign({ id: 'user1' }, 'test-secret');
    const res = createRes();
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user1', name: 'Alice', email: 'alice@example.com', role: 'resident' });
  });

  test('handles unexpected errors', async() => {
    const userModel = {
      findById: buildFindById(new Error('db error'), { reject: true })
    };
    const { middleware } = loadMiddleware(userModel);

    const token = jwt.sign({ id: 'user1' }, 'test-secret');
    const res = createRes();

    await middleware({ headers: { authorization: `Bearer ${token}` } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
  });
});
