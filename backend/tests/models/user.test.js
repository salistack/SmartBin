const mongoose = require('mongoose');
const User = require('../../src/models/User');
const { connect, disconnect, clearDatabase } = require('../helpers/mongo');

beforeAll(async() => {
  await connect();
});

afterEach(async() => {
  await clearDatabase();
});

afterAll(async() => {
  await disconnect();
});

describe('User model', () => {
  test('hashes password before save and supports comparePassword', async() => {
    const user = await User.create({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password123',
      role: 'resident'
    });

    expect(user.password).not.toBe('Password123');
    const matches = await user.comparePassword('Password123');
    expect(matches).toBe(true);
  });

  test('toJSON omits password', async() => {
    const user = await User.create({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'Password123',
      role: 'collector'
    });

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.email).toBe('bob@example.com');
  });

  test('does not rehash password when unchanged', async() => {
    const user = await User.create({
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'Password123',
      role: 'resident'
    });

    const originalHash = user.password;
    user.name = 'Charles';
    await user.save();
    expect(user.password).toBe(originalHash);
  });

  test('validates email format', async() => {
    await expect(User.create({
      name: 'Invalid',
      email: 'not-an-email',
      password: 'Password123',
      role: 'resident'
    })).rejects.toThrow(mongoose.Error.ValidationError);
  });
});
