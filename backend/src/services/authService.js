// Authentication service layer - separates business logic from HTTP handling
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { validateEmail, validatePassword, validateCoordinates, sanitizeString, createErrorResponse } = require('../utils/validation');
const { PUBLIC_REGISTRATION_ROLES, HTTP_STATUS } = require('../constants');

class AuthService {
  /**
   * Generate JWT token for a user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * Validate and prepare user registration data
   * @param {Object} userData - Raw user data from request
   * @returns {Object} Validation result with data or errors
   */
  async validateRegistrationData(userData) {
    const { name, email, password, role, address } = userData;

    // Check required fields
    if (!name || !email || !password || !role) {
      return {
        isValid: false,
        status: HTTP_STATUS.BAD_REQUEST,
        error: createErrorResponse('Name, email, password, and role are required')
      };
    }

    // Validate and sanitize name
    const cleanName = sanitizeString(name, 100);
    if (!cleanName || cleanName.length < 2) {
      return {
        isValid: false,
        status: HTTP_STATUS.BAD_REQUEST,
        error: createErrorResponse('Name must be between 2-100 characters')
      };
    }

    // Validate email
    if (!validateEmail(email)) {
      return {
        isValid: false,
        status: HTTP_STATUS.BAD_REQUEST,
        error: createErrorResponse('Please enter a valid email address')
      };
    }

    // Validate password
    if (!validatePassword(password)) {
      return {
        isValid: false,
        status: HTTP_STATUS.BAD_REQUEST,
        error: createErrorResponse('Password must be at least 6 characters and contain both letters and numbers')
      };
    }

    // Validate role
    if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
      return {
        isValid: false,
        status: HTTP_STATUS.BAD_REQUEST,
        error: createErrorResponse('Invalid role. Only resident and collector accounts can be created through public registration.')
      };
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return {
        isValid: false,
        status: HTTP_STATUS.CONFLICT,
        error: createErrorResponse('Email already in use')
      };
    }

    // Prepare user data
    const validatedData = {
      name: cleanName,
      email: email.toLowerCase(),
      password,
      role
    };

    // Process address if provided
    if (address && typeof address === 'object') {
      validatedData.address = {
        street: sanitizeString(address.street, 200),
        city: sanitizeString(address.city, 100),
        postalCode: sanitizeString(address.postalCode, 20)
      };

      // Validate coordinates if provided
      if (address.lat !== undefined && address.lng !== undefined) {
        if (validateCoordinates(address.lat, address.lng)) {
          validatedData.address.lat = address.lat;
          validatedData.address.lng = address.lng;
        } else {
          return {
            isValid: false,
            status: HTTP_STATUS.BAD_REQUEST,
            error: createErrorResponse('Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180')
          };
        }
      }
    }

    return {
      isValid: true,
      data: validatedData
    };
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Registration result
   */
  async registerUser(userData) {
    try {
      const validation = await this.validateRegistrationData(userData);
      if (!validation.isValid) {
        return validation;
      }

      const user = await User.create(validation.data);
      const token = this.generateToken(user);

      if (config.jwt.logTokens) {
        console.log('[AUTH][REGISTER] user:', user.email, 'role:', user.role);
      }

      return {
        isValid: true,
        status: HTTP_STATUS.CREATED,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            address: user.address
          },
          token
        }
      };
    } catch (err) {
      console.error('Register error', err);

      if (err.code === 11000) {
        return {
          isValid: false,
          status: HTTP_STATUS.CONFLICT,
          error: createErrorResponse('Email already in use')
        };
      }

      return {
        isValid: false,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: createErrorResponse('Server error')
      };
    }
  }

  /**
   * Authenticate user login
   * @param {Object} loginData - Login credentials
   * @returns {Object} Authentication result
   */
  async authenticateUser(loginData) {
    try {
      const { email, password } = loginData;

      // Validate required fields
      if (!email || !password) {
        return {
          isValid: false,
          status: HTTP_STATUS.BAD_REQUEST,
          error: createErrorResponse('Email and password are required')
        };
      }

      // Validate email format
      if (!validateEmail(email)) {
        return {
          isValid: false,
          status: HTTP_STATUS.BAD_REQUEST,
          error: createErrorResponse('Please enter a valid email address')
        };
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return {
          isValid: false,
          status: HTTP_STATUS.UNAUTHORIZED,
          error: createErrorResponse('Invalid credentials')
        };
      }

      // Verify password
      const match = await user.comparePassword(password);
      if (!match) {
        return {
          isValid: false,
          status: HTTP_STATUS.UNAUTHORIZED,
          error: createErrorResponse('Invalid credentials')
        };
      }

      // Generate token
      const token = this.generateToken(user);

      if (config.jwt.logTokens) {
        console.log('[AUTH][LOGIN] user:', user.email, 'role:', user.role);
      }

      return {
        isValid: true,
        status: HTTP_STATUS.OK,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            address: user.address
          },
          token
        }
      };
    } catch (err) {
      console.error('Login error', err);
      return {
        isValid: false,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: createErrorResponse('Server error')
      };
    }
  }
}

module.exports = new AuthService();
