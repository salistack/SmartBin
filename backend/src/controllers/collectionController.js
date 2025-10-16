// controllers/collectionController.js (CommonJS)
const Bin = require('../models/Bin');
const CollectionRequest = require('../models/CollectionRequest');

// Send collection request (auto or manual)
exports.sendCollectionRequest = async (req, res) => {
  try {
    const { binId } = req.body;
    const bin = await Bin.findById(binId).populate('owner');

    if (!bin) return res.status(404).json({ message: "Bin not found" });

    if (bin.filthLevel < (bin.maxLevel ?? 100)) {
      return res.status(400).json({ message: "Bin is not full yet" });
    }

    // Check if request already exists
    const existingRequest = await CollectionRequest.findOne({
      bin: bin._id,
      status: "PENDING"
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Collection request already pending" });
    }

    const collectionRequest = await CollectionRequest.create({
      bin: bin._id,
      binType: bin.type,
      address: bin.owner?.address,
    });

    res.status(201).json({
      message: "Collection request created",
      collectionRequest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Collector updates request status to COLLECTED
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // "COLLECTED" or "PENDING"

    const request = await CollectionRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = status;
    await request.save();

    // Reset bin filth if collected
    if (status === "COLLECTED") {
      const bin = await Bin.findById(request.bin);
      if (bin) {
        bin.filthLevel = 0;
        await bin.save();
      }
    }

    res.json({ message: "Request status updated", request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List all pending requests (collector view)
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await CollectionRequest.find({ status: 'PENDING' })
      .populate({ path: 'bin', populate: { path: 'owner', select: 'name email address' } });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List user's own requests
exports.getUserRequests = async (req, res) => {
  try {
    // populate bin and owner to access owner id
    const all = await CollectionRequest.find().populate({ path: 'bin', populate: { path: 'owner', select: '_id' } });
    const requests = all.filter(r => r.bin && r.bin.owner?.toString() === req.user.id.toString());
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
