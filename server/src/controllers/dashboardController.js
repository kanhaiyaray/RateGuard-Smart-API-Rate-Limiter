// server/src/controllers/dashboardController.js
const Analytics = require('../models/Analytics');
const redisClient = require('../config/redis');
const User = require('../models/User');
const { PLAN_LIMITS, CACHE } = require('../config/constants'); // ✅ Import from centralized config

// ✅ Use CACHE_TTL from constants
const CACHE_TTL = CACHE.DASHBOARD_TTL || 10; // seconds
const cache = new Map();

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const plan = req.user.plan || 'FREE';
    // ✅ Get limit from centralized config
    const limit = PLAN_LIMITS[plan] || 20;

    // ✅ Check cache first (enhancement)
    const cacheKey = `dashboard:${userId}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        console.log(`✅ Returning cached dashboard data for ${userId}`);
        return res.json(cached.data);
      }
      cache.delete(cacheKey);
    }

    // Today's start
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // ✅ Aggregations (existing features)
    const totalRequests = await Analytics.countDocuments({
      userId,
      timestamp: { $gte: start },
    });

    const blockedRequests = await Analytics.countDocuments({
      userId,
      timestamp: { $gte: start },
      blocked: true,
    });

    // ✅ Get remaining from Redis (existing feature)
    const key = `rate:${userId}`;
    const current = await redisClient.get(key);
    const used = current ? parseInt(current) : 0;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);

    // ✅ Hourly data for charts (new feature)
    const hourlyData = await Analytics.aggregate([
      {
        $match: {
          userId: userId,
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

    // ✅ Process hourly data for charts
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const requestsData = hours.map(hour => {
      const found = hourlyData.filter(d => d.hour === hour && !d.blocked);
      return found.reduce((sum, d) => sum + d.count, 0);
    });
    const blockedData = hours.map(hour => {
      const found = hourlyData.filter(d => d.hour === hour && d.blocked);
      return found.reduce((sum, d) => sum + d.count, 0);
    });

    // ✅ Top endpoints for this user (existing feature)
    const topEndpoints = await Analytics.aggregate([
      { $match: { userId: userId, timestamp: { $gte: start } } },
      { $group: { _id: { path: '$endpoint', method: '$method' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { path: '$_id.path', method: '$_id.method', count: 1, _id: 0 } },
    ]);

    // ✅ Optimized top users with caching (enhancement)
    const topUsersCacheKey = 'top:users';
    let topUsers = [];
    
    if (cache.has(topUsersCacheKey)) {
      const cached = cache.get(topUsersCacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        topUsers = cached.data;
      }
    }
    
    if (topUsers.length === 0) {
      const userCounts = await Analytics.aggregate([
        { $match: { timestamp: { $gte: start } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      const userIds = userCounts.map(item => item._id);
      const users = await User.find({ _id: { $in: userIds } }).select('name email');

      topUsers = userCounts.map(item => {
        const user = users.find(u => u._id.toString() === item._id.toString());
        return {
          name: user ? user.name : 'Unknown User',
          count: item.count
        };
      });

      // Cache top users result
      cache.set(topUsersCacheKey, {
        data: topUsers,
        timestamp: Date.now()
      });
    }

    // ✅ Build response with all data
    const dashboardData = {
      requests: totalRequests,
      blocked: blockedRequests,
      remaining,
      limit,
      hourlyRequests: requestsData,
      hourlyBlocked: blockedData,
      hours: hours,
      topEndpoints,
      topUsers,
      resetTime: new Date(Date.now() + 60 * 1000).toLocaleTimeString(),
    };

    // ✅ Cache dashboard data (enhancement)
    cache.set(cacheKey, {
      data: dashboardData,
      timestamp: Date.now()
    });

    res.json(dashboardData);
  } catch (err) {
    console.error('❌ Dashboard error:', err.message);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};