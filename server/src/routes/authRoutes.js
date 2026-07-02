const express = require('express');
const { body } = require('express-validator');
const { 
  register, 
  login, 
  logout,
  getMe     // <-- Import getMe controller
} = require('../controllers/authController');
const { validateRequest } = require('../middleware/validate');
const auth = require('../middleware/auth'); // <-- Import auth middleware

const router = express.Router();

// ============ VALIDATION RULES ============
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ============ PUBLIC ROUTES ============
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', logout);

// ============ PROTECTED ROUTES ============
router.get('/me', auth, getMe); // Get current user (for page refresh/hydration)

module.exports = router;