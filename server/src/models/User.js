const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: {
    type: String,
    enum: ['FREE', 'PREMIUM', 'ADMIN'],
    default: 'FREE'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('User', userSchema);