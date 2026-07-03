const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { validateRequest } = require('../middleware/validate');
const {
  changePlan,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAdminOverview,
  getAuditLogs,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  runLoadTest,
  exportReport,
  getTwoFactorStatus,
  toggleTwoFactor,
} = require('../controllers/adminController');
const router = express.Router();

router.use(auth);
router.use(adminOnly);

router.post(
  '/change-plan',
  [
    body('plan')
      .isIn(['FREE', 'PREMIUM', 'ADMIN'])
      .withMessage('Invalid plan'),
    body('userId').optional().isMongoId().withMessage('Invalid user ID'),
  ],
  validateRequest,
  changePlan
);

router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().escape(),
  ],
  validateRequest,
  getAllUsers
);

router.put(
  '/users/role',
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('role').isIn(['user', 'admin']).withMessage('Invalid role'),
  ],
  validateRequest,
  updateUserRole
);

router.delete(
  '/users/:userId',
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
  ],
  validateRequest,
  deleteUser
);

// ============ ADMIN ENDPOINT: GET SINGLE USER ============
/**
 * GET /api/admin/users/:userId
 * Get a specific user by ID (admin only)
 * 
 * ✅ Returns detailed user information (without password)
 */
router.get('/users/:userId', async (req, res) => {
  try {
    // ✅ Only admins can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const User = require('../models/User');
    const user = await User.findById(req.params.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error('❌ Error fetching user:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============ ADMIN ENDPOINT: GET DASHBOARD STATISTICS ============
/**
 * GET /api/admin/stats
 * Get overall admin dashboard statistics
 * Includes: user counts, request counts, plan distribution, trends
 * 
 * ✅ Comprehensive admin analytics dashboard data
 */
router.get('/stats', getAdminOverview);

router.get('/audit-logs', getAuditLogs);
router.get('/api-keys', listApiKeys);
router.post('/api-keys', [body('appName').notEmpty().withMessage('appName is required')], validateRequest, createApiKey);
router.delete('/api-keys/:keyId', [param('keyId').isMongoId().withMessage('Invalid key ID')], validateRequest, deleteApiKey);
router.post('/load-test', [body('url').isURL().withMessage('Valid URL is required')], validateRequest, runLoadTest);
router.get('/export-report', exportReport);
router.get('/2fa/status', getTwoFactorStatus);
router.post('/2fa/toggle', [body('enabled').isBoolean().withMessage('enabled must be boolean')], validateRequest, toggleTwoFactor);

// ============ ADMIN ENDPOINT: GET SYSTEM HEALTH ============
/**
 * GET /api/admin/health
 * Get detailed system health status (admin only)
 * 
 * ✅ Monitors MongoDB, Redis, memory usage, and uptime
 */
router.get('/health', async (req, res) => {
  try {
    // ✅ Only admins can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const mongoose = require('mongoose');
    const redisClient = require('../config/redis');

    // Check MongoDB
    const mongoStatus = mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected';

    // Check Redis
    const redisStatus = redisClient.isReady
      ? 'connected'
      : 'disconnected';

    // Get system uptime
    const uptime = process.uptime();

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    res.json({
      success: true,
      health: {
        status: mongoStatus === 'connected' && redisStatus === 'connected'
          ? 'healthy'
          : 'degraded',
        uptime: {
          seconds: Math.floor(uptime),
          formatted: new Date(uptime * 1000).toISOString().substr(11, 8)
        },
        services: {
          mongodb: mongoStatus,
          redis: redisStatus,
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('❌ Error fetching system health:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;