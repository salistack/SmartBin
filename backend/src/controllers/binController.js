// controllers/binController.js (CommonJS)
const Bin = require('../models/Bin');
const { createErrorResponse } = require('../utils/validation');
const { BIN_TYPES_ARRAY, HTTP_STATUS, VALIDATION_LIMITS } = require('../constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

// Create a new bin
exports.createBin = asyncHandler(async(req, res) => {
  const { type } = req.body;

  // Validate bin type using shared constants
  if (!type || !BIN_TYPES_ARRAY.includes(type)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse(`Invalid bin type. Allowed types: ${BIN_TYPES_ARRAY.join(', ')}`)
    );
  }

  const bin = await Bin.create({
    owner: req.user.id,
    type,
    maxLevel: 100 // always use 100 as requested
  });

  res.status(HTTP_STATUS.CREATED).json({
    message: 'Bin created successfully',
    bin
  });
});

// Update filth level manually
exports.updateFilthLevel = asyncHandler(async(req, res) => {
  const { binId } = req.params;
  const { addedFilth } = req.body;

  // Validate addedFilth input
  if (typeof addedFilth !== 'number' || !Number.isFinite(addedFilth)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('addedFilth must be a valid number')
    );
  }

  if (addedFilth < 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('addedFilth cannot be negative')
    );
  }

  if (addedFilth > VALIDATION_LIMITS.FILTH_LEVEL_MAX) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse(`addedFilth value too large (max: ${VALIDATION_LIMITS.FILTH_LEVEL_MAX})`)
    );
  }

  const bin = await Bin.findById(binId).populate('owner');
  if (!bin) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Bin not found')
    );
  }

  // Only owner can update (unless admin/collector)
  if (req.user.role === 'resident' && bin.owner._id.toString() !== req.user.id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Unauthorized')
    );
  }

  const newLevel = bin.filthLevel + addedFilth;
  const maxLevel = bin.maxLevel || 100;

  // Cap at max level to prevent overflow
  bin.filthLevel = Math.min(newLevel, maxLevel);
  await bin.save();

  res.json({
    message: 'Filth level updated',
    bin
  });
});

// List bins created by the current user with computed status
exports.getMyBins = asyncHandler(async(req, res) => {
  const bins = await Bin.find({ owner: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const result = bins.map(b => {
    const max = b.maxLevel || 100;
    const level = typeof b.filthLevel === 'number' ? b.filthLevel : 0;
    const percent = Math.round((level / max) * 100);
    const isFull = level >= max;

    return {
      id: String(b._id),
      type: b.type,
      filthLevel: level,
      maxLevel: max,
      percent,
      isFull,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    };
  });

  res.json({ bins: result });
});
