// Configuration module - centralized environment variable handling
require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartbin',

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'devsecret',
    expiresIn: process.env.JWT_EXPIRES || '7d',
    logTokens: (process.env.LOG_TOKENS || 'false').toLowerCase() === 'true'
  },

  // Security configuration
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },

  // Application settings
  app: {
    name: 'SmartBin',
    version: '1.0.0'
  },

  // Feature flags
  features: {
    routeOptimization: process.env.ENABLE_ROUTE_OPTIMIZATION !== 'false'
  }
};

// Validation for critical configuration
const validateConfig = () => {
  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'devsecret') {
      console.warn('WARNING: Using default JWT secret in production!');
    }
    if (config.jwt.logTokens) {
      console.warn('WARNING: JWT token logging is enabled in production!');
    }
  }
};

validateConfig();

module.exports = config;
