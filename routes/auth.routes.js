const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const UserToken = require('../models/user-token');

// AUTH ROUTES
router.post('/register', register);
router.post('/login', login);

// SAVE FCM TOKEN  (POST /api/auth/fcm-token)
/*
 * Expects:
 * {
 *   "userId": "<mongo_user_id>",
 *   "token": "<fcm_token>"
 * }
 */
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
