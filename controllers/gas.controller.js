const GasReading = require('../models/gas-reading');
const Alert = require('../models/alerts.model');
const UserToken = require('../models/user-token');
const admin = require('firebase-admin');

const GAS_THRESHOLD = 50;
const lastAlert = {};

// CREATE Gas Reading
exports.createGasReading = async (req, res) => {
  try {
    console.log('📊 Gas reading received:', req.body);
    
    const { deviceId, gasValue, status, timestamp } = req.body;

    // Validation
    if (!deviceId || gasValue === undefined || !status) {
      return res.status(400).json({ 
        success: false,
        error: 'deviceId, gasValue, and status are required' 
      });
    }

    // Save gas reading to MongoDB
    const reading = new GasReading({
      deviceId,
      gasValue,
      status,
      timestamp: timestamp || new Date(),
    });
    
    await reading.save();
    
    console.log(`✅ Gas reading saved to MongoDB. ID: ${reading._id}`);

    // Check threshold and create alert if needed
    if (gasValue > GAS_THRESHOLD) {
      const now = Date.now();
      const last = lastAlert[deviceId] || 0;

      // Throttle alerts (2 minutes)
      if (now - last > 2 * 60 * 1000) {
        console.log(`🚨 HIGH GAS ALERT for ${deviceId}: ${gasValue}`);
        
        // Create alert in MongoDB
        const alert = new Alert({
          deviceId,
          type: 'GAS_LEAK',
          message: `High LPG level detected: ${gasValue}`,
          timestamp: new Date()
        });
        await alert.save();
        
        console.log(`✅ Alert saved to MongoDB. ID: ${alert._id}`);

        // Send FCM notifications
        try {
          const tokensData = await UserToken.find().select('fcmToken -_id');
          const fcmTokens = tokensData.map(t => t.fcmToken).filter(Boolean);

          if (fcmTokens.length > 0) {
            const message = {
              notification: {
                title: '🚨 Gas Leak Alert!',
                body: `Device ${deviceId} detected high LPG: ${gasValue}`,
              },
              data: {
                deviceId,
                gasValue: gasValue.toString(),
                timestamp: new Date().toISOString()
              },
              tokens: fcmTokens,
            };

            const response = await admin.messaging().sendMulticast(message);
            console.log(`📱 Notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
          } else {
            console.log('No FCM tokens registered for notifications');
          }
        } catch (err) {
          console.error('Error sending push notification:', err.message);
        }

        lastAlert[deviceId] = now;
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'Gas reading saved successfully',
      reading: reading,
      mongoId: reading._id
    });

  } catch (error) {
    console.error('❌ Create gas reading failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// GET all gas readings
exports.getAllGasReadings = async (req, res) => {
  try {
    const readings = await GasReading.find().sort({ timestamp: -1 }).limit(100);
    res.json({ 
      success: true, 
      count: readings.length,
      readings 
    });
  } catch (error) {
    console.error('Get gas readings failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// GET readings by device
exports.getGasReadingsByDevice = async (req, res) => {
  try {
    const readings = await GasReading.find({ 
      deviceId: req.params.deviceId 
    }).sort({ timestamp: -1 });
    
    res.json({ 
      success: true, 
      count: readings.length,
      readings 
    });
  } catch (error) {
    console.error('Get device readings failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// UPDATE a reading
exports.updateGasReading = async (req, res) => {
  try {
    const reading = await GasReading.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    
    if (!reading) {
      return res.status(404).json({ 
        success: false, 
        error: 'Gas reading not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Reading updated',
      reading 
    });
  } catch (error) {
    console.error('Update gas reading failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// DELETE a reading
exports.deleteGasReading = async (req, res) => {
  try {
    const reading = await GasReading.findByIdAndDelete(req.params.id);
    
    if (!reading) {
      return res.status(404).json({ 
        success: false, 
        error: 'Gas reading not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Reading deleted successfully' 
    });
  } catch (error) {
    console.error('Delete gas reading failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};