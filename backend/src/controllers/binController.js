// controllers/binController.js
import Bin from "../models/Bin.js";
import CollectionRequest from "../models/CollectionRequest.js";

// Create a new bin
export const createBin = async (req, res) => {
  try {
    const { type, maxFilthLevel } = req.body;

    const bin = await Bin.create({
      user: req.user._id,
      type,
      maxFilthLevel,
    });

    res.status(201).json({ message: "Bin created successfully", bin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update filth level manually
export const updateFilthLevel = async (req, res) => {
  try {
    const { binId } = req.params;
    const { addedFilth } = req.body;

    const bin = await Bin.findById(binId).populate("user");
    if (!bin) return res.status(404).json({ message: "Bin not found" });

    // Only owner can update
    if (bin.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
7
    bin.filthLevel += addedFilth;
    if (bin.filthLevel > 100) bin.filthLevel = 100;
    await bin.save();

    res.json({ message: "Filth level updated", bin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
