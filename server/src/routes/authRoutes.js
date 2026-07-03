const express = require('express');
const { body } = require('express-validator');
const {
  login,
  logout,
  getMe
} = require('../controllers/authController');
const { validateRequest } = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

// ============ VALIDATION RULES ============
const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ============ AUTH ROUTES ============
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', logout);
router.get('/me', auth, getMe);

module.exports = router;