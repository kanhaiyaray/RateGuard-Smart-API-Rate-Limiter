const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  status: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  blocked: { type: Boolean, default: false },
});

// Index for efficient queries
analyticsSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);