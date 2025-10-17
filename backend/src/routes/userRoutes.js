const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { updateProfile } = require('../controllers/userController');

// Update resident profile
router.patch('/me', auth, updateProfile);

module.exports = router;