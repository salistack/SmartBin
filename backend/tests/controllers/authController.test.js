jest.mock('../../src/services/authService');

const authController = require('../../src/controllers/authController');
const authService = require('../../src/services/authService');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register returns success response', async() => {
    const req = { body: { email: 'user@example.com' } };
    const res = createResponse();
    const data = { token: 'abc', user: { email: 'user@example.com' } };

    authService.registerUser.mockResolvedValue({
      isValid: true,
      status: 201,
      data
    });

    await authController.register(req, res);

    expect(authService.registerUser).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(data);
  });

  test('register forwards service error response', async() => {
    const req = { body: { email: 'user@example.com' } };
    const res = createResponse();
    const error = { message: 'Email taken' };

    authService.registerUser.mockResolvedValue({
      isValid: false,
      status: 409,
      error
    });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(error);
  });

  test('login returns success response', async() => {
    const req = { body: { email: 'user@example.com', password: 'Password123' } };
    const res = createResponse();
    const data = { token: 'xyz', user: { email: 'user@example.com' } };

    authService.authenticateUser.mockResolvedValue({
      isValid: true,
      status: 200,
      data
    });

    await authController.login(req, res);

    expect(authService.authenticateUser).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(data);
  });

  test('login forwards service error response', async() => {
    const req = { body: { email: 'user@example.com', password: 'Password123' } };
    const res = createResponse();
    const error = { message: 'Invalid credentials' };

    authService.authenticateUser.mockResolvedValue({
      isValid: false,
      status: 401,
      error
    });

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(error);
  });
});
