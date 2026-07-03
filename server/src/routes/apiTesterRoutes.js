const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const rateLimiter = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const buildRequestConfig = ({ url, method, headers, body }) => ({
  method,
  url,
  headers: {
    'User-Agent': 'RateGuard-Tester',
    'Content-Type': 'application/json',
    ...headers,
  },
  ...(body ? { data: body } : {}),
  validateStatus: () => true,
});

router.post(
  '/tester/test',
  auth,
  adminOnly,
  rateLimiter,
  [
    body('url').isURL().withMessage('Valid URL is required'),
    body('method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Valid HTTP method is required'),
    body('requestsPerMinute').isInt({ min: 1, max: 1000 }).withMessage('requestsPerMinute must be between 1 and 1000'),
    body('duration').isInt({ min: 5, max: 300 }).withMessage('duration must be between 5 and 300 seconds'),
    body('concurrent').isInt({ min: 1, max: 50 }).withMessage('concurrent must be between 1 and 50'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        url,
        method = 'GET',
        headers = {},
        body: requestBody = null,
        requestsPerMinute = 20,
        duration = 30,
        concurrent = 5,
      } = req.body;

      const intervalMs = Math.max(1, Math.floor(60000 / requestsPerMinute));
      const startTime = Date.now();
      let requestCount = 0;
      let successCount = 0;
      let failureCount = 0;
      let rateLimitedCount = 0;
      const responseTimes = [];
      const statusCodes = {};
      const timeline = [];

      const worker = async (workerIndex) => {
        while (Date.now() - startTime < duration * 1000) {
          const requestStart = Date.now();
          try {
            const response = await axios(buildRequestConfig({
              url,
              method,
              headers,
              body: requestBody,
            }));

            const responseTime = Date.now() - requestStart;
            requestCount += 1;
            responseTimes.push(responseTime);

            const statusCode = response.status.toString();
            statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

            if (response.status === 429) {
              rateLimitedCount += 1;
              failureCount += 1;
            } else if (response.status >= 200 && response.status < 300) {
              successCount += 1;
            } else {
              failureCount += 1;
            }

            timeline.push({
              timestamp: new Date().toISOString(),
              status: response.status,
              responseTime,
              success: response.status < 400 && response.status !== 429,
            });
          } catch (error) {
            failureCount += 1;
            timeline.push({
              timestamp: new Date().toISOString(),
              status: 'ERR',
              responseTime: Date.now() - requestStart,
              success: false,
              error: error.message,
            });
          }

          await new Promise((resolve) => setTimeout(resolve, intervalMs / concurrent));
        }
      };

      await Promise.all(Array.from({ length: concurrent }, (_, index) => worker(index)));

      const totalTimeSeconds = Math.max(1, (Date.now() - startTime) / 1000);
      const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

      const results = {
        summary: {
          totalRequests: requestCount,
          successCount,
          failureCount,
          rateLimitedCount,
          successRate: requestCount > 0 ? Number((successCount / requestCount * 100).toFixed(2)) : 0,
          duration: Number(totalTimeSeconds.toFixed(2)),
          requestsPerSecond: Number((requestCount / totalTimeSeconds).toFixed(2)),
          concurrent,
          targetRPM: requestsPerMinute,
        },
        performance: {
          avgResponseTime: Math.round(avgResponseTime),
          minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
          maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
          p95ResponseTime: Math.round(p95),
          p99ResponseTime: Math.round(p99),
        },
        statusCodes,
        timeline: timeline.slice(-100),
        timestamp: new Date().toISOString(),
        target: {
          url,
          method,
          headers: Object.keys(headers),
        },
      };

      res.json({ success: true, data: results });
    } catch (err) {
      console.error('❌ API Tester error:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
