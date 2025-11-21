const express = require('express');
const router = express.Router();

const Station = require('../models/Station');
const Data = require('../models/Data');
const Alert = require('../models/Alert');

// UTIL: Calcul prévisions simples (min/max/avg par jour)
const getForecast = async (uuid) => {

  return await Data.aggregate([
    { $match: { deviceUUID: uuid } },
    {
      $group: {
        _id: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" }
        },
        minTemp: { $min: "$temperature" },
        maxTemp: { $max: "$temperature" },
        avgHumidity: { $avg: "$humidity" },
        totalRainfall: { $sum: "$rainfall" }
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    { $limit: 7 }  // Prévision sur 7 jours
  ]);
};


// ----------------------------------------------
//    ENDPOINT UNIQUE POUR L’APPLICATION MOBILE
// ----------------------------------------------
/**
 * @swagger
 * /api/weather/{uuid}:
 *   get:
 *     tags: [Data]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Liste des donnees globales météo
 *       500:
 *         description: Erreur serveur
 */

router.get('/:uuid', async (req, res) => {
  const uuid = req.params.uuid;

  try {

    // 1️⃣ Station (info statique)
    const station = await Station.findOne({ uuid });
    if (!station) {
      return res.status(404).json({ message: "Station introuvable" });
    }

    // 2️⃣ Météo actuelle
    const current = await Data.findOne({ deviceUUID: uuid })
      .sort({ timestamp: -1 })
      .lean();

    // 3️⃣ Résumé météo (min, max, moyenne, pluie totale)
    const summary = await Data.aggregate([
      { $match: { deviceUUID: uuid } },
      {
        $group: {
          _id: null,
          avgTemp: { $avg: "$temperature" },
          minTemp: { $min: "$temperature" },
          maxTemp: { $max: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          avgPressure: { $avg: "$pressure" },
          avgWindSpeed: { $avg: "$windSpeed" },
          totalRainfall: { $sum: "$rainfall" }
        }
      }
    ]);

    // 4️⃣ Prévisions (générées par agrégations)
    const forecast = await getForecast(uuid);

    // 5️⃣ Alertes récentes (24 heures)
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const alerts = await Alert.find({
      deviceUUID: uuid,
      createdAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .lean();

    // 📦 Réponse complète envoyée au mobile
    return res.json({
      station,
      current,
      summary: summary[0] || null,
      forecast,
      alerts
    });

  } catch (err) {
    console.error("🔥 ERREUR API /weather/home :", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }

});

module.exports = router;
