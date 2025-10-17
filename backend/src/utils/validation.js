// Utility functions for input validation
const validateEmail = (email) => {
  const re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  // At least 6 characters, contains letter and number
  return password && password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
};

const validateCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
};

const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};

const validatePositiveNumber = (num, max = Number.MAX_SAFE_INTEGER) => {
  return typeof num === 'number' && Number.isFinite(num) && num >= 0 && num <= max;
};

// Standard error response format
const createErrorResponse = (message, details = null) => {
  const response = { message };
  if (details) response.details = details;
  return response;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateCoordinates,
  sanitizeString,
  validatePositiveNumber,
  createErrorResponse
};
