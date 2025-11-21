const express = require('express');
const router = express.Router();
const {
  getAllAlerts,
  getUnreadCount,
  acknowledgeAlert,
  deleteAlert,
  createAlert
} = require('../controllers/alert.controller');

// ALERT ROUTES

// POST: create an alert
router.post('/', createAlert);

// GET all alerts
router.get('/', getAllAlerts);

// GET unread alerts count
router.get('/unread-count', getUnreadCount);

// PATCH: acknowledge an alert
router.patch('/:id/acknowledge', acknowledgeAlert);

// DELETE: delete an alert
router.delete('/:id', deleteAlert);

module.exports = router;
