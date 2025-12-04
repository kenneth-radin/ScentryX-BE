const GasReading = require('../models/gas-reading');
const Alert = require('../models/alerts.model');
const UserToken = require('../models/user-token');
const admin = require('firebase-admin');

const GAS_THRESHOLD = 50;
const lastAlert = {};

// NEW: Firebase Realtime Database helper functions
async function updateFirebaseRealtime(data) {
  try {
    if (!admin.apps || admin.apps.length === 0) {
      console.log('Firebase not initialized, skipping Realtime DB update');
      return;
    }

    const db = admin.database();
    const deviceRef = db.ref(`devices/${data.deviceId}`);
    const now = Date.now();

    // 1. Update current status (for real-time dashboard)
    await deviceRef.child('current').set({
      gasValue: data.gasValue,
      status: data.status,
      lastUpdate: now,
      formattedTime: new Date(now).toLocaleString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      isOnline: true,
      isAlert: data.gasValue > GAS_THRESHOLD,
      threshold: GAS_THRESHOLD,
      deviceName: data.deviceName || 'Unknown Device',
      location: data.location || 'Unknown Location',
      rssi: data.rssi || 0,
      ip: data.ip || 'Unknown'
    });

    // 2. Add to historical readings (for charts)
    const readingKey = await deviceRef.child('readings').push({
      gasValue: data.gasValue,
      status: data.status,
      timestamp: now,
      formattedTime: new Date(now).toISOString(),
      isAlert: data.gasValue > GAS_THRESHOLD,
      threshold: GAS_THRESHOLD,
      mongoId: data._id || null
    });

    console.log('Firebase Realtime DB updated for device:', data.deviceId);
    console.log('   Current status:', data.gasValue + '% (' + data.status + ')');
    console.log('   Reading key:', readingKey.key);

    // 3. Keep only last 100 readings to prevent database bloat
    const readingsRef = deviceRef.child('readings');
    const snapshot = await readingsRef.orderByKey().once('value');
    const readings = snapshot.val();
    
    if (readings) {
      const keys = Object.keys(readings);
      if (keys.length > 100) {
        const keysToDelete = keys.slice(0, keys.length - 100);
        const deletePromises = keysToDelete.map(key => readingsRef.child(key).remove());
        await Promise.all(deletePromises);
        console.log('   Cleaned up', keysToDelete.length, 'old readings');
      }
    }

  } catch (error) {
    console.error('Firebase Realtime DB update error:', error.message);
    // Don't fail the request if Firebase fails
  }
}

