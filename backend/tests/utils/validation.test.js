const {
  validateEmail,
  validatePassword,
  validateCoordinates,
  sanitizeString,
  validatePositiveNumber,
  createErrorResponse
} = require('../../src/utils/validation');

describe('validation utils', () => {
  test('validateEmail returns true for standard email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('validateEmail rejects malformed email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('example@com')).toBe(false);
  });

  test('validatePassword requires length, letters, and numbers', () => {
    expect(validatePassword('abc123')).toBe(true);
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('123456')).toBe(false);
    expect(validatePassword('abcdef')).toBe(false);
  });

  test('validateCoordinates accepts valid numeric ranges', () => {
    expect(validateCoordinates(40.7128, -74.006)).toBe(true);
    expect(validateCoordinates(-90, 180)).toBe(true);
  });

  test('validateCoordinates rejects out of range or non-numeric', () => {
    expect(validateCoordinates(-91, 0)).toBe(false);
    expect(validateCoordinates(0, 181)).toBe(false);
    expect(validateCoordinates('0', 45)).toBe(false);
  });

  test('sanitizeString trims and limits length', () => {
    expect(sanitizeString('  hello ')).toBe('hello');
    expect(sanitizeString('a'.repeat(300), 10)).toBe('a'.repeat(10));
  });

  test('sanitizeString returns empty string for non-string input', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(123)).toBe('');
  });

  test('validatePositiveNumber enforces bounds', () => {
    expect(validatePositiveNumber(10)).toBe(true);
    expect(validatePositiveNumber(10, 20)).toBe(true);
    expect(validatePositiveNumber(-1)).toBe(false);
    expect(validatePositiveNumber(21, 20)).toBe(false);
    expect(validatePositiveNumber(NaN)).toBe(false);
  });

  test('createErrorResponse includes details when provided', () => {
    expect(createErrorResponse('message')).toEqual({ message: 'message' });
    expect(createErrorResponse('message', ['details'])).toEqual({ message: 'message', details: ['details'] });
  });
});
