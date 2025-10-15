const express = require('express');
const router = express.Router();
const { requestCollection, getCollectionHistory } = require('../controllers/customerController');

router.post('/request', requestCollection);
router.get('/:id/collections', getCollectionHistory);

module.exports = router;
