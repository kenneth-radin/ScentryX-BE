const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  deviceId: String,
  value: Number, // gas PPM
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Reading", readingSchema);
