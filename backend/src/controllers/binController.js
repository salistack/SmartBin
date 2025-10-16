// controllers/binController.js (CommonJS)
const Bin = require('../models/Bin');
const CollectionRequest = require('../models/CollectionRequest');

// Create a new bin
exports.createBin = async (req, res) => {
  try {
  const { type } = req.body;

    const bin = await Bin.create({
      owner: req.user.id,
      type,
      maxLevel: 100, // always use 100 as requested
    });

    res.status(201).json({ message: "Bin created successfully", bin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update filth level manually
exports.updateFilthLevel = async (req, res) => {
  try {
    const { binId } = req.params;
    const { addedFilth } = req.body;

    const bin = await Bin.findById(binId).populate('owner');
    if (!bin) return res.status(404).json({ message: "Bin not found" });

    // Only owner can update
    if (bin.owner._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    bin.filthLevel += addedFilth;
    if (bin.filthLevel > (bin.maxLevel || 100)) bin.filthLevel = bin.maxLevel || 100;
    await bin.save();

    res.json({ message: "Filth level updated", bin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
