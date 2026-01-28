const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const alertController = require('../controllers/alertController');

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

 router.get('/', alertController.getAlerts);
module.exports = router;
