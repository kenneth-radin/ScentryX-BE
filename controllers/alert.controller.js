const Alert = require("../models/alerts.model");


// CREATE an alert manually
exports.createAlert = async (req, res) => {
  try {
    const { deviceId, type, message } = req.body;

    if (!deviceId || !type || !message) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, type, and message are required'
      });
    }

    const alert = new Alert({
      deviceId,
      type,
      message,
      timestamp: new Date()
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert
    });

  } catch (err) {
    console.error('Create alert failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET unread alerts count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Alert.countDocuments({ acknowledged: false });
    res.status(200).json({ success: true, unread: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH acknowledge an alert
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByIdAndUpdate(id, { acknowledged: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.status(200).json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE an alert
exports.deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByIdAndDelete(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.status(200).json({ success: true, message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
