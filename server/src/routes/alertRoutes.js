// server/src/routes/alertRoutes.js
const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { validateRequest } = require('../middleware/validate');
const { AlertRule, AlertLog } = require('../models/Alert');

const router = express.Router();

// All routes require admin authentication
router.use(auth);
router.use(adminOnly);

// Get all alert rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await AlertRule.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new alert rule
router.post('/rules', [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['threshold', 'spike', 'anomaly', 'downtime']).withMessage('Invalid type'),
  body('severity').isIn(['info', 'warning', 'critical']).withMessage('Invalid severity'),
  body('condition').isObject().withMessage('Condition is required'),
  body('condition.metric').isIn(['requests', 'blocked', 'responseTime', 'users']).withMessage('Invalid metric'),
  body('condition.operator').isIn(['gt', 'lt', 'gte', 'lte', 'eq']).withMessage('Invalid operator'),
  body('condition.value').isNumeric().withMessage('Value must be a number')
], validateRequest, async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      createdBy: req.user.id
    };
    const rule = new AlertRule(ruleData);
    await rule.save();
    
    // Broadcast new rule
    if (global.wsService) {
      global.wsService.broadcast({
        type: 'alertRuleCreated',
        data: rule
      }, 'alerts');
    }
    
    res.json({ success: true, data: rule });
  } catch (err) {
    console.error('❌ Create alert rule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update alert rule
router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete alert rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get alert logs
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await AlertLog.find()
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .populate('ruleId', 'name severity');
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get active alerts
router.get('/active', async (req, res) => {
  try {
    const logs = await AlertLog.find({ resolved: false })
      .sort({ triggeredAt: -1 })
      .limit(50)
      .populate('ruleId', 'name severity');
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Resolve an alert
router.post('/logs/:id/resolve', async (req, res) => {
  try {
    const alert = await AlertLog.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    await alert.save();
    
    if (global.wsService) {
      global.wsService.broadcast({
        type: 'alertResolved',
        data: { 
          alertId: alert._id,
          ruleName: alert.ruleName
        }
      }, 'alerts');
    }
    
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get alert stats
router.get('/stats', async (req, res) => {
  try {
    const total = await AlertLog.countDocuments();
    const active = await AlertLog.countDocuments({ resolved: false });
    const critical = await AlertLog.countDocuments({ severity: 'critical', resolved: false });
    const warning = await AlertLog.countDocuments({ severity: 'warning', resolved: false });
    
    res.json({ 
      success: true, 
      data: {
        total,
        active,
        critical,
        warning,
        info: total - active - critical - warning
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;