const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// 🔹 Route : /api/weather/weatherDashboard/:uuid
/**
 * @swagger
 * /api/weatherDashboard/{uuid}:
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
 *         description: dashboard météo
 *       500:
 *         description: Erreur serveur
 */
router.get('/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;

    // --- 1. Météo actuelle (dernière mesure)
    const current = await Data.findOne({ deviceUUID: uuid }).sort({ timestamp: -1 });

    // --- 2. Statistiques du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0); // début de journée

    const summary = await Data.aggregate([
      {
        $match: {
          deviceUUID: uuid,
          timestamp: { $gte: today }
        }
      },
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

    // --- 3. Historique (10 dernières mesures)
    const history = await Data.find({ deviceUUID: uuid })
      .sort({ timestamp: -1 })
      .limit(10);

    // --- 4. Réponse consolidée
    res.json({
      stationUUID: uuid,
      currentWeather: current || {},
      todaySummary: summary[0] || {},
      recentHistory: history || []
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
