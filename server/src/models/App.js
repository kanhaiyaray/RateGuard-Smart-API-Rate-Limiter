// server/src/models/App.js
const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  displayName: { 
    type: String, 
    required: true,
    trim: true
  },
  url: { 
    type: String, 
    required: true 
  },
  apiBaseUrl: { 
    type: String, 
    required: true 
  },
  apiKey: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active' 
  },
  settings: {
    rateLimits: {
      free: { type: Number, default: 20 },
      premium: { type: Number, default: 200 },
      admin: { type: Number, default: Infinity }
    },
    features: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  lastUsed: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
appSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('App', appSchema);