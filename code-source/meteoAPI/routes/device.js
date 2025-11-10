const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// GET /api/devices → renvoie tous les devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
