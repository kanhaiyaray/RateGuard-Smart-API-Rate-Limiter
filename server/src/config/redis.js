// server/src/config/redis.js
const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MAX_RETRIES = parseInt(process.env.REDIS_RETRY_ATTEMPTS, 10) || 10;
const CONNECT_TIMEOUT_MS = parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 10) || 5000;
const KEEP_ALIVE_MS = parseInt(process.env.REDIS_KEEPALIVE_MS, 10) || 30000;

const client = redis.createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: CONNECT_TIMEOUT_MS,
    keepAlive: KEEP_ALIVE_MS,
    reconnectStrategy: (retries) => {
      if (retries > MAX_RETRIES) {
        return new Error('Redis retry limit reached');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

client.on('error', (err) => console.error('❌ Redis error:', err));
client.on('connect', () => console.log('🔌 Redis connecting...'));
client.on('ready', () => console.log('✅ Redis ready'));

// Helper to check if Redis is ready
const isRedisReady = () => client.isReady;

module.exports = client;
module.exports.isRedisReady = isRedisReady;