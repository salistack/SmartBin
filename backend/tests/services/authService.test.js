const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const config = require('../../src/config');
const { HTTP_STATUS } = require('../../src/constants');
const { connect, disconnect, clearDatabase } = require('../helpers/mongo');

beforeAll(async() => {
  config.jwt.secret = 'test-secret';
  config.jwt.expiresIn = '1h';
  config.jwt.logTokens = false;
  config.bcrypt.saltRounds = 4;
  await connect();
});

afterEach(async() => {
  await clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async() => {
  await disconnect();
});

describe('AuthService.validateRegistrationData', () => {
  const basePayload = {
    name: 'Resident User',
    email: 'resident@example.com',
    password: 'Password123',
    role: 'resident',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      postalCode: '12345',
      lat: 40.5,
      lng: -73.9
    }
  };

  test('fails when required fields are missing', async() => {
    const result = await authService.validateRegistrationData({});
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(result.error).toEqual({ message: 'Name, email, password, and role are required' });
  });

  test('rejects names that are too short after sanitization', async() => {
    const result = await authService.validateRegistrationData({
      ...basePayload,
      name: ' A '
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toEqual({ message: 'Name must be between 2-100 characters' });
  });

  test('rejects invalid email format', async() => {
    const result = await authService.validateRegistrationData({
      ...basePayload,
      email: 'not-an-email'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toEqual({ message: 'Please enter a valid email address' });
  });

  test('rejects weak passwords', async() => {
    const result = await authService.validateRegistrationData({
      ...basePayload,
      password: 'abcdef'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toEqual({ message: 'Password must be at least 6 characters and contain both letters and numbers' });
  });

  test('rejects roles outside public registration list', async() => {
    const result = await authService.validateRegistrationData({
      ...basePayload,
      role: 'admin'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toEqual({ message: 'Invalid role. Only resident and collector accounts can be created through public registration.' });
  });

  test('rejects duplicate email addresses regardless of case', async() => {
    await User.create({
      name: 'Existing User',
      email: 'resident@example.com',
      password: 'Password123',
      role: 'resident'
    });

    const result = await authService.validateRegistrationData(basePayload);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.CONFLICT);
    expect(result.error).toEqual({ message: 'Email already in use' });
  });

  test('rejects invalid coordinates when provided', async() => {
    const result = await authService.validateRegistrationData({
      ...basePayload,
      address: {
        ...basePayload.address,
        lat: 120,
        lng: 0
      }
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toEqual({ message: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180' });
  });

  test('returns sanitized payload when valid', async() => {
    const payload = {
      ...basePayload,
      name: '  Resident User  ',
      email: 'Resident@Example.com'
    };
    const result = await authService.validateRegistrationData(payload);

    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({
      name: 'Resident User',
      email: 'resident@example.com',
      password: 'Password123',
      role: 'resident',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        postalCode: '12345',
        lat: 40.5,
        lng: -73.9
      }
    });
  });
});

describe('AuthService.registerUser', () => {
  const newUserPayload = {
    name: 'Collector User',
    email: 'collector@example.com',
    password: 'Password123',
    role: 'collector'
  };

  test('creates user and returns token on success', async() => {
    const result = await authService.registerUser(newUserPayload);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(HTTP_STATUS.CREATED);
    expect(result.data.user.email).toBe('collector@example.com');
    expect(typeof result.data.token).toBe('string');

    const savedUser = await User.findOne({ email: 'collector@example.com' }).lean();
    expect(savedUser).toBeTruthy();
    expect(savedUser.password).not.toBe(newUserPayload.password);
  });

  test('returns conflict when email already exists', async() => {
    await User.create({ ...newUserPayload });
    const result = await authService.registerUser(newUserPayload);

    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.CONFLICT);
    expect(result.error).toEqual({ message: 'Email already in use' });
  });

  test('returns server error when database operation fails', async() => {
    const spy = jest.spyOn(User, 'create').mockRejectedValue(new Error('Database offline'));
    const result = await authService.registerUser(newUserPayload);

    expect(spy).toHaveBeenCalled();
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(result.error).toEqual({ message: 'Server error' });
  });
});

describe('AuthService.authenticateUser', () => {
  const credentials = {
    email: 'resident@example.com',
    password: 'Password123'
  };

  beforeEach(async() => {
    await authService.registerUser({
      name: 'Resident User',
      email: credentials.email,
      password: credentials.password,
      role: 'resident'
    });
  });

  test('requires email and password', async() => {
    const result = await authService.authenticateUser({});
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(result.error).toEqual({ message: 'Email and password are required' });
  });

  test('rejects invalid email format', async() => {
    const result = await authService.authenticateUser({ email: 'invalid', password: 'Password123' });
    expect(result.isValid).toBe(false);
    expect(result.error).toEqual({ message: 'Please enter a valid email address' });
  });

  test('rejects unknown users', async() => {
    const result = await authService.authenticateUser({ email: 'missing@example.com', password: 'Password123' });
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(result.error).toEqual({ message: 'Invalid credentials' });
  });

  test('rejects mismatched passwords', async() => {
    const result = await authService.authenticateUser({ email: credentials.email, password: 'WrongPass1' });
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(result.error).toEqual({ message: 'Invalid credentials' });
  });

  test('authenticates and returns token for valid credentials', async() => {
    const result = await authService.authenticateUser(credentials);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(HTTP_STATUS.OK);
    expect(result.data.user.email).toBe(credentials.email);
    expect(typeof result.data.token).toBe('string');
  });

  test('returns server error when lookup fails unexpectedly', async() => {
    const findSpy = jest.spyOn(User, 'findOne').mockRejectedValue(new Error('lookup failed'));
    const result = await authService.authenticateUser(credentials);

    expect(findSpy).toHaveBeenCalled();
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(result.error).toEqual({ message: 'Server error' });
  });
});
