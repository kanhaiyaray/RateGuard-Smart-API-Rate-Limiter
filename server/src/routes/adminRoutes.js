const express = require('express');
const auth = require('../middleware/auth');
const { changePlan } = require('../controllers/adminController');
const router = express.Router();

router.use(auth); // Admin routes require auth, but we skip rate limiter intentionally

router.post('/change-plan', changePlan);

module.exports = router;