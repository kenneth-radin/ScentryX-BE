const Reading = require('../models/readings.model');

exports.getStatistics = async (req, res) => {
  const { deviceId } = req.params;

  const readings = await Reading.find({ deviceId });

  if (readings.length === 0)
    return res.json({ avg: 0, min: 0, max: 0 });

  const values = readings.map(r => r.value);

  res.json({
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  });
};
