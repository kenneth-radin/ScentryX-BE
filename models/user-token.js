const mongoose = require('mongoose');

const userTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  fcmToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
userTokenSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserToken', userTokenSchema);