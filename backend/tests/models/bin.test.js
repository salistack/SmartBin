const mongoose = require('mongoose');
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

describe('Bin model', () => {
  test('applies defaults and computes virtuals', async() => {
    const ownerId = new mongoose.Types.ObjectId();
    const bin = await Bin.create({ type: 'Plastic', owner: ownerId, filthLevel: 50 });

    expect(bin.maxLevel).toBe(100);
    expect(bin.filthLevel).toBe(50);
    expect(bin.fillPercentage).toBe(50);
    expect(bin.isFull).toBe(false);

    bin.filthLevel = 120;
    await bin.save();

    expect(bin.fillPercentage).toBe(120);
    expect(bin.isFull).toBe(true);

    const json = bin.toJSON();
    expect(json.fillPercentage).toBe(120);
    expect(json.isFull).toBe(true);
  });
});
