const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { requireRequestBody, requireFields } = require('../middlewares/validationMiddleware');
const { asyncHandler } = require('../middlewares/errorMiddleware');

// Auth endpoints with validation middleware
router.post('/register',
  requireRequestBody,
  requireFields(['name', 'email', 'password', 'role']),
  asyncHandler(register)
);

router.post('/login',
  requireRequestBody,
  requireFields(['email', 'password']),
  asyncHandler(login)
);

module.exports = router;
