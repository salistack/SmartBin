const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getDashboard, getUsersReport, getBinsReport, getCollectionsReport, getOverviewReport, getUsers, getBins, getCollections, optimizeRoute } = require('../controllers/adminController');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

router.get('/dashboard', authMiddleware, requireAdmin, getDashboard);
router.get('/reports/users', authMiddleware, requireAdmin, getUsersReport);
router.get('/reports/bins', authMiddleware, requireAdmin, getBinsReport);
router.get('/reports/collections', authMiddleware, requireAdmin, getCollectionsReport);
router.get('/reports/overview', authMiddleware, requireAdmin, getOverviewReport);
router.get('/users', authMiddleware, requireAdmin, getUsers);
router.get('/bins', authMiddleware, requireAdmin, getBins);
router.get('/collections', authMiddleware, requireAdmin, getCollections);
router.post('/routes/optimize', authMiddleware, requireAdmin, optimizeRoute);

module.exports = router;
