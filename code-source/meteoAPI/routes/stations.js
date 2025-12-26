const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');

// ✅ Liste des stations
/**
 * @swagger
 * /api/stations:
 *   get:
 *     tags: [Station]
 *     responses:
 *       200:
 *         description: Liste des stations météo
 *       500:
 *         description: Erreur serveur
 */
router.get('/', stationController.getStations);

// ✅ Ajout d'une station
/**
 * @swagger
 * /api/stations:
 *   post:
 *     tags: [Station]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uuid:
 *                 type: string
 *                 example: "4a8c450357764478ac79cd888d7dc736"
 *               name:
 *                 type: string
 *                 example: "Station Cap-Haïtien"
 *               latitude:
 *                 type: number
 *                 example: 19.759
 *               longitude:
 *                 type: number
 *                 example: -72.204
 *               altitude:
 *                 type: number
 *                 example: 15
 *     responses:
 *       201:
 *         description: Station créée avec succès
 *       400:
 *         description: Erreur lors de la création de la station
 */
router.post('/', stationController.postStations);


module.exports = router;
