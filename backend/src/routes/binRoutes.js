// src/routes/binRoutes.js
const express = require('express');
const router = express.Router();
const { getAllBins, getBinById, createBin, updateBin } = require('../controllers/binController');

// Routes
router.get('/', getAllBins);
router.get('/:id', getBinById);
router.post('/', createBin);
router.put('/:id', updateBin);

module.exports = router;
