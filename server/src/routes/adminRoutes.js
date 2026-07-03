const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const {
  changePlan,
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require('../controllers/adminController');
const router = express.Router();

router.use(auth);

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
router.get('/stats', async (req, res) => {
  try {
    // ✅ Only admins can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const User = require('../models/User');
    const Analytics = require('../models/Analytics');

    // ============ USER STATISTICS ============
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    // Plan distribution
    const freeUsers = await User.countDocuments({ plan: 'FREE' });
    const premiumUsers = await User.countDocuments({ plan: 'PREMIUM' });
    const adminPlanUsers = await User.countDocuments({ plan: 'ADMIN' });

    // New users today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfDay }
    });

    // ============ REQUEST STATISTICS ============
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Today's requests
    const totalRequestsToday = await Analytics.countDocuments({
      timestamp: { $gte: start }
    });

    const blockedRequestsToday = await Analytics.countDocuments({
      timestamp: { $gte: start },
      blocked: true
    });

    const allowedRequestsToday = totalRequestsToday - blockedRequestsToday;

    // Total requests (all time)
    const totalRequestsAllTime = await Analytics.countDocuments();
    const blockedRequestsAllTime = await Analytics.countDocuments({
      blocked: true
    });

    // ============ TOP ACTIVE ENDPOINTS ============
    const topEndpoints = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: start }
        }
      },
      {
        $group: {
          _id: { path: '$endpoint', method: '$method' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          path: '$_id.path',
          method: '$_id.method',
          count: 1,
          _id: 0
        }
      },
    ]);

    // ============ TOP ACTIVE USERS ============
    const topActiveUsers = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: start }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          plan: '$user.plan',
          count: 1,
          _id: 0
        }
      },
    ]);

    // ============ HOURLY REQUEST TREND ============
    const hourlyTrend = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            blocked: '$blocked'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          hour: '$_id.hour',
          blocked: '$_id.blocked',
          count: 1,
          _id: 0
        }
      },
      { $sort: { hour: 1 } }
    ]);

    // Format hourly data for charts
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const requestsPerHour = hours.map(hour => {
      const found = hourlyTrend.filter(d => d.hour === hour && !d.blocked);
      return found.reduce((sum, d) => sum + d.count, 0);
    });
    const blockedPerHour = hours.map(hour => {
      const found = hourlyTrend.filter(d => d.hour === hour && d.blocked);
      return found.reduce((sum, d) => sum + d.count, 0);
    });

    // ============ RESPONSE ============
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          admins: adminUsers,
          regular: regularUsers,
          free: freeUsers,
          premium: premiumUsers,
          adminPlan: adminPlanUsers,
          newToday: newUsersToday
        },
        requests: {
          today: {
            total: totalRequestsToday,
            blocked: blockedRequestsToday,
            allowed: allowedRequestsToday,
            blockRate: totalRequestsToday > 0
              ? parseFloat((blockedRequestsToday / totalRequestsToday * 100).toFixed(2))
              : 0
          },
          allTime: {
            total: totalRequestsAllTime,
            blocked: blockedRequestsAllTime,
            allowed: totalRequestsAllTime - blockedRequestsAllTime
          }
        },
        topEndpoints: topEndpoints,
        topActiveUsers: topActiveUsers,
        hourlyTrend: {
          hours: hours,
          requests: requestsPerHour,
          blocked: blockedPerHour
        }
      }
    });
  } catch (err) {
    console.error('❌ Error fetching admin stats:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

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