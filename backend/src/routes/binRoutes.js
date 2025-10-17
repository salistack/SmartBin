const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { requireRequestBody, requireFields, validateObjectId, validateNumber } = require('../middlewares/validationMiddleware');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { createBin, updateFilthLevel, getMyBins } = require('../controllers/binController');
const { VALIDATION_LIMITS } = require('../constants');

// Create a new bin (owner = current user)
router.post('/',
  auth,
  requireRequestBody,
  requireFields(['type']),
  asyncHandler(createBin)
);

// Update filth level for a bin by id (owner only)
router.patch('/:binId/filth',
  auth,
  validateObjectId('binId'),
  requireRequestBody,
  requireFields(['addedFilth']),
  validateNumber('addedFilth', { min: 0, max: VALIDATION_LIMITS.FILTH_LEVEL_MAX }),
  asyncHandler(updateFilthLevel)
);

// List my bins with status (for dashboard)
router.get('/', auth, asyncHandler(getMyBins));

module.exports = router;
