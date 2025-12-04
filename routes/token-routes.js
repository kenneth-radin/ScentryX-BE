const express = require('express');
const router = express.Router();
const UserToken = require('../models/user-token');

// Save or update a user's FCM token
router.post('/', async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    // Validation
    if (!userId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "userId and fcmToken are required"
      });
    }

    // Save/update token
    const saved = await UserToken.findOneAndUpdate(
      { userId },
      { 
        fcmToken, 
        updatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    // Success response
    res.json({
      success: true,
      message: "FCM token saved successfully",
      data: saved
    });

  } catch (err) {
    console.error("Token save error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error saving FCM token"
    });
  }
});

// OPTIONAL: Add GET endpoint for debugging
router.get('/', async (req, res) => {
  try {
    const tokens = await UserToken.find().sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      count: tokens.length,
      data: tokens
    });
    
  } catch (err) {
    console.error("Get tokens error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// OPTIONAL: Delete token endpoint
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await UserToken.deleteOne({ userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Token not found for this user"
      });
    }
    
    res.json({
      success: true,
      message: "Token deleted successfully"
    });
    
  } catch (err) {
    console.error("Delete token error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;