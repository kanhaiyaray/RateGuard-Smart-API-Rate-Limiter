// server/src/controllers/adminController.js
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const AuditLog = require('../models/AuditLog');
const ApiKey = require('../models/ApiKey');
const { buildAlertSummary, buildPredictiveInsights } = require('../services/adminInsights');

const createAuditEntry = async ({ req, action, resource, details }) => {
  try {
    await AuditLog.create({
      adminId: req.user?._id,
      action,
      resource,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    console.error('⚠️ Audit logging failed:', err.message);
  }
};

const getTodayStart = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

const buildAdminOverviewPayload = async (req) => {
  const User = require('../models/User');
  const Analytics = require('../models/Analytics');
  const mongoose = require('mongoose');
  const redisClient = require('../config/redis');

  const start = getTodayStart();
  const totalUsers = await User.countDocuments();
  const adminUsers = await User.countDocuments({ role: 'admin' });
  const regularUsers = await User.countDocuments({ role: 'user' });
  const freeUsers = await User.countDocuments({ plan: 'FREE' });
  const premiumUsers = await User.countDocuments({ plan: 'PREMIUM' });
  const adminPlanUsers = await User.countDocuments({ plan: 'ADMIN' });
  const newUsersToday = await User.countDocuments({ createdAt: { $gte: start } });

  const totalRequestsToday = await Analytics.countDocuments({ timestamp: { $gte: start } });
  const blockedRequestsToday = await Analytics.countDocuments({ timestamp: { $gte: start }, blocked: true });
  const totalRequestsAllTime = await Analytics.countDocuments();
  const blockedRequestsAllTime = await Analytics.countDocuments({ blocked: true });

  const topEndpoints = await Analytics.aggregate([
    { $match: { timestamp: { $gte: start } } },
    { $group: { _id: { path: '$endpoint', method: '$method' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { path: '$_id.path', method: '$_id.method', count: 1, _id: 0 } },
  ]);

  const topActiveUsers = await Analytics.aggregate([
    { $match: { timestamp: { $gte: start } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { name: '$user.name', email: '$user.email', plan: '$user.plan', count: 1, _id: 0 } },
  ]);

  const hourlyTrend = await Analytics.aggregate([
    { $match: { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
    { $group: { _id: { hour: { $hour: '$timestamp' }, blocked: '$blocked' }, count: { $sum: 1 } } },
    { $project: { hour: '$_id.hour', blocked: '$_id.blocked', count: 1, _id: 0 } },
    { $sort: { hour: 1 } },
  ]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const requestsPerHour = hours.map((hour) => {
    const found = hourlyTrend.filter((d) => d.hour === hour && !d.blocked);
    return found.reduce((sum, d) => sum + d.count, 0);
  });
  const blockedPerHour = hours.map((hour) => {
    const found = hourlyTrend.filter((d) => d.hour === hour && d.blocked);
    return found.reduce((sum, d) => sum + d.count, 0);
  });

  const recentActivity = await Analytics.find({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    .sort({ timestamp: -1 })
    .limit(12)
    .populate('userId', 'name email');

  const alerts = buildAlertSummary({
    requests: {
      today: {
        total: totalRequestsToday,
        blocked: blockedRequestsToday,
        blockRate: totalRequestsToday > 0 ? parseFloat(((blockedRequestsToday / totalRequestsToday) * 100).toFixed(2)) : 0,
      },
    },
    health: {
      status: mongoose.connection.readyState === 1 && redisClient.isReady ? 'healthy' : 'degraded',
    },
  });

  const insights = buildPredictiveInsights(
    hours.map((hour) => ({
      hour,
      requests: requestsPerHour[hour] || 0,
      blocked: blockedPerHour[hour] || 0,
    }))
  );

  const segments = await User.aggregate([
    { $lookup: { from: 'analytics', localField: '_id', foreignField: 'userId', as: 'activity' } },
    { $project: { name: 1, email: 1, plan: 1, role: 1, totalRequests: { $size: '$activity' }, blockedRequests: { $size: { $filter: { input: '$activity', cond: { $eq: ['$$this.blocked', true] } } } } } },
  ]);

  const health = {
    status: mongoose.connection.readyState === 1 && redisClient.isReady ? 'healthy' : 'degraded',
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: new Date(process.uptime() * 1000).toISOString().substr(11, 8),
    },
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient.isReady ? 'connected' : 'disconnected',
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
    timestamp: new Date().toISOString(),
  };

  return {
    users: {
      total: totalUsers,
      admins: adminUsers,
      regular: regularUsers,
      free: freeUsers,
      premium: premiumUsers,
      adminPlan: adminPlanUsers,
      newToday: newUsersToday,
    },
    requests: {
      today: {
        total: totalRequestsToday,
        blocked: blockedRequestsToday,
        allowed: totalRequestsToday - blockedRequestsToday,
        blockRate: totalRequestsToday > 0 ? parseFloat(((blockedRequestsToday / totalRequestsToday) * 100).toFixed(2)) : 0,
      },
      allTime: {
        total: totalRequestsAllTime,
        blocked: blockedRequestsAllTime,
        allowed: totalRequestsAllTime - blockedRequestsAllTime,
      },
    },
    topEndpoints,
    topActiveUsers,
    hourlyTrend: { hours, requests: requestsPerHour, blocked: blockedPerHour },
    alerts,
    insights,
    recentActivity,
    segments,
    health,
  };
};

// ============ CHANGE USER PLAN ============
exports.changePlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const { plan, userId } = req.body;
    const validPlans = ['FREE', 'PREMIUM', 'ADMIN'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Must be FREE, PREMIUM, or ADMIN'
      });
    }

    const targetId = userId || req.user.id;
    const user = await User.findById(targetId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldPlan = user.plan;
    user.plan = plan;
    await user.save();

    await createAuditEntry({
      req,
      action: 'CHANGE_PLAN',
      resource: 'user',
      details: { targetUserId: user._id, oldPlan, newPlan: plan },
    });

    console.log(`📊 Admin ${req.user.email} changed plan for ${user.email} from ${oldPlan} to ${plan}`);

    res.json({
      success: true,
      message: `Plan changed from ${oldPlan} to ${plan}`,
      data: user
    });
  } catch (err) {
    console.error('❌ Error changing plan:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============ GET ALL USERS ============
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============ UPDATE USER ROLE ============
exports.updateUserRole = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const { userId, role } = req.body;
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user or admin'
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await createAuditEntry({
      req,
      action: 'CHANGE_ROLE',
      resource: 'user',
      details: { targetUserId: user._id, oldRole, newRole: role },
    });

    console.log(`👤 Admin ${req.user.email} changed role for ${user.email} from ${oldRole} to ${role}`);

    res.json({
      success: true,
      message: `Role changed from ${oldRole} to ${role}`,
      data: user
    });
  } catch (err) {
    console.error('❌ Error updating user role:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============ DELETE USER ============
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await Analytics.deleteMany({ userId });
    await user.deleteOne();

    await createAuditEntry({
      req,
      action: 'DELETE_USER',
      resource: 'user',
      details: { targetUserId: user._id, email: user.email },
    });

    console.log(`🗑️ Admin ${req.user.email} deleted user ${user.email}`);

    res.json({
      success: true,
      message: `User ${user.email} deleted successfully`
    });
  } catch (err) {
    console.error('❌ Error deleting user:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getAdminOverview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const overview = await buildAdminOverviewPayload(req);

    res.json({
      success: true,
      stats: overview,
    });
  } catch (err) {
    console.error('❌ Error fetching admin overview:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(25).populate('adminId', 'name email');
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('❌ Error fetching audit logs:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listApiKeys = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const keys = await ApiKey.find().sort({ createdAt: -1 });
    res.json({ success: true, data: keys });
  } catch (err) {
    console.error('❌ Error listing API keys:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createApiKey = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const { appName, permissions = [], rateLimit = 100, expiresAt } = req.body;
    if (!appName) {
      return res.status(400).json({ success: false, message: 'appName is required' });
    }

    const key = crypto.randomBytes(24).toString('hex');
    const apiKey = await ApiKey.create({ appName, key, permissions, rateLimit, expiresAt });

    await createAuditEntry({
      req,
      action: 'CREATE_API_KEY',
      resource: 'api-key',
      details: { appName, key: apiKey.key },
    });

    res.json({ success: true, data: apiKey });
  } catch (err) {
    console.error('❌ Error creating API key:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteApiKey = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const key = await ApiKey.findById(req.params.keyId);
    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    await key.deleteOne();
    res.json({ success: true, message: 'API key removed' });
  } catch (err) {
    console.error('❌ Error deleting API key:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runLoadTest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const { url, requests = 25, concurrency = 5 } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'url is required' });
    }

    const totalRequests = Number(requests);
    const totalConcurrency = Number(concurrency);
    const results = [];
    const start = Date.now();

    const workers = Array.from({ length: totalConcurrency }, async () => {
      for (let i = 0; i < Math.ceil(totalRequests / totalConcurrency); i++) {
        const requestStart = Date.now();
        try {
          const response = await axios.get(url, { validateStatus: () => true, timeout: 5000 });
          results.push({ status: response.status, responseTime: Date.now() - requestStart, success: response.status < 400 });
        } catch (error) {
          results.push({ status: 500, responseTime: Date.now() - requestStart, success: false, error: error.message });
        }
      }
    });

    await Promise.all(workers);

    const summary = {
      totalRequests: results.length,
      successRate: ((results.filter((item) => item.success).length / results.length) * 100).toFixed(2),
      avgResponseTime: results.reduce((sum, item) => sum + item.responseTime, 0) / results.length,
      totalTimeMs: Date.now() - start,
    };

    res.json({ success: true, data: { summary, results } });
  } catch (err) {
    console.error('❌ Error running load test:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const summary = await buildAdminOverviewPayload(req);
    const data = summary || {};
    const lines = [
      'metric,value',
      `totalUsers,${data.users?.total || 0}`,
      `requestsToday,${data.requests?.today?.total || 0}`,
      `blockedToday,${data.requests?.today?.blocked || 0}`,
      `blockRate,${data.requests?.today?.blockRate || 0}`,
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rateguard-report.csv"');
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('❌ Error exporting report:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTwoFactorStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const user = await User.findById(req.user._id).select('twoFactorEnabled twoFactorSecret');
    res.json({ success: true, data: { enabled: !!user?.twoFactorEnabled, secret: user?.twoFactorSecret || null } });
  } catch (err) {
    console.error('❌ Error fetching 2FA status:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleTwoFactor = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const { enabled } = req.body;
    const user = await User.findById(req.user._id);
    user.twoFactorEnabled = Boolean(enabled);
    user.twoFactorSecret = Boolean(enabled) ? crypto.randomBytes(16).toString('hex') : null;
    await user.save();

    res.json({ success: true, data: { enabled: user.twoFactorEnabled, secret: user.twoFactorSecret } });
  } catch (err) {
    console.error('❌ Error toggling 2FA:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};