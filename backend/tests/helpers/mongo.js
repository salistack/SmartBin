const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connect = async() => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    dbName: 'smartbin_test'
  });
};

const clearDatabase = async() => {
  const { collections } = mongoose.connection;
  const collectionNames = Object.keys(collections);
  await Promise.all(collectionNames.map((name) => collections[name].deleteMany({})));
};

const disconnect = async() => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = {
  connect,
  clearDatabase,
  disconnect
};
