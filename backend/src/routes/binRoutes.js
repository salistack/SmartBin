const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { createBin, updateFilthLevel, getMyBins } = require('../controllers/binController');

// Create a new bin (owner = current user)
router.post('/', auth, createBin);

// Update filth level for a bin by id (owner only)
router.patch('/:binId/filth', auth, updateFilthLevel);

// List my bins with status (for dashboard)
router.get('/', auth, getMyBins);

module.exports = router;
