// controllers/collectionController.js
import Bin from "../models/Bin.js";
import CollectionRequest from "../models/CollectionRequest.js";

// Send collection request (auto or manual)
export const sendCollectionRequest = async (req, res) => {
  try {
    const { binId } = req.body;
    const bin = await Bin.findById(binId).populate("user");

    if (!bin) return res.status(404).json({ message: "Bin not found" });

    if (bin.filthLevel < bin.maxFilthLevel) {
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
      address: bin.user.address
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
export const updateRequestStatus = async (req, res) => {
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
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await CollectionRequest.find({ status: "PENDING" })
      .populate("bin")
      .populate("user");

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List user's own requests
export const getUserRequests = async (req, res) => {
  try {
    const requests = await CollectionRequest.find({ "bin.user": req.user._id })
      .populate("bin");

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
