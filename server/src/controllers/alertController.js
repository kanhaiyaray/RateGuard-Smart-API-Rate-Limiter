// server/src/controllers/alertController.js
const { AlertRule, AlertLog } = require('../models/Alert');

exports.getRules = async (req, res) => {
  try {
    const rules = await AlertRule.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRule = async (req, res) => {
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
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRule = async (req, res) => {
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
};

exports.deleteRule = async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logs = await AlertLog.find()
      .sort({ triggeredAt: -1 })
      .limit(100)
      .populate('ruleId', 'name severity');
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const alert = await AlertLog.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    await alert.save();
    
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};