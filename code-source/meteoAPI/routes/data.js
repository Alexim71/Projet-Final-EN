const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// ✅ GET – Liste toutes les mesures
router.get('/', async (req, res) => {
  try {
    const allData = await Data.find().limit(50); // limite à 50 pour éviter surcharge
    res.json(allData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST – Ajoute une nouvelle mesure
router.post('/', async (req, res) => {
  try {
    const newData = new Data(req.body);
    await newData.save();
    res.status(201).json({ message: "✅ Mesure ajoutée avec succès", newData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
