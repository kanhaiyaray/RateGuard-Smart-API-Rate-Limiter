/**
 * Centralized configuration reading from environment variables
 * All sensitive values come from .env, not hardcoded
 */

// ============ HELPER FUNCTIONS ============

/**
 * Parse plan limits from environment variables
 * Supports numeric values and 'Infinity' string
 */
const getPlanLimit = (key, defaultValue) => {
  const value = process.env[key];
  if (value === 'Infinity' || value === 'infinity') return Infinity;
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse seconds from environment and convert to milliseconds
 */
const getSecondsInMs = (key, defaultValue) => {
  const value = parseInt(process.env[key]);
  return isNaN(value) ? defaultValue * 1000 : value * 1000;
};

/**
 * Parse environment variable with fallback
 */
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
};

/**
 * Parse integer from environment with fallback
 */
const getEnvInt = (key, defaultValue) => {
  const value = parseInt(process.env[key]);
  return isNaN(value) ? defaultValue : value;
};

/**
 * Parse boolean from environment with fallback
 */
const getEnvBool = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

/**
 * Parse array from environment variable (comma-separated)
 */
const getEnvArray = (key, defaultValue) => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

// ============ EXPORT CONFIGURATION ============

const config = {
  // ============ SERVER CONFIGURATION ============
  SERVER: {
    PORT: getEnvInt('PORT', 5000),
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),
    API_URL: getEnv('API_URL', 'http://localhost:5000'),
    API_VERSION: getEnv('API_VERSION', 'v1'),
    BASE_PATH: getEnv('BASE_PATH', '/api'),
  },

  // ============ CORS ORIGINS ============
  ALLOWED_ORIGINS: getEnvArray('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://client:3000',
    'http://client:5173',
    'http://server:3000',
    'http://server:5173',
  ]),

  // ============ PLAN LIMITS (from .env) ============
  PLAN_LIMITS: {
    FREE: getPlanLimit('FREE_LIMIT', 20),
    PREMIUM: getPlanLimit('PREMIUM_LIMIT', 200),
    ADMIN: getPlanLimit('ADMIN_LIMIT', Infinity),
  },

  // ============ VALID PLANS ============
  VALID_PLANS: ['FREE', 'PREMIUM', 'ADMIN'],

  // ============ VALID ROLES ============
  VALID_ROLES: ['user', 'admin'],

  // ============ RATE LIMITING (from .env) ============
  RATE_LIMIT: {
    WINDOW_MS: getSecondsInMs('RATE_WINDOW_SECONDS', 60),
    REDIS_KEY_PREFIX: getEnv('REDIS_KEY_PREFIX', 'rate:'),
    AUTH_WINDOW_MS: getSecondsInMs('AUTH_WINDOW_SECONDS', 900),
    AUTH_MAX_ATTEMPTS: getEnvInt('AUTH_MAX_ATTEMPTS', 5),
    GENERAL_MAX_REQUESTS: getEnvInt('GENERAL_MAX_REQUESTS', 100),
    ADMIN_MAX_REQUESTS: getEnvInt('ADMIN_MAX_REQUESTS', 1000),
    RETRY_AFTER_SECONDS: getEnvInt('RETRY_AFTER_SECONDS', 60),
  },

  // ============ JWT CONFIGURATION ============
  JWT: {
    SECRET: getEnv('JWT_SECRET', ''),
    EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
    COOKIE_MAX_AGE: getEnvInt('JWT_COOKIE_MAX_AGE', 7 * 24 * 60 * 60 * 1000),
    COOKIE_SECURE: getEnvBool('JWT_COOKIE_SECURE', false),
    COOKIE_HTTP_ONLY: getEnvBool('JWT_COOKIE_HTTP_ONLY', true),
    COOKIE_SAME_SITE: getEnv('JWT_COOKIE_SAME_SITE', 'lax'),
  },

  // ============ DATABASE CONFIGURATION ============
  DATABASE: {
    MONGODB_URI: getEnv('MONGODB_URI', 'mongodb://localhost:27017/rate-limiter'),
    MONGODB_OPTIONS: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: getEnvInt('MONGODB_POOL_SIZE', 10),
      serverSelectionTimeoutMS: getEnvInt('MONGODB_TIMEOUT_MS', 5000),
      socketTimeoutMS: getEnvInt('MONGODB_SOCKET_TIMEOUT_MS', 45000),
    },
    REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),
    REDIS_RETRY_ATTEMPTS: getEnvInt('REDIS_RETRY_ATTEMPTS', 3),
    REDIS_RETRY_DELAY_MS: getEnvInt('REDIS_RETRY_DELAY_MS', 1000),
  },

  // ============ CACHE CONFIGURATION ============
  CACHE: {
    DASHBOARD_TTL: getEnvInt('DASHBOARD_CACHE_TTL', 10),
    TOP_USERS_TTL: getEnvInt('TOP_USERS_CACHE_TTL', 10),
    REDIS_KEY_TTL: getEnvInt('REDIS_KEY_TTL', 60), // Rate limit window in seconds
    ADMIN_STATS_TTL: getEnvInt('ADMIN_STATS_CACHE_TTL', 30),
  },

  // ============ LOGGING ============
  LOGGING: {
    LEVEL: getEnv('LOG_LEVEL', 'info'),
    ENABLE_CONSOLE: getEnvBool('LOG_ENABLE_CONSOLE', true),
    ENABLE_FILE: getEnvBool('LOG_ENABLE_FILE', false),
    FILE_PATH: getEnv('LOG_FILE_PATH', './logs/app.log'),
    MAX_FILE_SIZE: getEnv('LOG_MAX_FILE_SIZE', '10m'),
    MAX_FILES: getEnvInt('LOG_MAX_FILES', 5),
  },

  // ============ FEATURE FLAGS ============
  FEATURES: {
    ENABLE_RATE_LIMITING: getEnvBool('ENABLE_RATE_LIMITING', true),
    ENABLE_ANALYTICS: getEnvBool('ENABLE_ANALYTICS', true),
    ENABLE_ADMIN_ROUTES: getEnvBool('ENABLE_ADMIN_ROUTES', true),
    ENABLE_HTTPS: getEnvBool('ENABLE_HTTPS', false),
    ENABLE_DEBUG: getEnvBool('ENABLE_DEBUG', false),
    ENABLE_COMPRESSION: getEnvBool('ENABLE_COMPRESSION', true),
    ENABLE_LOGGING: getEnvBool('ENABLE_LOGGING', true),
  },

  // ============ PAGINATION ============
  PAGINATION: {
    DEFAULT_PAGE: getEnvInt('DEFAULT_PAGE', 1),
    DEFAULT_LIMIT: getEnvInt('DEFAULT_LIMIT', 10),
    MAX_LIMIT: getEnvInt('MAX_LIMIT', 100),
  },

  // ============ SECURITY ============
  SECURITY: {
    BCRYPT_ROUNDS: getEnvInt('BCRYPT_ROUNDS', 10),
    SESSION_TIMEOUT: getSecondsInMs('SESSION_TIMEOUT_SECONDS', 3600),
    MAX_LOGIN_ATTEMPTS: getEnvInt('MAX_LOGIN_ATTEMPTS', 5),
    LOCKOUT_DURATION: getSecondsInMs('LOCKOUT_DURATION_SECONDS', 900),
    PASSWORD_MIN_LENGTH: getEnvInt('PASSWORD_MIN_LENGTH', 6),
    PASSWORD_REGEX: getEnv('PASSWORD_REGEX', '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{6,}$'),
  },

  // ============ API CONFIGURATION ============
  API: {
    RATE_LIMIT_MESSAGE: getEnv('RATE_LIMIT_MESSAGE', 'Too Many Requests'),
    AUTH_ERROR_MESSAGE: getEnv('AUTH_ERROR_MESSAGE', 'Invalid credentials'),
    SERVER_ERROR_MESSAGE: getEnv('SERVER_ERROR_MESSAGE', 'Internal Server Error'),
    NOT_FOUND_MESSAGE: getEnv('NOT_FOUND_MESSAGE', 'Resource not found'),
  },

  // ============ TIME CONSTANTS ============
  TIME: {
    ONE_SECOND: 1000,
    ONE_MINUTE: 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000,
    ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  },
};

