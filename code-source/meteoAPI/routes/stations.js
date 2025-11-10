const express = require('express');
const router = express.Router();
const Station = require('../models/Station');

// ✅ Liste des stations
router.get('/', async (req, res) => {
  try {
    const stations = await Station.find().sort({ createdAt: -1 });
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Ajout d'une station
router.post('/', async (req, res) => {
  try {
    const newStation = new Station(req.body);
    await newStation.save();
    res.status(201).json({ message: "✅ Station ajoutée", newStation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
