const buildAlertSummary = (data = {}) => {
  const alerts = [];
  const requests = data.requests?.today || {};
  const blockRate = Number(requests.blockRate ?? 0);

  if (blockRate > 10) {
    alerts.push({
      id: 'high-block-rate',
      title: 'High block rate',
      severity: 'warning',
      message: `Block rate reached ${blockRate}% today.`,
    });
  }

  if (requests.total > 1000) {
    alerts.push({
      id: 'traffic-spike',
      title: 'Traffic spike',
      severity: 'info',
      message: `${requests.total} requests were recorded today.`,
    });
  }

  if (data.health?.status === 'degraded') {
    alerts.push({
      id: 'service-degraded',
      title: 'Service degraded',
      severity: 'critical',
      message: 'One or more critical services are degraded.',
    });
  }

  return alerts;
};

const buildPredictiveInsights = (hourlyTrend = []) => {
  const values = hourlyTrend.map((item) => Number(item.requests || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = hourlyTrend.reduce((best, current) => {
    if (!best) return current;
    return Number(current.requests || 0) > Number(best.requests || 0) ? current : best;
  }, null);

  const peakVolume = Number(peak?.requests || 0);
  const forecastBase = Math.max(peakVolume, Math.round(total / Math.max(1, hourlyTrend.length)));

  return {
    predictedRequests: Math.max(0, Math.round(forecastBase * 1.5)),
    peakHour: peak?.hour ?? 0,
    recommendedLimit: Math.max(100, Math.round(forecastBase * 1.8)),
  };
};

module.exports = {
  buildAlertSummary,
  buildPredictiveInsights,
};
