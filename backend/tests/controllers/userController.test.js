jest.mock('../../src/models/User', () => ({
  findById: jest.fn()
}));

const userController = require('../../src/controllers/userController');
const User = require('../../src/models/User');
const { HTTP_STATUS, VALIDATION_LIMITS } = require('../../src/constants');

const createRes = () => {
  const res = {
    statusCode: null,
    payload: null
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.payload = data;
    return res;
  });
  return res;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const buildReq = (overrides = {}) => ({
  user: {
    id: 'user1',
    role: 'resident',
    ...(overrides.user || {})
  },
  body: {
    ...(overrides.body || {})
  }
});

describe('userController.updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReset();
  });

  test('returns 404 when user not found', async() => {
    User.findById.mockResolvedValue(null);
    const res = createRes();

    await userController.updateProfile(buildReq(), res, jest.fn());
    await flushPromises();

    expect(res.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    expect(res.payload).toEqual({ message: 'User not found' });
  });

  test('rejects non-resident roles', async() => {
    const userDoc = { role: 'admin' };
    User.findById.mockResolvedValue(userDoc);
    const res = createRes();

    await userController.updateProfile(buildReq({ user: { role: 'admin' } }), res, jest.fn());
    await flushPromises();

    expect(res.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
    expect(res.payload).toEqual({ message: 'Only residents can update these details' });
  });

  test('validates name length after sanitization', async() => {
    const userDoc = {
      _id: 'user1',
      role: 'resident',
      name: 'Existing',
      save: jest.fn(),
      markModified: jest.fn()
    };
    User.findById.mockResolvedValue(userDoc);
    const res = createRes();

    await userController.updateProfile(buildReq({ body: { name: ' A ' } }), res, jest.fn());
    await flushPromises();

    expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.payload).toEqual({
      message: `Name must be between ${VALIDATION_LIMITS.NAME_MIN_LENGTH}-${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`
    });
    expect(userDoc.save).not.toHaveBeenCalled();
  });

  test('rejects invalid coordinates and does not persist changes', async() => {
    const userDoc = {
      _id: 'user1',
      role: 'resident',
      name: 'Resident',
      address: {},
      save: jest.fn(),
      markModified: jest.fn()
    };
    User.findById.mockResolvedValue(userDoc);
    const res = createRes();

    await userController.updateProfile(
      buildReq({ body: { address: { lat: 120, lng: -10 } } }),
      res,
      jest.fn()
    );
    await flushPromises();

    expect(res.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.payload).toEqual({
      message: `Invalid coordinates. Latitude must be between ${VALIDATION_LIMITS.COORDINATE_LAT_MIN} and ${VALIDATION_LIMITS.COORDINATE_LAT_MAX}, longitude between ${VALIDATION_LIMITS.COORDINATE_LNG_MIN} and ${VALIDATION_LIMITS.COORDINATE_LNG_MAX}`
    });
    expect(userDoc.save).not.toHaveBeenCalled();
  });

  test('updates name, trims fields, and removes coordinates when nullish', async() => {
    const originalAddress = {
      street: 'Old Street',
      city: 'Old City',
      lat: 10,
      lng: 20
    };
    const userDoc = {
      _id: 'user1',
      role: 'resident',
      name: 'Old Name',
      email: 'user@example.com',
      address: {
        ...originalAddress,
        toObject: jest.fn(() => ({ ...originalAddress }))
      },
      save: jest.fn().mockResolvedValue(null),
      markModified: jest.fn()
    };
    User.findById.mockResolvedValue(userDoc);
    const res = createRes();

    const next = jest.fn();
    await userController.updateProfile(
      buildReq({
        body: {
          name: '  New Name  ',
          address: {
            street: '  New Street  ',
            city: '  New City  ',
            postalCode: ' 12345 ',
            lat: null,
            lng: ''
          }
        }
      }),
      res,
      next
    );
    await flushPromises();

    if (next.mock.calls.length) {
      throw next.mock.calls[0][0];
    }

    expect(userDoc.name).toBe('New Name');
    expect(userDoc.address).toEqual({
      street: 'New Street',
      city: 'New City',
      postalCode: '12345'
    });
    expect(userDoc.markModified).toHaveBeenCalledWith('address');
    expect(userDoc.save).toHaveBeenCalled();
    expect(res.payload).toEqual({
      user: {
        id: 'user1',
        name: 'New Name',
        email: 'user@example.com',
        role: 'resident',
        address: {
          street: 'New Street',
          city: 'New City',
          postalCode: '12345'
        }
      }
    });
  });
});
