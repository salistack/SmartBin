const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { sendCollectionRequest, updateRequestStatus, getPendingRequests, getCollectedRequests, getUserRequests } = require('../controllers/collectionController');

// Send collection request for a bin (auto/manual)
router.post('/request', auth, sendCollectionRequest);

// Update collection request status by id (collector/admin)
router.patch('/:requestId/status', auth, updateRequestStatus);

// List all pending requests (collector/admin)
router.get('/pending', auth, getPendingRequests);

// List collected requests (collector/admin)
router.get('/collected', auth, getCollectedRequests);

// List requests for current user (resident/owner)
router.get('/mine', auth, getUserRequests);

module.exports = router;
