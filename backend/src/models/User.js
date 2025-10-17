const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { USER_ROLES_ARRAY, VALIDATION_LIMITS } = require('../constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: VALIDATION_LIMITS.NAME_MIN_LENGTH,
    maxlength: VALIDATION_LIMITS.NAME_MAX_LENGTH
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
    maxlength: VALIDATION_LIMITS.PASSWORD_MAX_LENGTH
  },
  role: {
    type: String,
    enum: USER_ROLES_ARRAY,
    required: true,
    index: true
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: VALIDATION_LIMITS.ADDRESS_STREET_MAX
    },
    city: {
      type: String,
      trim: true,
      maxlength: VALIDATION_LIMITS.ADDRESS_CITY_MAX
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: VALIDATION_LIMITS.ADDRESS_POSTAL_MAX
    },
    lat: {
      type: Number,
      min: VALIDATION_LIMITS.COORDINATE_LAT_MIN,
      max: VALIDATION_LIMITS.COORDINATE_LAT_MAX
    },
    lng: {
      type: Number,
      min: VALIDATION_LIMITS.COORDINATE_LNG_MIN,
      max: VALIDATION_LIMITS.COORDINATE_LNG_MAX
    }
  }
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare passwords
userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Don't include password in JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
