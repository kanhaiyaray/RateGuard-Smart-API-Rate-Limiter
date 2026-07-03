// server/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT } = require('../config/constants');
const User = require('../models/User');

// ============ HELPER: Send token via HTTP-only cookie ============
const sendTokenResponse = (user, res) => {
  const token = jwt.sign(
    { id: user._id },
    JWT.SECRET,
    { expiresIn: JWT.EXPIRES_IN }
  );

  const userObj = user.toObject();
  delete userObj.password;

  // Set HTTP-only cookie with the JWT
  res.cookie('token', token, {
    httpOnly: JWT.COOKIE_HTTP_ONLY,
    secure: JWT.COOKIE_SECURE,
    sameSite: JWT.COOKIE_SAME_SITE,
    maxAge: JWT.COOKIE_MAX_AGE,
    path: '/',
  });

  // Return user data (no token in response body)
  res.json({
    success: true,
    data: userObj
  });
};

// ============ LOGIN ============
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify admin-only access
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: admin only'
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Send token via cookie and return user data
    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============ LOGOUT ============
exports.logout = (req, res) => {
  // Clear the JWT cookie using same options as issuance
  res.clearCookie('token', {
    httpOnly: JWT.COOKIE_HTTP_ONLY,
    secure: JWT.COOKIE_SECURE,
    sameSite: JWT.COOKIE_SAME_SITE,
    path: '/',
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// ============ GET CURRENT USER (Optional but recommended) ============
exports.getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = req.user.toObject();
    delete user.password;
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};