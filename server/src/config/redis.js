const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.error('❌ Redis error:', err));
client.on('connect', () => console.log('✅ Redis connected'));

(async () => {
  await client.connect();
})();

module.exports = client;