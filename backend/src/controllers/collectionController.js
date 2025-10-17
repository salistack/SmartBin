// controllers/collectionController.js (CommonJS)
const Bin = require('../models/Bin');
const CollectionRequest = require('../models/CollectionRequest');
const { createErrorResponse } = require('../utils/validation');
const { COLLECTION_STATUS_ARRAY, HTTP_STATUS } = require('../constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

// Send collection request (auto or manual)
exports.sendCollectionRequest = asyncHandler(async(req, res) => {
  const { binId } = req.body;
  const bin = await Bin.findById(binId).populate('owner');

  if (!bin) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Bin not found')
    );
  }

  // Only bin owner can request collection (unless admin/collector)
  if (req.user.role === 'resident' && bin.owner._id.toString() !== req.user.id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('You can only request collection for your own bins')
    );
  }

  if (bin.filthLevel < (bin.maxLevel ?? 100)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Bin is not full yet')
    );
  }

  // Check if request already exists
  const existingRequest = await CollectionRequest.findOne({
    bin: bin._id,
    status: 'PENDING'
  });

  if (existingRequest) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Collection request already pending')
    );
  }

  const collectionRequest = await CollectionRequest.create({
    bin: bin._id,
    binType: bin.type,
    address: bin.owner?.address
  });

  res.status(HTTP_STATUS.CREATED).json({
    message: 'Collection request created',
    collectionRequest
  });
});

// Collector updates request status to COLLECTED
exports.updateRequestStatus = asyncHandler(async(req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  // Validate status using shared constants
  if (!COLLECTION_STATUS_ARRAY.includes(status)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse(`Invalid status. Allowed values: ${COLLECTION_STATUS_ARRAY.join(', ')}`)
    );
  }

  const request = await CollectionRequest.findById(requestId);
  if (!request) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Request not found')
    );
  }

  request.status = status;
  await request.save();

  // Reset bin filth if collected
  if (status === 'COLLECTED') {
    const bin = await Bin.findById(request.bin);
    if (bin) {
      bin.filthLevel = 0;
      await bin.save();
    }
  }

  res.json({
    message: 'Request status updated',
    request
  });
});

// List all pending requests (collector view)
exports.getPendingRequests = asyncHandler(async(req, res) => {
  const requests = await CollectionRequest.find({ status: 'PENDING' })
    .populate({
      path: 'bin',
      populate: {
        path: 'owner',
        select: 'name email address'
      }
    });

  res.json({ requests });
});

// List collected requests for history (collector view)
exports.getCollectedRequests = asyncHandler(async(req, res) => {
  const requests = await CollectionRequest.find({ status: 'COLLECTED' })
    .sort({ updatedAt: -1 })
    .populate({
      path: 'bin',
      populate: {
        path: 'owner',
        select: 'name email address'
      }
    });

  res.json({ requests });
});

// List user's own requests (resident/owner)
exports.getUserRequests = asyncHandler(async(req, res) => {
  // Find bins owned by current user, then fetch requests for those bins
  const bins = await Bin.find({ owner: req.user.id }).select('_id');
  const binIds = bins.map((b) => b._id);
  const requests = await CollectionRequest.find({ bin: { $in: binIds } })
    .sort({ createdAt: -1 });

  res.json({ requests });
});
