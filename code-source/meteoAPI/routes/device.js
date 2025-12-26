const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

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
router.get('/', deviceController.getDevice);

module.exports = router;
