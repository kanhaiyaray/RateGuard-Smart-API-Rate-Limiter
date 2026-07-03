// server/src/routes/reportRoutes.js
const express = require('express');
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { validateRequest } = require('../middleware/validate');
const PredictiveAnalytics = require('../services/predictiveAnalytics');

const router = express.Router();

// All routes require admin authentication
router.use(auth);
router.use(adminOnly);

// Get predictions
router.get('/predictions', [
  query('app').optional().isString(),
  query('days').optional().isInt({ min: 1, max: 30 })
], validateRequest, async (req, res) => {
  try {
    const { app = 'all', days = 7 } = req.query;
    const predictions = await PredictiveAnalytics.predictUsage(app, parseInt(days));
    res.json({ success: true, data: predictions });
  } catch (err) {
    console.error('❌ Prediction error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get anomalies
router.get('/anomalies', [
  query('app').optional().isString(),
  query('period').optional().isIn(['1h', '1d', '7d'])
], validateRequest, async (req, res) => {
  try {
    const { app = 'all', period = '1d' } = req.query;
    const anomalies = await PredictiveAnalytics.detectAnomalies(app, period);
    res.json({ success: true, data: anomalies });
  } catch (err) {
    console.error('❌ Anomaly detection error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate report (simple placeholder)
router.post('/generate', [
  body('format').isIn(['pdf', 'csv']).withMessage('Format must be pdf or csv'),
  body('dateRange').optional().isObject(),
  body('app').optional().isString()
], validateRequest, async (req, res) => {
  try {
    const { format = 'pdf', dateRange, app = 'all' } = req.body;
    
    // Simple report generation
    const reportData = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      format,
      app,
      dateRange: dateRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.email,
      data: {
        summary: {
          totalRequests: 1234,
          blockedRequests: 45,
          successRate: '96.4%'
        }
      }
    };
    
    res.json({ 
      success: true, 
      data: reportData,
      downloadUrl: `/api/reports/download/${reportData.id}`
    });
  } catch (err) {
    console.error('❌ Report generation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download report
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Simple placeholder response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=report-${id}.json`);
    res.json({
      id,
      message: 'Report download placeholder',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;