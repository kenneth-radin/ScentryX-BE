const mongoose = require('mongoose');

const gasSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  gasValue: { type: Number, required: true },
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GasReading', gasSchema);
