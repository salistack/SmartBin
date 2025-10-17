const {
  validateEmail,
  validatePassword,
  validateCoordinates,
  sanitizeString,
  validatePositiveNumber,
  createErrorResponse
} = require('../../src/utils/validation');

describe('Validation Utilities', () => {
  
  describe('validateEmail', () => {
    test('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user@domain.co.uk')).toBe(true);
      expect(validateEmail('name.surname@company.org')).toBe(true);
      expect(validateEmail('user123@example.net')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(validateEmail('a@b.co')).toBe(true);
      expect(validateEmail('test@localhost')).toBe(false); // Requires TLD
      const longEmail = 'a'.repeat(100) + '@example.com';
      expect(validateEmail(longEmail)).toBe(true);
    });
  });

  describe('validatePassword', () => {
    test('should validate strong passwords', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('myPass1')).toBe(true);
      expect(validatePassword('SecurePassword1')).toBe(true);
    });

    test('should reject weak passwords', () => {
      expect(validatePassword('123')).toBe(false); // Too short
      expect(validatePassword('password')).toBe(false); // No numbers
      expect(validatePassword('123456')).toBe(false); // No letters
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null)).toBe(false);
      expect(validatePassword(undefined)).toBe(false);
    });

    test('should enforce minimum length requirement', () => {
      expect(validatePassword('pass1')).toBe(false); // 5 chars
      expect(validatePassword('passs1')).toBe(true); // 6 chars
    });
  });

  describe('validateCoordinates', () => {
    test('should validate correct coordinates', () => {
      expect(validateCoordinates(0, 0)).toBe(true);
      expect(validateCoordinates(90, 180)).toBe(true);
      expect(validateCoordinates(-90, -180)).toBe(true);
      expect(validateCoordinates(45.5, -122.3)).toBe(true);
    });

    test('should reject invalid coordinates', () => {
      expect(validateCoordinates(91, 0)).toBe(false); // Lat too high
      expect(validateCoordinates(-91, 0)).toBe(false); // Lat too low
      expect(validateCoordinates(0, 181)).toBe(false); // Lng too high
      expect(validateCoordinates(0, -181)).toBe(false); // Lng too low
      expect(validateCoordinates('45', '90')).toBe(false); // String input
      expect(validateCoordinates(NaN, 0)).toBe(false);
      expect(validateCoordinates(0, Infinity)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('should trim and limit string length', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('test', 2)).toBe('te');
      expect(sanitizeString('normal')).toBe('normal');
    });

    test('should handle non-string inputs', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
    });

    test('should respect maxLength parameter', () => {
      const longString = 'a'.repeat(1000);
      expect(sanitizeString(longString, 10)).toBe('a'.repeat(10));
      expect(sanitizeString(longString, 255).length).toBe(255);
    });
  });

  describe('validatePositiveNumber', () => {
    test('should validate positive numbers', () => {
      expect(validatePositiveNumber(0)).toBe(true);
      expect(validatePositiveNumber(1)).toBe(true);
      expect(validatePositiveNumber(999.99)).toBe(true);
      expect(validatePositiveNumber(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    test('should reject invalid numbers', () => {
      expect(validatePositiveNumber(-1)).toBe(false);
      expect(validatePositiveNumber(NaN)).toBe(false);
      expect(validatePositiveNumber(Infinity)).toBe(false);
      expect(validatePositiveNumber('123')).toBe(false);
      expect(validatePositiveNumber(null)).toBe(false);
    });

    test('should respect max parameter', () => {
      expect(validatePositiveNumber(50, 100)).toBe(true);
      expect(validatePositiveNumber(150, 100)).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    test('should create basic error response', () => {
      const error = createErrorResponse('Test error');
      expect(error.message).toBe('Test error');
      expect(error.details).toBeUndefined();
    });

    test('should create error response with details', () => {
      const details = { field: 'email', code: 'INVALID_FORMAT' };
      const error = createErrorResponse('Validation failed', details);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
    });

    test('should handle null and undefined details', () => {
      const error1 = createErrorResponse('Test', null);
      const error2 = createErrorResponse('Test', undefined);
      expect(error1.details).toBeUndefined();
      expect(error2.details).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle extremely long inputs gracefully', () => {
      const veryLongString = 'a'.repeat(100000);
      expect(() => validateEmail(veryLongString)).not.toThrow();
      expect(() => sanitizeString(veryLongString)).not.toThrow();
    });

    test('should handle special characters in emails', () => {
      expect(validateEmail('test+tag@example.com')).toBe(true);
      expect(validateEmail('test.name@example.com')).toBe(true);
      expect(validateEmail('test-name@example.com')).toBe(true);
    });

    test('should handle boundary coordinate values', () => {
      expect(validateCoordinates(90, 180)).toBe(true);
      expect(validateCoordinates(-90, -180)).toBe(true);
      expect(validateCoordinates(89.999999, 179.999999)).toBe(true);
    });

    test('should handle zero and negative zero', () => {
      expect(validatePositiveNumber(0)).toBe(true);
      expect(validatePositiveNumber(-0)).toBe(true);
    });
  });
});