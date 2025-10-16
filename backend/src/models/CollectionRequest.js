// models/CollectionRequest.js (CommonJS)
const mongoose = require('mongoose');

const collectionRequestSchema = new mongoose.Schema({
  bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', required: true },
  binType: { type: String, required: true },
  address: {
    street: String,
    city: String,
    postalCode: String,
    lat: Number,
    lng: Number,
  },
  status: { type: String, enum: ['PENDING', 'COLLECTED'], default: 'PENDING' },
}, { timestamps: true });

module.exports = mongoose.model('CollectionRequest', collectionRequestSchema);