// ============ VALIDATION FUNCTION ============

/**
 * Validates that all required environment variables are set
 * Call this during startup to catch missing config early
 */
const validateConfig = () => {
  console.log('🔍 Validating environment variables...');

  const requiredVars = [
    'MONGODB_URI',
    'REDIS_URL',
    'JWT_SECRET',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please check your .env file');
    console.error('   Example: cp .env.example .env');
    return false;
  }

  // Check for optional but recommended variables
  const recommendedVars = [
    'FREE_LIMIT',
    'PREMIUM_LIMIT',
    'ADMIN_LIMIT',
    'RATE_WINDOW_SECONDS',
    'AUTH_WINDOW_SECONDS',
  ];

  const missingRecommended = recommendedVars.filter(key => !process.env[key]);

  if (missingRecommended.length > 0) {
    console.warn('⚠️ Optional environment variables not set (using defaults):');
    missingRecommended.forEach(key => console.warn(`   - ${key}`));
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn('⚠️ JWT_SECRET is too short (minimum 32 characters recommended for production)');
  }

  console.log('✅ All required environment variables are set');
  return true;
};

// ============ CONFIGURATION SUMMARY FUNCTION ============

/**
 * Returns a summary of the current configuration (without exposing secrets)
 */
const getConfigSummary = () => {
  const { PLAN_LIMITS, RATE_LIMIT, SERVER, FEATURES, SECURITY, CACHE, JWT, LOGGING } = config;

  return {
    environment: SERVER.NODE_ENV,
    port: SERVER.PORT,
    frontendUrl: SERVER.FRONTEND_URL,
    apiVersion: SERVER.API_VERSION,
    planLimits: {
      FREE: PLAN_LIMITS.FREE === Infinity ? 'Infinity' : PLAN_LIMITS.FREE,
      PREMIUM: PLAN_LIMITS.PREMIUM === Infinity ? 'Infinity' : PLAN_LIMITS.PREMIUM,
      ADMIN: PLAN_LIMITS.ADMIN === Infinity ? 'Infinity' : PLAN_LIMITS.ADMIN,
    },
    rateLimit: {
      windowSeconds: RATE_LIMIT.WINDOW_MS / 1000,
      authWindowSeconds: RATE_LIMIT.AUTH_WINDOW_MS / 1000,
      authMaxAttempts: RATE_LIMIT.AUTH_MAX_ATTEMPTS,
      generalMaxRequests: RATE_LIMIT.GENERAL_MAX_REQUESTS,
      adminMaxRequests: RATE_LIMIT.ADMIN_MAX_REQUESTS,
      retryAfterSeconds: RATE_LIMIT.RETRY_AFTER_SECONDS,
    },
    cache: {
      dashboardTTL: CACHE.DASHBOARD_TTL,
      topUsersTTL: CACHE.TOP_USERS_TTL,
      adminStatsTTL: CACHE.ADMIN_STATS_TTL,
      redisKeyTTL: CACHE.REDIS_KEY_TTL,
    },
    jwt: {
      expiresIn: JWT.EXPIRES_IN,
      cookieSecure: JWT.COOKIE_SECURE,
      cookieHttpOnly: JWT.COOKIE_HTTP_ONLY,
      cookieSameSite: JWT.COOKIE_SAME_SITE,
    },
    security: {
      bcryptRounds: SECURITY.BCRYPT_ROUNDS,
      sessionTimeout: SECURITY.SESSION_TIMEOUT / 1000 + ' seconds',
      maxLoginAttempts: SECURITY.MAX_LOGIN_ATTEMPTS,
      lockoutDuration: SECURITY.LOCKOUT_DURATION / 1000 + ' seconds',
      passwordMinLength: SECURITY.PASSWORD_MIN_LENGTH,
    },
    features: FEATURES,
    logging: {
      level: LOGGING.LEVEL,
      consoleEnabled: LOGGING.ENABLE_CONSOLE,
      fileEnabled: LOGGING.ENABLE_FILE,
      maxFiles: LOGGING.MAX_FILES,
    },
  };
};

