// server/src/app.js (MODIFIED - Only include existing routes)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const activityLogger = require('./middleware/activityLogger');
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const testerRoutes = require('./routes/apiTesterRoutes');

// ✅ NEW - Optional routes (if files exist)
let alertRoutes, appRoutes, reportRoutes, twoFactorRoutes;
try {
  alertRoutes = require('./routes/alertRoutes');
  appRoutes = require('./routes/appRoutes');
  reportRoutes = require('./routes/reportRoutes');
  twoFactorRoutes = require('./routes/twoFactorRoutes');
} catch (err) {
  console.warn('⚠️ Some routes not found, continuing without them:', err.message);
}

const User = require('./models/User');
const ipWhitelist = require('./middleware/ipWhitelist');

const {
  ALLOWED_ORIGINS,
  RATE_LIMIT: RATE_CONFIG,
  FEATURES,
  API,
  SERVER
} = require('./config/constants');

const app = express();

// ============ SECURITY MIDDLEWARE ============
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: "deny" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// ============ CORS CONFIGURATION ============
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin);

    if (!origin) {
      console.log('✅ No origin, allowing');
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked for:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============ ADDITIONAL MIDDLEWARE ============
app.use(cookieParser());
app.use(express.json());

// ============ LOGGING MIDDLEWARE ============
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  console.log(' Origin:', req.headers.origin);
  next();
});

// ============ ADD ACTIVITY LOGGER ============
app.use(activityLogger);

// ============ GLOBAL RATE LIMITERS ============
const authLimiter = rateLimit({
  windowMs: RATE_CONFIG.AUTH_WINDOW_MS,
  max: RATE_CONFIG.AUTH_MAX_ATTEMPTS,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const generalLimiter = rateLimit({
  windowMs: RATE_CONFIG.WINDOW_MS,
  max: RATE_CONFIG.GENERAL_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: RATE_CONFIG.WINDOW_MS,
  max: RATE_CONFIG.ADMIN_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many admin requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ ADMIN AUTH RATE LIMIT BYPASS ============
const adminAuthBypass = async (req, res, next) => {
  const path = req.path.toLowerCase();

  if (path === '/login' && req.method === 'POST') {
    const email = req.body?.email;
    if (email) {
      try {
        const adminUser = await User.findOne({ email, role: 'admin' });
        if (adminUser) {
          console.log('✅ Admin auth bypass enabled for:', email);
          return next();
        }
      } catch (err) {
        console.error('❌ Admin auth bypass lookup failed:', err.message);
      }
    }
  }

  return authLimiter(req, res, next);
};

// ============ APPLY RATE LIMITERS ============
app.use('/api/auth', adminAuthBypass);
app.use('/api/admin', adminLimiter);
app.use('/api/admin', ipWhitelist);

const apiRateLimitFilter = (req, res, next) => {
  const path = req.path.toLowerCase();
  if (path.startsWith('/auth') || path.startsWith('/admin')) {
    return next();
  }
  return generalLimiter(req, res, next);
};

app.use('/api', apiRateLimitFilter);

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', testerRoutes);
app.use('/api', userRoutes);

// ✅ NEW - Only use routes if they were successfully loaded
if (alertRoutes) app.use('/api/alerts', alertRoutes);
if (appRoutes) app.use('/api/apps', appRoutes);
if (reportRoutes) app.use('/api/reports', reportRoutes);
if (twoFactorRoutes) app.use('/api/2fa', twoFactorRoutes);

// ============ HEALTH CHECK ============
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: SERVER.NODE_ENV,
    version: SERVER.API_VERSION,
    services: {
      mongodb: 'connected',
      redis: 'connected'
    },
    features: {
      rateLimiting: FEATURES.ENABLE_RATE_LIMITING,
      analytics: FEATURES.ENABLE_ANALYTICS,
      adminRoutes: FEATURES.ENABLE_ADMIN_ROUTES,
    }
  };

  try {
    const mongoose = require('mongoose');
    const redisClient = require('./config/redis');

    health.services.mongodb = mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected';

    health.services.redis = redisClient.isReady
      ? 'connected'
      : 'disconnected';

    if (health.services.mongodb === 'disconnected' || health.services.redis === 'disconnected') {
      health.status = 'DEGRADED';
    }

    res.json(health);
  } catch (err) {
    health.status = 'ERROR';
    health.error = err.message;
    res.status(503).json(health);
  }
});

// ============ 404 NOT FOUND HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: API.NOT_FOUND_MESSAGE || 'Resource not found',
    path: req.originalUrl
  });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS blocked: Origin not allowed'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
      field: field
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || API.SERVER_ERROR_MESSAGE || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;