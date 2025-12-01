const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller'); // Fixed import name

// POST: Create new device (used by ESP8266)
router.post('/', deviceController.createDevice);

// GET: Get all devices
router.get('/', deviceController.getAllDevices);

// GET: Get single device
router.get('/:id', deviceController.getDeviceById);

// PUT: Update device
router.put('/:id', deviceController.updateDevice);

// DELETE: Delete device
router.delete('/:id', deviceController.deleteDevice);

module.exports = router;