// models/CollectionRequest.js (CommonJS)
const mongoose = require('mongoose');
const { BIN_TYPES_ARRAY, COLLECTION_STATUS_ARRAY, VALIDATION_LIMITS } = require('../constants');

const collectionRequestSchema = new mongoose.Schema({
  bin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bin',
    required: true,
    index: true
  },
  binType: {
    type: String,
    required: true,
    enum: BIN_TYPES_ARRAY
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
  },
  status: {
    type: String,
    enum: COLLECTION_STATUS_ARRAY,
    default: 'PENDING',
    index: true
  }
}, { timestamps: true });

// Add compound indexes for efficient queries
collectionRequestSchema.index({ status: 1, createdAt: -1 });
collectionRequestSchema.index({ bin: 1, status: 1 });

module.exports = mongoose.model('CollectionRequest', collectionRequestSchema);
