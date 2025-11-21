const GasReading = require('../models/gas-reading');
const Alert = require('../models/alerts.model');
const UserToken = require('../models/user-token');
const admin = require('firebase-admin');

const GAS_THRESHOLD = 50;             // Dangerous level threshold
const lastAlert = {};                 // Tracks last alert per device (throttle 2 min)

// CREATE Gas Reading
exports.createGasReading = async (req, res) => {
  try {
    const { deviceId, gasValue, status, timestamp } = req.body;

    if (!deviceId || gasValue === undefined || !status) {
      return res.status(400).json({ error: 'deviceId, gasValue, and status required' });
    }

    // Save gas reading to database
    const reading = new GasReading({
      deviceId,
      gasValue,
      status,
      timestamp: timestamp || new Date(),
    });
    await reading.save();

    // Check threshold and create alert if needed
    if (gasValue > GAS_THRESHOLD) {
      const now = Date.now();
      const last = lastAlert[deviceId] || 0;

      if (now - last > 2 * 60 * 1000) {  // 2-minute throttle
        // Create alert in MongoDB
        const alert = new Alert({
          deviceId,
          type: 'GAS_LEAK',
          message: `High LPG level detected: ${gasValue}`,
          timestamp: new Date()
        });
        await alert.save();

        // Send FCM notifications
        try {
          const tokensData = await UserToken.find().select('fcmToken -_id');
          const fcmTokens = tokensData.map(t => t.fcmToken);

          if (fcmTokens.length > 0) {
            const message = {
              notification: {
                title: 'Gas Leak Alert!',
                body: `High LPG level detected: ${gasValue}`,
              },
              tokens: fcmTokens,
            };

            const response = await admin.messaging().sendMulticast(message);
            console.log(`Notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
          }
        } catch (err) {
          console.error('Error sending push notification:', err.message);
        }

        lastAlert[deviceId] = now; // update last alert timestamp
      }
    }

    res.status(201).json({ success: true, reading });

  } catch (error) {
    console.error('Create gas reading failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET all gas readings
exports.getAllGasReadings = async (req, res) => {
  try {
    const readings = await GasReading.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, readings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET readings by device
exports.getGasReadingsByDevice = async (req, res) => {
  try {
    const readings = await GasReading.find({ deviceId: req.params.deviceId }).sort({ timestamp: -1 });
    res.json({ success: true, readings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE a reading
exports.updateGasReading = async (req, res) => {
  try {
    const reading = await GasReading.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reading) return res.status(404).json({ success: false, error: 'Gas reading not found' });
    res.json({ success: true, reading });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE a reading
exports.deleteGasReading = async (req, res) => {
  try {
    const reading = await GasReading.findByIdAndDelete(req.params.id);
    if (!reading) return res.status(404).json({ success: false, error: 'Gas reading not found' });
    res.json({ success: true, message: 'Reading deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
