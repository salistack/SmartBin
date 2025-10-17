const mongoose = require('mongoose');
const CollectionRequest = require('../../src/models/CollectionRequest');
const Bin = require('../../src/models/Bin');
const { connect, disconnect, clearDatabase } = require('../helpers/mongo');

afterAll(async() => {
  await disconnect();
});

beforeAll(async() => {
  await connect();
});

afterEach(async() => {
  await clearDatabase();
});

describe('CollectionRequest model', () => {
  test('stores bin reference and defaults status to PENDING', async() => {
    const bin = await Bin.create({
      type: 'Glass',
      owner: new mongoose.Types.ObjectId(),
      filthLevel: 110
    });

    const request = await CollectionRequest.create({
      bin: bin._id,
      binType: 'Glass',
      address: {
        street: '123 Main',
        city: 'Test City',
        postalCode: '12345'
      }
    });

    expect(request.status).toBe('PENDING');
    expect(request.bin.toString()).toBe(bin._id.toString());
  });

  test('enforces enum validation', async() => {
    const binId = new mongoose.Types.ObjectId();
    await expect(CollectionRequest.create({
      bin: binId,
      binType: 'InvalidType'
    })).rejects.toThrow(mongoose.Error.ValidationError);
  });
});
