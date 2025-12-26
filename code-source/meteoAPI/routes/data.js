const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

//  GET – Liste toutes les mesures
/**
 * @swagger
 * /api/data:
 *   get: 
 *     tags: [Data]
 *     responses:
 *       200:
 *         description: Liste des mesures météo
 *       500:
 *         description: Erreur serveur
 */
router.get('/', dataController.getDatas);

//  POST – Ajoute une nouvelle mesure météo et vérifie les alertes
/**
 * @swagger
 * /api/data:
 *   post: 
 *     tags: [Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceUUID:
 *                 type: string
 *               temperature:
 *                 type: number
 *               humidity:
 *                 type: number
 *               pressure:
 *                 type: number
 *               windSpeed:
 *                 type: number
 *               rainfall:
 *                 type: number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Mesure ajoutée + alertes générées
 *       400:
 *         description: Erreur dans les données envoyées
 */
router.post('/', dataController.postDatas);



//  Route : Filtrer les données d'une station selon une période donnée
/**
 * @swagger
 * /api/data/station/{uuid}/{period}:
 *   get:
 *     tags: [Data]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la station
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Données filtrées
 *       500:
 *         description: Erreur serveur
 */
router.get('/station/:uuid/:period', dataController.getStationWithUuidPeriode);

// ✅ Route : Récupérer la météo actuelle (dernière mesure)
/**
 * @swagger
 * /api/data/station/{uuid}/current:
 *   get: 
 *     tags: [Data]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Météo actuelle
 *       404:
 *         description: Aucune donnée trouvée
 */
router.get('/station/:uuid/current', dataController.getStationWithUuidCurrent);

// ✅ Route : Moyenne, min, max et somme de pluie par jour
/**
 * @swagger
 * /api/data/station/{uuid}/summary:
 *   get: 
 *     tags: [Data]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résumé des derniers jours
 *       500:
 *         description: Erreur serveur
 */

router.get('/station/:uuid/summary', dataController.getStationWithUuidSummary);


module.exports = router;
