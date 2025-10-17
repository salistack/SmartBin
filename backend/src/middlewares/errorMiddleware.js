// Centralized error handling middleware
const { createErrorResponse } = require('../utils/validation');
const { HTTP_STATUS } = require('../constants');

/**
 * Global error handler middleware
 * Should be placed after all routes
 */
const globalErrorHandler = (err, req, res, _next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Validation failed', errors)
    );
  }

  if (err.name === 'CastError') {
    // Invalid ObjectId or similar
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Invalid ID format')
    );
  }

  if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyValue)[0];
    return res.status(HTTP_STATUS.CONFLICT).json(
      createErrorResponse(`${field} already exists`)
    );
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createErrorResponse('Invalid token')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createErrorResponse('Token expired')
    );
  }

  // Default server error
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
    createErrorResponse('Internal server error')
  );
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(
    createErrorResponse(`Route ${req.method} ${req.path} not found`)
  );
};

/**
 * Async error wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error factory for creating consistent application errors
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError
};
