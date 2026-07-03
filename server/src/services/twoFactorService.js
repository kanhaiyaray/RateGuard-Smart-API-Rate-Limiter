// server/src/routes/twoFactorRoutes.js
const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { validateRequest } = require('../middleware/validate');
const twoFactorService = require('../services/twoFactorService');
const User = require('../models/User');

const router = express.Router();

router.use(auth);
router.use(adminOnly);

// Setup 2FA
router.post('/setup', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate secret
    const { secret, otpauthUrl } = twoFactorService.generateSecret(user.email);
    
    // Generate QR code
    const qrCode = await twoFactorService.generateQRCode(otpauthUrl);
    
    // Generate backup codes
    const backupCodes = twoFactorService.generateBackupCodes();
    
    // Store in user (but don't enable yet)
    user.twoFactorSecret = secret;
    user.twoFactorBackupCodes = backupCodes;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({
      success: true,
      data: {
        secret,
        qrCode,
        backupCodes
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Enable/Disable 2FA
router.post('/toggle', [
  body('enabled').isBoolean().withMessage('enabled must be boolean'),
  body('token').optional().isString().withMessage('Token is required to enable')
], validateRequest, async (req, res) => {
  try {
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
      
      const verified = twoFactorService.verifyToken(user.twoFactorSecret, token);
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify 2FA token (for login)
router.post('/verify', [
  body('token').isString().notEmpty().withMessage('Token required')
], validateRequest, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA not enabled' });
    }

    const { token } = req.body;
    const verified = twoFactorService.verifyToken(user.twoFactorSecret, token);
    
    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
    }

    // Mark as verified for this session
    req.session.twoFactorVerified = true;
    
    res.json({ success: true, message: '2FA verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get 2FA status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('twoFactorEnabled');
    res.json({
      success: true,
      data: { enabled: user?.twoFactorEnabled || false }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;