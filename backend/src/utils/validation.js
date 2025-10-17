// Utility functions for input validation
const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  if (email.length === 0 || email.length > 320) return false;
  if (/\s/.test(email)) return false;
  if (email.includes('..')) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (localPart.length === 0 || localPart.length > 128) return false;
  if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(localPart)) return false;

  if (domainPart.length === 0 || domainPart.length > 190) return false;
  if (!/^[A-Za-z0-9.-]+$/.test(domainPart)) return false;
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
  if (!domainPart.includes('.')) return false;
  if (domainPart.split('.').some((label) => label.length === 0)) return false;

  return true;
};

const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  if (password.length < 6) return false;
  return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
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
