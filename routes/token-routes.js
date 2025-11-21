const express = require('express');
const router = express.Router();
const UserToken = require('../models/user-token');

// Save or update a users FCM token
router.post('/', async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken)
    return res.status(400).json({ error: 'userId and fcmToken required' });

  try {
    await UserToken.findOneAndUpdate(
      { userId },
      { fcmToken },
      { upsert: true }
    );
    res.json({ message: 'Token saved!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
