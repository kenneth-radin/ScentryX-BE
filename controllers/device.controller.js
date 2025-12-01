const Device = require('../models/device');

// CREATE - Register new device (called by ESP8266)
exports.createDevice = async (req, res) => {
  try {
    console.log('📱 Device registration request:', req.body);
    
    const { name, location, deviceId } = req.body;

    if (!name || !deviceId) {
      console.log('Validation failed: Missing name or deviceId');
      return res.status(400).json({ 
        success: false, 
        message: 'Name and deviceId are required' 
      });
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      console.log(`Device ${deviceId} already exists, updating...`);
      
      // Update existing device
      existingDevice.name = name;
      existingDevice.location = location || existingDevice.location;
      existingDevice.isDeleted = false;
      await existingDevice.save();
      
      console.log(`✅ Device updated in MongoDB: ${deviceId}, ID: ${existingDevice._id}`);
      
      return res.status(200).json({
        success: true,
        message: 'Device updated successfully',
        device: existingDevice,
        mongoId: existingDevice._id
      });
    }

    // Create new device
    const device = new Device({ 
      name, 
      location: location || 'Unknown',
      deviceId 
    });
    
    await device.save();
    
    console.log(`✅ New device created in MongoDB: ${deviceId}, ID: ${device._id}`);

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      device: device,
      mongoId: device._id
    });

  } catch (error) {
    console.error('❌ Create device failed:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// READ ALL (exclude deleted)
exports.getAllDevices = async (req, res) => {
  try {
    const devices = await Device.find({ isDeleted: false });
    res.json({ 
      success: true, 
      count: devices.length,
      devices 
    });
  } catch (error) {
    console.error('Get all devices failed:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// READ ONE (exclude deleted)
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Device not found' 
      });
    }

    res.json({ 
      success: true, 
      device 
    });

  } catch (error) {
    console.error('Get device failed:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// UPDATE
exports.updateDevice = async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Device not found' 
      });
    }

    res.json({
      success: true,
      message: 'Device updated successfully',
      device
    });

  } catch (error) {
    console.error('Update device failed:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// SOFT DELETE
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Device not found' 
      });
    }

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });

  } catch (error) {
    console.error('Delete device failed:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};