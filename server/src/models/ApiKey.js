const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  appName: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  permissions: [{ type: String, default: [] }],
  rateLimit: { type: Number, default: 100 },
  expiresAt: { type: Date },
  lastUsed: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
