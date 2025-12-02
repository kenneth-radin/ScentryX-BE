const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  role: { type: String, default: "user" },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationExpires: Date,
  alertPreferences: {
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    pushAlerts: { type: Boolean, default: true }
  },
  phoneNumbers: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);