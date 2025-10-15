

const mongoose = require('mongoose');

const collectionRequestSchema = new mongoose.Schema({
  bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'Pending' }, // Pending, Collected
  requestedAt: { type: Date, default: Date.now },
  collectedAt: { type: Date },
});

module.exports = mongoose.model('CollectionRequest', collectionRequestSchema);
