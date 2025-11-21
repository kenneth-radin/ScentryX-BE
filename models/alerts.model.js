const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: String,
  type: String, // "GASLEAK", "WARNING"
  message: String,
  acknowledged: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Alert", alertSchema);
