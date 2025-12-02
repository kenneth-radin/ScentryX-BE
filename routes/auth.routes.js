const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  verifyEmail, 
  resendVerification,
  updateAlertPreferences 
} = require('../controllers/auth.controller');
const UserToken = require('../models/user-token');
const authMiddleware = require('../middleware/auth.middleware'); // You'll need to create this

// AUTH ROUTES
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

// PROTECTED ROUTES
router.put('/alert-preferences', authMiddleware, updateAlertPreferences);

// SAVE FCM TOKEN
router.post('/fcm-token', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: "userId and token are required"
      });
    }

    const saved = await UserToken.findOneAndUpdate(
      { userId },
      { fcmToken: token },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "FCM token saved successfully",
      data: saved
    });

  } catch (err) {
    console.error("FCM token save error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error saving FCM token"
    });
  }
});

module.exports = router;