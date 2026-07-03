// server/src/routes/appRoutes.js
const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { validateRequest } = require('../middleware/validate');
const App = require('../models/App');

const router = express.Router();

// All routes require admin authentication
router.use(auth);
router.use(adminOnly);

// Get all registered apps
router.get('/', async (req, res) => {
  try {
    const apps = await App.find().sort({ createdAt: -1 });
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register a new app
router.post('/', [
  body('name').notEmpty().withMessage('App name is required'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('apiBaseUrl').isURL().withMessage('Valid API base URL is required')
], validateRequest, async (req, res) => {
  try {
    const { name, displayName, url, apiBaseUrl, settings } = req.body;
    
    // Check if app already exists
    const existing = await App.findOne({ name });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: `App "${name}" already registered` 
      });
    }
    
    // Generate API key
    const crypto = require('crypto');
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    const app = new App({
      name,
      displayName,
      url,
      apiBaseUrl,
      apiKey,
      settings: settings || {
        rateLimits: { free: 20, premium: 200, admin: Infinity },
        features: {}
      }
    });
    
    await app.save();
    
    // Log activity
    if (global.wsService) {
      global.wsService.addActivity({
        type: 'app_registered',
        action: 'APP_REGISTERED',
        app: name,
        userId: req.user.id,
        userEmail: req.user.email
      });
    }
    
    res.json({ 
      success: true, 
      data: app,
      message: `App "${displayName}" registered successfully`
    });
  } catch (err) {
    console.error('❌ App registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get app by ID
router.get('/:id', async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update app
router.put('/:id', [
  body('displayName').optional().notEmpty(),
  body('url').optional().isURL(),
  body('status').optional().isIn(['active', 'inactive', 'maintenance'])
], validateRequest, async (req, res) => {
  try {
    const app = await App.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const crypto = require('crypto');
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }
    
    app.apiKey = crypto.randomBytes(32).toString('hex');
    await app.save();
    
    res.json({ 
      success: true, 
      data: { apiKey: app.apiKey },
      message: 'API key regenerated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete app
router.delete('/:id', async (req, res) => {
  try {
    const app = await App.findByIdAndDelete(req.params.id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }
    res.json({ success: true, message: `App "${app.name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;