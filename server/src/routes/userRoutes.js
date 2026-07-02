const express = require('express');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { getProfile } = require('../controllers/userController');
const { getDashboardStats } = require('../controllers/dashboardController');
const router = express.Router();

// All routes require auth and rate limiting
router.use(auth);
router.use(rateLimiter);

router.get('/profile', getProfile);
router.get('/dashboard', getDashboardStats);

module.exports = router;