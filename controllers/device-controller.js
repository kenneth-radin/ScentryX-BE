const Device = require('../models/device');

// CREATE
exports.createDevice = async (req, res) => {
  try {
    const { name, location, deviceId } = req.body;
    if (!name || !deviceId) 
      return res.status(400).json({ success: false, message: 'Name and deviceId are required' });

    // Check if deviceId already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) 
      return res.status(400).json({ success: false, message: 'Device already exists' });

    const device = new Device({ name, location, deviceId });
    await device.save();

    res.status(201).json({ success: true, message: 'Device created successfully', device });
  } catch (error) {
    console.error('Create device failed:', error.message, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ all
exports.getAllDevices = async (req, res) => {
  try {
    const devices = await Device.find();
    res.json({ success: true, devices });
  } catch (error) {
    console.error('Get all devices failed:', error.message, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ one
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) 
      return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, device });
  } catch (error) {
    console.error('Get device by ID failed:', error.message, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE
exports.updateDevice = async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!device) 
      return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, message: 'Device updated successfully', device });
  } catch (error) {
    console.error('Update device failed:', error.message, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) 
      return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device failed:', error.message, error);
    res.status(500).json({ success: false, message: error.message });
  }
};
