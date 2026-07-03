// server/src/models/Alert.js
const mongoose = require('mongoose');

const alertRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['threshold', 'spike', 'anomaly', 'downtime'],
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'critical'],
    default: 'warning' 
  },
  condition: {
    metric: { type: String, required: true }, // 'requests', 'blocked', 'responseTime'
    operator: { type: String, enum: ['gt', 'lt', 'gte', 'lte', 'eq'], required: true },
    value: { type: Number, required: true },
    timeWindow: { type: Number, default: 300 }, // seconds
    app: { type: String, default: 'all' } // 'all' or specific app name
  },
  enabled: { type: Boolean, default: true },
  actions: {
    email: { type: Boolean, default: false },
    slack: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false },
    dashboard: { type: Boolean, default: true }
  },
  webhookUrl: { type: String },
  cooldownSeconds: { type: Number, default: 300 },
  lastTriggered: { type: Date },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const alertLogSchema = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertRule' },
  ruleName: { type: String },
  severity: { type: String },
  message: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  triggeredAt: { type: Date, default: Date.now }
});

const AlertRule = mongoose.model('AlertRule', alertRuleSchema);
const AlertLog = mongoose.model('AlertLog', alertLogSchema);

module.exports = { AlertRule, AlertLog };