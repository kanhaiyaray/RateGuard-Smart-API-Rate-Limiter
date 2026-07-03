const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAlertSummary, buildPredictiveInsights } = require('./adminInsights');

test('buildAlertSummary returns warning when block rate is high', () => {
  const alerts = buildAlertSummary({
    requests: {
      today: {
        total: 1000,
        blocked: 140,
        blockRate: 14,
      },
    },
    health: {
      status: 'degraded',
    },
  });

  assert.ok(alerts.some((alert) => alert.severity === 'warning'));
  assert.ok(alerts.some((alert) => alert.title === 'High block rate'));
});

test('buildPredictiveInsights derives a peak hour and forecast', () => {
  const insights = buildPredictiveInsights([
    { hour: 0, requests: 10, blocked: 2 },
    { hour: 12, requests: 120, blocked: 8 },
    { hour: 20, requests: 90, blocked: 6 },
  ]);

  assert.equal(insights.predictedRequests, 180);
  assert.equal(insights.peakHour, 12);
});
