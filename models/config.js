const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  apiURL: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Config', configSchema);
