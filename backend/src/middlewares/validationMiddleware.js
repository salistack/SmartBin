// Middleware for request validation - reduces repetitive validation code
const { createErrorResponse } = require('../utils/validation');
const { HTTP_STATUS } = require('../constants');

/**
 * Middleware to validate required request body
 */
const requireRequestBody = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Request body missing. Ensure you send JSON and set Content-Type: application/json')
    );
  }
  next();
};

/**
 * Middleware factory to validate required fields in request body
 * @param {string[]} requiredFields - Array of required field names
 */
const requireFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`Missing required fields: ${missingFields.join(', ')}`)
      );
    }

    next();
  };
};

/**
 * Middleware to validate Content-Type header for JSON requests
 */
const requireJsonContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Content-Type must be application/json')
      );
    }
  }
  next();
};

/**
 * Middleware factory to validate enum values
 * @param {string} fieldName - Name of the field to validate
 * @param {string[]} allowedValues - Array of allowed values
 * @param {boolean} optional - Whether the field is optional
 */
const validateEnum = (fieldName, allowedValues, optional = false) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (!value && optional) {
      return next();
    }

    if (!value) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`${fieldName} is required`)
      );
    }

    if (!allowedValues.includes(value)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`Invalid ${fieldName}. Allowed values: ${allowedValues.join(', ')}`)
      );
    }

    next();
  };
};

/**
 * Middleware factory to validate numeric fields
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 */
const validateNumber = (fieldName, options = {}) => {
  const { min = -Infinity, max = Infinity, optional = false, integer = false } = options;

  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value === undefined && optional) {
      return next();
    }

    if (value === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`${fieldName} is required`)
      );
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`${fieldName} must be a valid number`)
      );
    }

    if (integer && !Number.isInteger(value)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`${fieldName} must be an integer`)
      );
    }

    if (value < min || value > max) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`${fieldName} must be between ${min} and ${max}`)
      );
    }

    next();
  };
};

/**
 * Middleware to validate MongoDB ObjectId format
 * @param {string} paramName - Name of the route parameter
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!objectIdRegex.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`Invalid ${paramName} format`)
      );
    }

    next();
  };
};

module.exports = {
  requireRequestBody,
  requireFields,
  requireJsonContentType,
  validateEnum,
  validateNumber,
  validateObjectId
};
