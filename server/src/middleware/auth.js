// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { JWT } = require('../config/constants');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Read token from cookie instead of Authorization header
    const token = req.cookies.token; // <-- This is key!

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT.SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    res.status(401).json({
      success: false,
      message: 'Please authenticate'
    });
  }
};

module.exports = auth;