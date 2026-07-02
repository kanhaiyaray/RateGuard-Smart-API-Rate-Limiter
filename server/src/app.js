const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ============ CONNECT DATABASE ============
connectDB();

// ============ SECURITY MIDDLEWARE ============
app.use(helmet());

// ============ CORS CONFIGURATION ============
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ No origin, allowing');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked for:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============ ADDITIONAL MIDDLEWARE ============
app.use(cookieParser());
app.use(express.json());

// ============ LOGGING MIDDLEWARE ============
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  console.log('🍪 Cookies:', req.cookies);
  console.log('🌐 Origin:', req.headers.origin);
  next();
});

// ============ RATE LIMITERS ============
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { message: 'Too many admin requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ APPLY RATE LIMITERS ============
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api', generalLimiter);

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => res.send('OK'));

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS blocked: Origin not allowed' });
  }
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// ============ EXPORT APP ============
module.exports = app;