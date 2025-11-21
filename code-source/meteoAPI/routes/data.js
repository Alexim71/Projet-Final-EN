const express = require('express');
const router = express.Router();
const Data = require('../models/Data');
const { checkWeatherAlerts } = require('../services/alertService');
const { normalizeWeatherPayload } = require('../utils/normalizeData');


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
router.get('/', async (req, res) => {
  try {
    const allData = await Data.find().limit(50); 
    res.json(allData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
router.post('/', async (req, res) => {
  try {
    // 1️⃣ Normaliser les valeurs avant insertion
    const cleanPayload = normalizeWeatherPayload(req.body);

    // 2️⃣ Sauvegarder les données
    const newData = new Data(cleanPayload);
    const saved = await newData.save();

    // 3️⃣ Déclencher les alertes
    const alerts = await checkWeatherAlerts(saved);

    res.status(201).json({
      message: "✅ Mesure ajoutée avec succès (normalisée)",
      newData: saved,
      alertsGenerated: alerts
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//  Import du module d’aide pour les filtres temporels
const { getTimeRange } = require('../utils/dateUtils');

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
router.get('/station/:uuid/:period', async (req, res) => {
  try {
    const { start, end } = getTimeRange(req.params.period);

    // Requête MongoDB : toutes les mesures comprises entre start et end
    const data = await Data.find({
      deviceUUID: req.params.uuid,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
router.get('/station/:uuid/current', async (req, res) => {
  try {
    // Recherche de la dernière entrée (tri décroissant par timestamp)
    const latest = await Data.findOne({ deviceUUID: req.params.uuid })
      .sort({ timestamp: -1 });

    if (!latest)
      return res.status(404).json({ message: "Aucune donnée trouvée" });

    // Structure claire de la réponse
    res.json({
      deviceUUID: latest.deviceUUID,
      temperature: latest.temperature,
      humidity: latest.humidity,
      pressure: latest.pressure,
      windSpeed: latest.windSpeed,
      rainfall: latest.rainfall,
      timestamp: latest.timestamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.get('/station/:uuid/summary', async (req, res) => {
  try {
    const summary = await Data.aggregate([
      // Filtrer uniquement les données de la station concernée
      { $match: { deviceUUID: req.params.uuid } },

      // Grouper les données par jour (année + mois + jour)
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" }
          },
          avgTemp: { $avg: "$temperature" },
          minTemp: { $min: "$temperature" },
          maxTemp: { $max: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          avgPressure: { $avg: "$pressure" },
          avgWindSpeed: { $avg: "$windSpeed" },
          totalRainfall: { $sum: "$rainfall" }
        }
      },

      // Trier du plus récent au plus ancien
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },

      // Limiter aux 7 derniers jours
      { $limit: 7 }
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
