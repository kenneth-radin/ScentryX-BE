const express = require('express');
const router = express.Router();
const gasController = require('../controllers/gas.controller'); // ✅ Correct

// POST a new gas reading (automatic alert if above threshold)
router.post('/', gasController.createGasReading);

// GET all gas readings
router.get('/', gasController.getAllGasReadings);

// GET gas readings by deviceId
router.get('/:deviceId', gasController.getGasReadingsByDevice);

// UPDATE a gas reading
router.put('/:id', gasController.updateGasReading);

// DELETE a gas reading
router.delete('/:id', gasController.deleteGasReading);

// ✅ NEW: Test FCM notification
router.post('/test-notification', gasController.sendTestNotification);

// Firebase routes
router.get('/firebase/status/:deviceId', gasController.getFirebaseStatus);
router.get('/firebase/readings/:deviceId', gasController.getFirebaseReadings);

module.exports = router;