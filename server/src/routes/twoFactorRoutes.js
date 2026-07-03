// server/src/routes/twoFactorRoutes.js
const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { validateRequest } = require('../middleware/validate');
const User = require('../models/User');

const router = express.Router();

// All routes require admin authentication
router.use(auth);
router.use(adminOnly);

// Get 2FA status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('twoFactorEnabled twoFactorSecret');
    res.json({
      success: true,
      data: { 
        enabled: user?.twoFactorEnabled || false,
        hasSecret: !!user?.twoFactorSecret
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Setup 2FA (generate secret and QR code)
router.post('/setup', async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `RateGuard:${user.email}`
    });
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    
    // Store in user (but don't enable yet)
    user.twoFactorSecret = secret.base32;
    user.twoFactorBackupCodes = backupCodes;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCode,
        backupCodes: backupCodes
      }
    });
  } catch (err) {
    console.error('❌ 2FA setup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Enable/Disable 2FA
router.post('/toggle', [
  body('enabled').isBoolean().withMessage('enabled must be boolean'),
  body('token').optional().isString()
], validateRequest, async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const { enabled, token } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (enabled) {
      // Verify token before enabling
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token required to enable 2FA' });
      }
      
      if (!user.twoFactorSecret) {
        return res.status(400).json({ success: false, message: 'Please setup 2FA first' });
      }
      
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });
      
      if (!verified) {
        return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
      }
      
      user.twoFactorEnabled = true;
    } else {
      user.twoFactorEnabled = false;
      user.twoFactorSecret = null;
      user.twoFactorBackupCodes = null;
    }
    
    await user.save();

    // Log audit event
    if (global.wsService) {
      global.wsService.addActivity({
        type: 'security',
        action: enabled ? '2FA_ENABLED' : '2FA_DISABLED',
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: { enabled: user.twoFactorEnabled }
    });
  } catch (err) {
    console.error('❌ 2FA toggle error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify 2FA token
router.post('/verify', [
  body('token').isString().notEmpty().withMessage('Token required')
], validateRequest, async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const user = await User.findById(req.user.id);
    
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA not enabled' });
    }

    const { token } = req.body;
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
    }

    res.json({ success: true, message: '2FA verified' });
  } catch (err) {
    console.error('❌ 2FA verify error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;