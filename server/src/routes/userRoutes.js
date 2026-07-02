const express = require('express');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { getProfile } = require('../controllers/userController');
const { getDashboardStats } = require('../controllers/dashboardController');
const router = express.Router();

// ============ PROTECTED ROUTES ============
// All routes below require authentication and rate limiting

// Apply auth middleware to all routes in this router
router.use(auth);

// Apply rate limiter to all routes (except admin routes if any)
router.use(rateLimiter);

// ============ USER ENDPOINTS ============
// GET /api/profile - Get current user profile
router.get('/profile', getProfile);

// GET /api/dashboard - Get dashboard statistics
router.get('/dashboard', getDashboardStats);

// ============ ADDITIONAL USER ENDPOINTS (Optional) ============
// PUT /api/profile - Update user profile (you can add later)
// router.put('/profile', updateProfile);

// DELETE /api/profile - Delete account (you can add later)
// router.delete('/profile', deleteAccount);

module.exports = router;