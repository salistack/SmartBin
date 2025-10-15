// src/models/Bin.js
const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  location: { type: String, required: true },
  fillLevel: { type: Number, default: 0 }, // 0 - 100%
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bin', binSchema);
