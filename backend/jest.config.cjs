module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/controllers/collectionController.js',
    'src/controllers/adminController.js',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 50,
      functions: 80,
      lines: 80,
    },
  },
  clearMocks: true,
};
