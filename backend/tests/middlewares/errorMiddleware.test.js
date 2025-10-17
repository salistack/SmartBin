const {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError
} = require('../../src/middlewares/errorMiddleware');
const { HTTP_STATUS } = require('../../src/constants');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('error middleware', () => {
  test('handles mongoose validation errors', () => {
    const err = {
      name: 'ValidationError',
      errors: {
        email: { message: 'Invalid email' },
        password: { message: 'Password too short' }
      }
    };
    const res = mockResponse();
    globalErrorHandler(err, { url: '/', method: 'POST' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Validation failed',
      details: ['Invalid email', 'Password too short']
    });
  });

  test('handles cast errors', () => {
    const err = { name: 'CastError' };
    const res = mockResponse();
    globalErrorHandler(err, { url: '/', method: 'GET' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID format' });
  });

  test('handles duplicate key errors', () => {
    const err = { code: 11000, keyValue: { email: 'test@example.com' } };
    const res = mockResponse();
    globalErrorHandler(err, { url: '/', method: 'POST' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({ message: 'email already exists' });
  });

  test('handles jwt errors', () => {
    const res = mockResponse();
    globalErrorHandler({ name: 'JsonWebTokenError' }, { url: '/', method: 'GET' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });

    const resExpired = mockResponse();
    globalErrorHandler({ name: 'TokenExpiredError' }, { url: '/', method: 'GET' }, resExpired, jest.fn());
    expect(resExpired.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(resExpired.json).toHaveBeenCalledWith({ message: 'Token expired' });
  });

  test('defaults to internal server error', () => {
    const err = new AppError('Unexpected failure');
    const res = mockResponse();
    globalErrorHandler(err, { url: '/something', method: 'PUT' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  test('notFoundHandler returns descriptive message', () => {
    const res = mockResponse();
    notFoundHandler({ method: 'GET', path: '/missing' }, res);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ message: 'Route GET /missing not found' });
  });

  test('asyncHandler forwards errors to next', async() => {
    const error = new Error('boom');
    const handler = asyncHandler(async() => {
      throw error;
    });

    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
