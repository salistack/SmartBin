// src/controllers/binController.js
const Bin = require('../models/Bin');

// Get all bins
exports.getAllBins = async (req, res) => {
  try {
    const bins = await Bin.find();
    res.json(bins);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bins', error: err.message });
  }
};

// Get single bin by ID
exports.getBinById = async (req, res) => {
  try {
    const bin = await Bin.findById(req.params.id);
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json(bin);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bin', error: err.message });
  }
};

// Create new bin
exports.createBin = async (req, res) => {
  try {
    const bin = new Bin(req.body);
    await bin.save();
    res.status(201).json(bin);
  } catch (err) {
    res.status(400).json({ message: 'Error creating bin', error: err.message });
  }
};

// Update bin (e.g., fill level or status)
exports.updateBin = async (req, res) => {
  try {
    const updated = await Bin.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Bin not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Error updating bin', error: err.message });
  }
};