// ============ ENVIRONMENT CHECK FUNCTIONS ============

/**
 * Check if running in production environment
 */
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in development environment
 */
const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if running in test environment
 */
const isTest = () => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Check if debug mode is enabled
 */
const isDebug = () => {
  return config.FEATURES.ENABLE_DEBUG || process.env.DEBUG === 'true';
};

/**
 * Get current environment name
 */
const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

// ============ EXPORT MODULE ============

// Export all configuration
module.exports = config;

// Export helper functions
module.exports.validateConfig = validateConfig;
module.exports.getConfigSummary = getConfigSummary;
module.exports.isProduction = isProduction;
module.exports.isDevelopment = isDevelopment;
module.exports.isTest = isTest;
module.exports.isDebug = isDebug;
module.exports.getEnvironment = getEnvironment;

// Export specific sections for convenience
module.exports.SERVER = config.SERVER;
module.exports.ALLOWED_ORIGINS = config.ALLOWED_ORIGINS;
module.exports.PLAN_LIMITS = config.PLAN_LIMITS;
module.exports.VALID_PLANS = config.VALID_PLANS;
module.exports.VALID_ROLES = config.VALID_ROLES;
module.exports.RATE_LIMIT = config.RATE_LIMIT;
module.exports.JWT = config.JWT;
module.exports.DATABASE = config.DATABASE;
module.exports.CACHE = config.CACHE;
module.exports.LOGGING = config.LOGGING;
module.exports.FEATURES = config.FEATURES;
module.exports.PAGINATION = config.PAGINATION;
module.exports.SECURITY = config.SECURITY;
module.exports.API = config.API;
module.exports.TIME = config.TIME;