const express = require('express');
const router = express.Router();
const { getStatistics } = require('../controllers/readings.controller');

router.get('/:deviceId/statistics', getStatistics);

module.exports = router;
