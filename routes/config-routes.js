const express = require('express');
const router = express.Router();
const Config = require('../models/config');

// GET config by deviceId
router.get('/:deviceId', async (req, res) => {
  try {
    const config = await Config.findOne({ deviceId: req.params.deviceId });
    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST or update config
router.post('/', async (req, res) => {
  try {
    const { deviceId, apiURL } = req.body;
    if (!deviceId || !apiURL) return res.status(400).json({ error: 'deviceId and apiURL required' });

    const config = await Config.findOneAndUpdate(
      { deviceId },
      { apiURL, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