// CREATE Gas Reading
exports.createGasReading = async (req, res) => {
  try {
    console.log('Gas reading received:', req.body);
    
    const { deviceId, gasValue, status, timestamp, deviceName, location, rssi, ip } = req.body;

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
      deviceName,
      location,
      rssi,
      ip
    });
    
    await reading.save();
    
    console.log('Gas reading saved to MongoDB. ID:', reading._id);

    // NEW: Update Firebase Realtime Database
    const readingData = {
      ...req.body,
      _id: reading._id,
      timestamp: reading.timestamp.getTime()
    };
    await updateFirebaseRealtime(readingData);

    // Check threshold and create alert if needed
    if (gasValue > GAS_THRESHOLD) {
      const now = Date.now();
      const last = lastAlert[deviceId] || 0;

      // Throttle alerts (2 minutes)
      if (now - last > 2 * 60 * 1000) {
        console.log('HIGH GAS ALERT for', deviceId + ':', gasValue);
        
        // Create alert in MongoDB
        const alert = new Alert({
          deviceId,
          type: 'GAS_LEAK',
          message: `High LPG level detected: ${gasValue}`,
          timestamp: new Date(),
          deviceName,
          location,
          gasValue
        });
        await alert.save();
        
        console.log('Alert saved to MongoDB. ID:', alert._id);

        // FIXED: Send FCM notifications with sendEachForMulticast
        try {
          const tokensData = await UserToken.find().select('fcmToken -_id');
          const fcmTokens = tokensData.map(t => t.fcmToken).filter(Boolean);

          if (fcmTokens.length > 0) {
            const message = {
              tokens: fcmTokens,
              notification: {
                title: 'Gas Leak Alert!',
                body: `High LPG level detected: ${gasValue}ppm at ${deviceName || deviceId}`,
              },
              data: {
                deviceId,
                deviceName: deviceName || deviceId,
                location: location || 'Unknown Location',
                gasValue: gasValue.toString(),
                status: 'HIGH',
                timestamp: new Date().toISOString(),
                type: 'gas_alert',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channel_id: 'gas_alerts',
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                  },
                },
              },
            };

            // FIX: Use sendEachForMulticast (correct for firebase-admin v13)
            const response = await admin.messaging().sendEachForMulticast(message);

            console.log(
              'Notifications sent:', response.successCount, 'success,', response.failureCount, 'failed'
            );

            if (response.failureCount > 0) {
              response.responses.forEach((res, idx) => {
                if (!res.success) {
                  console.error('Failed to send to token', fcmTokens[idx] + ':', res.error);
                }
              });
            }
            
            // Also update Firebase with alert info
            if (admin.apps && admin.apps.length > 0) {
              const db = admin.database();
              await db.ref(`devices/${deviceId}/current`).update({
                lastAlertTime: now,
                lastAlertValue: gasValue,
                alertCount: admin.database.ServerValue.increment(1)
              });
            }
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
      mongoId: reading._id,
      firebaseUpdated: true
    });

  } catch (error) {
    console.error('Create gas reading failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// NEW: Get Firebase current status for a device
exports.getFirebaseStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!admin.apps || admin.apps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Firebase not initialized'
      });
    }
    
    const db = admin.database();
    const snapshot = await db.ref(`devices/${deviceId}/current`).once('value');
    const data = snapshot.val();
    
    res.json({
      success: true,
      deviceId,
      currentStatus: data
    });
    
  } catch (error) {
    console.error('Get Firebase status failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// NEW: Get Firebase historical readings
exports.getFirebaseReadings = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!admin.apps || admin.apps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Firebase not initialized'
      });
    }
    
    const db = admin.database();
    const snapshot = await db.ref(`devices/${deviceId}/readings`)
      .orderByChild('timestamp')
      .limitToLast(limit)
      .once('value');
    
    const data = snapshot.val();
    const readings = data ? Object.values(data).sort((a, b) => b.timestamp - a.timestamp) : [];
    
    res.json({
      success: true,
      deviceId,
      count: readings.length,
      readings
    });
    
  } catch (error) {
    console.error('Get Firebase readings failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// NEW: Add this helper function for sending test notifications
exports.sendTestNotification = async (req, res) => {
  try {
    const { deviceId, gasValue = 75, deviceName = "Test Device", location = "Test Location" } = req.body;
    
    const tokensData = await UserToken.find().select('fcmToken -_id');
    const fcmTokens = tokensData.map(t => t.fcmToken).filter(Boolean);

    if (fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No FCM tokens found'
      });
    }

    const message = {
      tokens: fcmTokens,
      notification: {
        title: 'TEST Gas Alert!',
        body: `Test alert: ${gasValue}ppm at ${deviceName}`,
      },
      data: {
        deviceId: deviceId || 'test-device',
        deviceName: deviceName,
        location: location,
        gasValue: gasValue.toString(),
        status: 'HIGH',
        timestamp: new Date().toISOString(),
        type: 'test_alert',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high'
      }
    };

    // FIX: Use sendEachForMulticast
    const response = await admin.messaging().sendEachForMulticast(message);

    res.json({
      success: true,
      message: `Test notification sent to ${response.successCount} devices`,
      failed: response.failureCount,
      total: fcmTokens.length
    });

  } catch (error) {
    console.error('Test notification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// KEEP ALL YOUR EXISTING FUNCTIONS BELOW UNCHANGED
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