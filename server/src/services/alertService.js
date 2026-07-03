// server/src/services/alertService.js
const { AlertRule, AlertLog } = require('../models/Alert');
const Analytics = require('../models/Analytics');
const App = require('../models/App');
const axios = require('axios');

class AlertService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
    this.rulesCache = [];
    this.lastCacheUpdate = null;
  }

  start(intervalMs = 30000) {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => this.checkAllRules(), intervalMs);
    console.log('✅ Alert service started (interval: ' + intervalMs + 'ms)');
    // Run initial check immediately
    setTimeout(() => this.checkAllRules(), 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('⏹️ Alert service stopped');
  }

  async checkAllRules() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Refresh rules cache if needed (every 60 seconds)
      if (!this.rulesCache.length || !this.lastCacheUpdate || 
          Date.now() - this.lastCacheUpdate > 60000) {
        this.rulesCache = await AlertRule.find({ enabled: true });
        this.lastCacheUpdate = Date.now();
        console.log(`📋 Loaded ${this.rulesCache.length} alert rules`);
      }

      if (this.rulesCache.length === 0) {
        this.isRunning = false;
        return;
      }

      // Get current metrics
      const metrics = await this.collectMetrics();

      for (const rule of this.rulesCache) {
        await this.checkRule(rule, metrics);
      }
    } catch (err) {
      console.error('❌ Alert check error:', err);
    } finally {
      this.isRunning = false;
    }
  }

  async collectMetrics() {
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - 5); // Last 5 minutes

    const metrics = {
      requests: {},
      blocked: {},
      responseTime: {},
      users: {},
      apps: {}
    };

    try {
      // Get all apps
      const apps = await App.find({ status: 'active' });
      const appNames = apps.map(a => a.name);
      
      // If no apps registered, use default
      if (appNames.length === 0) {
        appNames.push('rateguard');
      }

      // Collect metrics for each app
      for (const appName of appNames) {
        const analytics = await Analytics.find({
          app: appName,
          timestamp: { $gte: startTime }
        });

        const total = analytics.length;
        const blocked = analytics.filter(a => a.blocked).length;
        const avgResponseTime = analytics.reduce((sum, a) => sum + (a.responseTime || 0), 0) / (total || 1);

        metrics.requests[appName] = total;
        metrics.blocked[appName] = blocked;
        metrics.responseTime[appName] = Math.round(avgResponseTime);
        
        // Unique users
        const users = new Set(analytics.map(a => a.userId?.toString()));
        metrics.users[appName] = users.size;
      }

      // Aggregate totals
      metrics.requests.total = Object.values(metrics.requests).reduce((a, b) => a + b, 0);
      metrics.blocked.total = Object.values(metrics.blocked).reduce((a, b) => a + b, 0);
      
      // Overall avg response time
      const allResponseTimes = Object.values(metrics.responseTime).filter(v => v > 0);
      metrics.responseTime.total = allResponseTimes.length > 0 
        ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length) 
        : 0;

      // App list
      metrics.apps = appNames;

    } catch (err) {
      console.error('❌ Error collecting metrics:', err);
    }

    return metrics;
  }

  async checkRule(rule, metrics) {
    try {
      const targetApp = rule.condition.app === 'all' ? 'total' : rule.condition.app;
      const metricData = metrics[rule.condition.metric];
      
      if (!metricData) {
        console.warn(`⚠️ Metric "${rule.condition.metric}" not found for rule "${rule.name}"`);
        return;
      }

      const value = metricData[targetApp] || 0;
      
      const isTriggered = this.evaluateCondition(value, rule.condition.operator, rule.condition.value);

      if (isTriggered) {
        await this.triggerAlert(rule, { 
          value, 
          metric: rule.condition.metric, 
          app: targetApp,
          threshold: rule.condition.value
        });
      }
    } catch (err) {
      console.error(`❌ Error checking rule "${rule.name}":`, err);
    }
  }

  evaluateCondition(value, operator, threshold) {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  async triggerAlert(rule, data) {
    // Check cooldown
    if (rule.lastTriggered) {
      const cooldownMs = (rule.cooldownSeconds || 300) * 1000;
      if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
        console.log(`⏳ Alert "${rule.name}" in cooldown (${rule.cooldownSeconds}s)`);
        return;
      }
    }

    const message = this.buildAlertMessage(rule, data);
    
    // Create alert log
    const log = new AlertLog({
      ruleId: rule._id,
      ruleName: rule.name,
      severity: rule.severity,
      message: message,
      data: data,
      triggeredAt: new Date()
    });
    await log.save();

    // Update rule
    rule.lastTriggered = new Date();
    await rule.save();

    console.log(`🔔 Alert triggered: ${rule.name} (${rule.severity}) - ${message}`);

    // Send to WebSocket
    if (global.wsService) {
      global.wsService.broadcast({
        type: 'alert',
        data: {
          id: log._id,
          ruleId: rule._id,
          ruleName: rule.name,
          severity: rule.severity,
          message: message,
          timestamp: log.triggeredAt,
          data: data
        }
      }, 'alerts');
    }

    // Execute actions
    await this.executeActions(rule, log);

    return log;
  }

  buildAlertMessage(rule, data) {
    const metric = data.metric || 'requests';
    const value = data.value || 0;
    const threshold = data.threshold || rule.condition.value;
    const app = data.app === 'total' ? 'all apps' : data.app;
    
    return `${rule.name}: ${metric} is ${value} (threshold: ${threshold}) on ${app}`;
  }

  async executeActions(rule, log) {
    const promises = [];

    // Dashboard alert (always enabled)
    promises.push(Promise.resolve());

    // Email alert
    if (rule.actions?.email) {
      promises.push(this.sendEmailAlert(rule, log).catch(e => 
        console.error('❌ Email alert failed:', e.message)
      ));
    }

    // Slack alert
    if (rule.actions?.slack) {
      promises.push(this.sendSlackAlert(rule, log).catch(e => 
        console.error('❌ Slack alert failed:', e.message)
      ));
    }

    // Webhook
    if (rule.actions?.webhook && rule.webhookUrl) {
      promises.push(this.sendWebhookAlert(rule, log).catch(e => 
        console.error('❌ Webhook alert failed:', e.message)
      ));
    }

    await Promise.allSettled(promises);
  }

  async sendEmailAlert(rule, log) {
    // TODO: Implement email sending with nodemailer
    console.log(`📧 [EMAIL] Alert: ${rule.name} - ${log.message}`);
    // Example with nodemailer:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({...});
  }

  async sendSlackAlert(rule, log) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('💬 [SLACK] Webhook URL not configured');
      return;
    }

    try {
      await axios.post(webhookUrl, {
        text: `🚨 *${rule.severity.toUpperCase()}*: ${rule.name}\n${log.message}`,
        attachments: [{
          color: rule.severity === 'critical' ? '#ff0000' : 
                 rule.severity === 'warning' ? '#ffa500' : '#0088ff',
          fields: [
            { title: 'Severity', value: rule.severity, short: true },
            { title: 'Time', value: new Date().toISOString(), short: true },
            { title: 'Details', value: JSON.stringify(log.data, null, 2), short: false }
          ]
        }]
      });
      console.log(`💬 [SLACK] Alert sent: ${rule.name}`);
    } catch (err) {
      console.error('❌ Slack webhook failed:', err.message);
    }
  }

  async sendWebhookAlert(rule, log) {
    try {
      await axios.post(rule.webhookUrl, {
        alert: {
          id: log._id,
          rule: rule.name,
          severity: rule.severity,
          message: log.message,
          data: log.data,
          timestamp: log.triggeredAt
        }
      }, {
        timeout: 5000
      });
      console.log(`🌐 [WEBHOOK] Alert sent: ${rule.name}`);
    } catch (err) {
      console.error('❌ Webhook failed:', err.message);
    }
  }

  async getActiveAlerts() {
    return await AlertLog.find({ resolved: false })
      .sort({ triggeredAt: -1 })
      .limit(50)
      .populate('ruleId', 'name severity');
  }

  async getAlertHistory(limit = 100) {
    return await AlertLog.find()
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .populate('ruleId', 'name severity');
  }

  async resolveAlert(alertId) {
    const alert = await AlertLog.findById(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      await alert.save();
      
      if (global.wsService) {
        global.wsService.broadcast({
          type: 'alertResolved',
          data: { 
            alertId: alert._id,
            ruleName: alert.ruleName,
            resolvedAt: alert.resolvedAt
          }
        }, 'alerts');
      }
      
      console.log(`✅ Alert resolved: ${alert.ruleName}`);
      return true;
    }
    return false;
  }

  async getStats() {
    const total = await AlertLog.countDocuments();
    const active = await AlertLog.countDocuments({ resolved: false });
    const critical = await AlertLog.countDocuments({ severity: 'critical', resolved: false });
    const warning = await AlertLog.countDocuments({ severity: 'warning', resolved: false });
    
    return {
      total,
      active,
      critical,
      warning,
      info: total - active - critical - warning
    };
  }
}

module.exports = AlertService;