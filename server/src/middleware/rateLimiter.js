// server/src/middleware/rateLimiter.js
const redisClient = require('../config/redis');
const Analytics = require('../models/Analytics');
const { PLAN_LIMITS, RATE_LIMIT } = require('../config/constants');

const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])

  local current = redis.call('GET', key)
  if current == false then
    redis.call('SET', key, 1, 'EX', window)
    return 1
  end

  current = tonumber(current)
  if current >= limit then
    return -1
  end

  local new_count = redis.call('INCR', key)
  return new_count
`;

const rateLimiter = async (req, res, next) => {
  // ✅ Keep existing check - if no user, skip (auth middleware should run before)
  if (!req.user) {
    console.warn('⚠️ No user found in rate limiter - auth middleware may be missing');
    return next();
  }

  const userId = req.user.id;
  const plan = req.user.plan || 'FREE';

  // ✅ Get limit from centralized config
  const limit = PLAN_LIMITS[plan] || 20;

  // ✅ If ADMIN, skip rate limiting (existing feature)
  if (plan === 'ADMIN' || limit === Infinity) {
    console.log(`👑 Admin access: ${req.user.email} - skipping rate limit`);
    return next();
  }

  const key = `${RATE_LIMIT.REDIS_KEY_PREFIX || 'rate:'}${userId}`;
  const windowSeconds = Math.floor(RATE_LIMIT.WINDOW_MS / 1000) || 60;

  try {
    const result = await redisClient.eval(RATE_LIMIT_SCRIPT, {
      keys: [key],
      arguments: [limit, windowSeconds],
    });

    const count = parseInt(result, 10);

    // ✅ Count is -1 when rate limited (maintains existing behavior)
    if (count === -1) {
      // ✅ Log blocked request (existing feature)
      await Analytics.create({
        userId,
        endpoint: req.path,
        method: req.method,
        status: 429,
        ipAddress: req.ip || req.connection.remoteAddress,
        blocked: true,
      });

      console.log(`🚫 Rate limit exceeded for user ${userId} (${plan} plan, limit: ${limit})`);

      res.setHeader('Retry-After', windowSeconds);
      return res.status(429).json({
        success: false,
        message: 'Too Many Requests',
        retryAfter: windowSeconds,
        limit,
        remaining: 0,
      });
    }

    await Analytics.create({
      userId,
      endpoint: req.path,
      method: req.method,
      status: 200,
      ipAddress: req.ip || req.connection.remoteAddress,
      blocked: false,
    });

    const remaining = Math.max(0, limit - count);
    const resetTime = Math.floor(Date.now() / 1000) + windowSeconds;

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    console.log(`✅ Request allowed: ${userId} (${count}/${limit})`);

    next();
  } catch (err) {
    console.error('❌ Rate limiter error:', err.message);
    // ✅ On Redis error, allow the request (fail open - maintains existing behavior)
    next();
  }
};

module.exports = rateLimiter;