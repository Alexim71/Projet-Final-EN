const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// GET /api/devices → renvoie tous les devices
/**
 * @swagger
 * /api/devices:
 *   get:
 *     tags: [Device]
 *     responses:
 *       200:
 *         description: Liste des devices
 *       500:
 *         description: Erreur serveur
 */
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
