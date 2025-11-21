const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// ✅ Liste toutes les alertes (ou par station)
/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Alert]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Liste des alertes météo par uuid
 *       500:
 *         description: Erreur serveur
 */
router.get('/', async (req, res) => {
  const { uuid } = req.query;
  try {
    const filter = uuid ? { deviceUUID: uuid } : {};
    const alerts = await Alert.find(filter).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
