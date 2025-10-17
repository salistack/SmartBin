
const mongoose = require('mongoose');
const { BIN_TYPES_ARRAY, VALIDATION_LIMITS } = require('../constants');

const binSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: BIN_TYPES_ARRAY
  },
  filthLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: VALIDATION_LIMITS.FILTH_LEVEL_MAX
  },
  maxLevel: {
    type: Number,
    default: 100,
    min: VALIDATION_LIMITS.BIN_MAX_LEVEL_MIN,
    max: VALIDATION_LIMITS.BIN_MAX_LEVEL_MAX
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Add indexes for better query performance
binSchema.index({ owner: 1 });
binSchema.index({ type: 1 });
binSchema.index({ filthLevel: 1 });

// Virtual for fill percentage
binSchema.virtual('fillPercentage').get(function() {
  return Math.round((this.filthLevel / this.maxLevel) * 100);
});

// Virtual for isFull status
binSchema.virtual('isFull').get(function() {
  return this.filthLevel >= this.maxLevel;
});

// Include virtuals when converting to JSON
binSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Bin', binSchema);
