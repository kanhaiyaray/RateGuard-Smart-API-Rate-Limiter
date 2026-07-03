// server/src/services/predictiveAnalytics.js
const Analytics = require('../models/Analytics');
const App = require('../models/App');

class PredictiveAnalytics {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300; // 5 minutes
  }

  async predictUsage(appName, days = 7) {
    const cacheKey = `predict:${appName}:${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 1000) {
      console.log(`📊 Using cached predictions for ${appName}`);
      return cached.data;
    }

    try {
      // Get historical data
      const historicalData = await this.getHistoricalData(appName, days * 2);
      
      // Calculate predictions
      const predictions = this.calculatePredictions(historicalData, days);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: predictions,
        timestamp: Date.now()
      });

      console.log(`📊 Predictions generated for ${appName}`);
      return predictions;
    } catch (err) {
      console.error('❌ Prediction error:', err);
      return this.getDefaultPrediction();
    }
  }

  async getHistoricalData(appName, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get app names if 'all'
    let appNames = [];
    if (appName === 'all') {
      const apps = await App.find({ status: 'active' });
      appNames = apps.map(a => a.name);
      if (appNames.length === 0) appNames = ['rateguard'];
    } else {
      appNames = [appName];
    }

    const query = {
      app: { $in: appNames },
      timestamp: { $gte: startDate }
    };

    const data = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          requests: { $sum: 1 },
          blocked: { $sum: { $cond: ['$blocked', 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    return data;
  }

  calculatePredictions(data, days) {
    if (data.length === 0) {
      return this.getDefaultPrediction();
    }

    // Extract values
    const requests = data.map(d => d.requests);
    const blocked = data.map(d => d.blocked);
    const responseTimes = data.map(d => d.avgResponseTime || 0);

    // Calculate trends
    const requestTrend = this.calculateTrend(requests);
    const blockedTrend = this.calculateTrend(blocked);
    const responseTrend = this.calculateTrend(responseTimes);

    // Calculate seasonality
    const seasonality = this.calculateSeasonality(data);

    // Find peak hours
    const peakHour = this.findPeakHour(data);

    // Get recent average
    const recentAvg = requests.slice(-Math.min(24, requests.length));
    const avgRequests = recentAvg.reduce((a, b) => a + b, 0) / (recentAvg.length || 1);

    // Predict future values
    const predictedRequests = Math.round(Math.max(avgRequests * 1.2, requestTrend * days * 1.1));
    const predictedBlocked = Math.round(Math.max(predictedRequests * 0.05, blockedTrend * days * 1.1));
    const predictedResponseTime = Math.round(Math.max(100, responseTrend * 1.05));

    return {
      predictedRequests,
      predictedBlocked,
      predictedResponseTime,
      peakHour,
      seasonality,
      trends: {
        requests: Math.round(requestTrend * 100) / 100,
        blocked: Math.round(blockedTrend * 100) / 100,
        responseTime: Math.round(responseTrend * 100) / 100
      },
      confidence: this.calculateConfidence(data),
      recommendations: this.generateRecommendations({
        predictedRequests,
        predictedBlocked,
        peakHour,
        trends: { requests: requestTrend }
      }),
      currentAverage: Math.round(avgRequests),
      dataPoints: data.length
    };
  }

  calculateTrend(values) {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    // Linear regression
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - (n-1)/2) * (values[i] - mean);
      denominator += (i - (n-1)/2) ** 2;
    }
    
    return denominator !== 0 ? numerator / denominator : 0;
  }

  calculateSeasonality(data) {
    const hourlyAverages = {};
    for (const item of data) {
      const hour = item._id.hour;
      if (!hourlyAverages[hour]) {
        hourlyAverages[hour] = { total: 0, count: 0 };
      }
      hourlyAverages[hour].total += item.requests;
      hourlyAverages[hour].count += 1;
    }

    const seasonality = {};
    for (const [hour, avg] of Object.entries(hourlyAverages)) {
      seasonality[hour] = Math.round(avg.total / avg.count);
    }

    return seasonality;
  }

  findPeakHour(data) {
    const hourlyTotals = {};
    for (const item of data) {
      const hour = item._id.hour;
      if (!hourlyTotals[hour]) {
        hourlyTotals[hour] = 0;
      }
      hourlyTotals[hour] += item.requests;
    }

    let peakHour = 0;
    let peakValue = 0;
    for (const [hour, total] of Object.entries(hourlyTotals)) {
      if (total > peakValue) {
        peakValue = total;
        peakHour = parseInt(hour);
      }
    }

    return peakHour;
  }

  calculateConfidence(data) {
    if (data.length < 7) return 'low';
    if (data.length < 14) return 'medium';
    if (data.length < 30) return 'high';
    return 'very high';
  }

  generateRecommendations(predictions) {
    const recommendations = [];
    
    if (predictions.predictedRequests > 10000) {
      recommendations.push({
        type: 'scale',
        severity: 'high',
        message: `🚀 Expected traffic spike: ${predictions.predictedRequests} requests. Consider scaling resources.`
      });
    } else if (predictions.predictedRequests > 5000) {
      recommendations.push({
        type: 'scale',
        severity: 'medium',
        message: `📈 Moderate traffic increase predicted: ${predictions.predictedRequests} requests. Monitor resources.`
      });
    }

    if (predictions.trends.requests > 0.2) {
      recommendations.push({
        type: 'optimize',
        severity: 'medium',
        message: '📊 Positive growth trend detected. Optimize rate limits for upcoming demand.'
      });
    }

    if (predictions.predictedBlocked > 100) {
      recommendations.push({
        type: 'security',
        severity: 'high',
        message: `🔒 High blocked requests predicted (${predictions.predictedBlocked}). Review rate limit policies.`
      });
    }

    if (predictions.peakHour >= 9 && predictions.peakHour <= 17) {
      recommendations.push({
        type: 'peak',
        severity: 'low',
        message: `🕐 Peak hour at ${predictions.peakHour}:00. Ensure enough capacity during business hours.`
      });
    }

    return recommendations;
  }

  getDefaultPrediction() {
    return {
      predictedRequests: 100,
      predictedBlocked: 5,
      predictedResponseTime: 100,
      peakHour: 12,
      seasonality: {},
      trends: { requests: 0, blocked: 0, responseTime: 0 },
      confidence: 'low',
      currentAverage: 0,
      dataPoints: 0,
      recommendations: [{
        type: 'setup',
        severity: 'low',
        message: '📊 Not enough data for predictions. Continue collecting data for better insights.'
      }]
    };
  }

  async detectAnomalies(appName, period = '1d') {
    const data = await this.getHistoricalData(appName, 1);
    const requests = data.map(d => d.requests);
    
    if (requests.length < 10) return [];

    const mean = requests.reduce((a, b) => a + b, 0) / requests.length;
    const variance = requests.reduce((a, b) => a + (b - mean) ** 2, 0) / requests.length;
    const stdDev = Math.sqrt(variance);
    
    const anomalies = [];
    for (let i = 0; i < data.length; i++) {
      const deviation = stdDev > 0 ? (data[i].requests - mean) / stdDev : 0;
      if (Math.abs(deviation) > 3) {
        const hour = data[i]._id.hour;
        anomalies.push({
          timestamp: `${data[i]._id.year}-${String(data[i]._id.month).padStart(2,'0')}-${String(data[i]._id.day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:00`,
          value: data[i].requests,
          deviation: Math.round(deviation * 100) / 100,
          type: deviation > 0 ? 'spike' : 'drop',
          severity: Math.abs(deviation) > 5 ? 'critical' : 'warning'
        });
      }
    }

    return anomalies;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Predictive analytics cache cleared');
  }
}

module.exports = new PredictiveAnalytics();