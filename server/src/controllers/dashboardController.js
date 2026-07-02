const Analytics = require('../models/Analytics');
const redisClient = require('../config/redis');
const User = require('../models/User');

const PLAN_LIMITS = { FREE: 20, PREMIUM: 200, ADMIN: Infinity };

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const plan = req.user.plan || 'FREE';
    const limit = PLAN_LIMITS[plan] || 20;

    // Today's start
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Aggregations
    const totalRequests = await Analytics.countDocuments({
      userId,
      timestamp: { $gte: start },
    });

    const blockedRequests = await Analytics.countDocuments({
      userId,
      timestamp: { $gte: start },
      blocked: true,
    });

    // Remaining from Redis
    const key = `rate:${userId}`;
    const current = await redisClient.get(key);
    const used = current ? parseInt(current) : 0;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);

    // Top endpoints for this user
    const topEndpoints = await Analytics.aggregate([
      { $match: { userId: userId, timestamp: { $gte: start } } },
      { $group: { _id: { path: '$endpoint', method: '$method' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { path: '$_id.path', method: '$_id.method', count: 1, _id: 0 } },
    ]);

    // Top active users (all users, for demo we just use all)
    const topUsers = await Analytics.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', count: 1, _id: 0 } },
    ]);

    res.json({
      requests: totalRequests,
      blocked: blockedRequests,
      remaining,
      limit,
      topEndpoints,
      topUsers,
      resetTime: '2:34', // could compute from TTL
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};