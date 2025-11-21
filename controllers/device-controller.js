const Device = require('../models/device');

// CREATE
exports.createDevice = async (req, res) => {
  try {
    const { name, location, deviceId } = req.body;

    if (!name || !deviceId)
      return res.status(400).json({ success: false, message: 'Name and deviceId are required' });

    // Check if deviceId exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice)
      return res.status(400).json({ success: false, message: 'Device already exists' });

    const device = new Device({ name, location, deviceId });
    await device.save();

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      device
    });

  } catch (error) {
    console.error('Create device failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ ALL (exclude deleted)
exports.getAllDevices = async (req, res) => {
  try {
    const devices = await Device.find({ isDeleted: false });
    res.json({ success: true, devices });
  } catch (error) {
    console.error('Get all devices failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ ONE (exclude deleted)
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, isDeleted: false });

    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });

    res.json({ success: true, device });

  } catch (error) {
    console.error('Get device failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE
exports.updateDevice = async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true }
    );

    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });

    res.json({
      success: true,
      message: 'Device updated successfully',
      device
    });

  } catch (error) {
    console.error('Update device failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });

  } catch (error) {
    console.error('Delete device failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
