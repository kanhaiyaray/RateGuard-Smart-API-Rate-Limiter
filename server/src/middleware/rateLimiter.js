const redisClient = require('../config/redis');
const Analytics = require('../models/Analytics');

// Plan limits (requests per minute)
const PLAN_LIMITS = {
  FREE: 20,
  PREMIUM: 200,
  ADMIN: Infinity,
};

const rateLimiter = async (req, res, next) => {
  if (!req.user) return next(); // Should not happen if auth is before

  const userId = req.user.id;
  const plan = req.user.plan || 'FREE';
  const limit = PLAN_LIMITS[plan] || 20;

  // If ADMIN, skip rate limiting
  if (plan === 'ADMIN') return next();

  const key = `rate:${userId}`;
  const current = await redisClient.get(key);
  const count = current ? parseInt(current) : 0;

  if (count >= limit) {
    // Log blocked request
    await Analytics.create({
      userId,
      endpoint: req.path,
      method: req.method,
      status: 429,
      ipAddress: req.ip,
      blocked: true,
    });
    return res.status(429).json({ message: 'Too Many Requests' });
  }

  // Increment counter with TTL (60 seconds)
  await redisClient.multi()
    .incr(key)
    .expire(key, 60)
    .exec();

  // Log successful request
  await Analytics.create({
    userId,
    endpoint: req.path,
    method: req.method,
    status: 200,
    ipAddress: req.ip,
    blocked: false,
  });

  next();
};

module.exports = rateLimiter;