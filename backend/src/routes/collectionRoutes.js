const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { requireCollector } = require('../middlewares/roleMiddleware');
const { requireRequestBody, requireFields, validateObjectId, validateEnum } = require('../middlewares/validationMiddleware');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { sendCollectionRequest, updateRequestStatus, getPendingRequests, getCollectedRequests, getUserRequests } = require('../controllers/collectionController');
const { COLLECTION_STATUS_ARRAY } = require('../constants');

// Send collection request for a bin (auto/manual)
router.post('/request',
  auth,
  requireRequestBody,
  requireFields(['binId']),
  validateObjectId('binId'),
  asyncHandler(sendCollectionRequest)
);

// Update collection request status by id (collector/admin only)
router.patch('/:requestId/status',
  auth,
  requireCollector(),
  validateObjectId('requestId'),
  requireRequestBody,
  requireFields(['status']),
  validateEnum('status', COLLECTION_STATUS_ARRAY),
  asyncHandler(updateRequestStatus)
);

// List all pending requests (collector/admin only)
router.get('/pending', auth, requireCollector(), asyncHandler(getPendingRequests));

// List collected requests (collector/admin only)
router.get('/collected', auth, requireCollector(), asyncHandler(getCollectedRequests));

// List requests for current user (resident/owner)
router.get('/mine', auth, asyncHandler(getUserRequests));

module.exports = router;
