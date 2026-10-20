const express = require('express');
const router = express.Router();
const Data = require('../models/Data');
const findStation = require('../utils/stationLookup');

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
    const station = await findStation(uuid);
    if (!station) return res.status(404).json({ message: 'Station introuvable.' });

    const current = await Data.findOne({ station: station._id }).sort({ measured_at: -1 }).lean();

    // --- 2. Statistiques du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0); // début de journée

    const summary = await Data.aggregate([
      {
        $match: {
          station: station._id,
          measured_at: { $gte: today }
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
          avgWindSpeed: { $avg: "$wind_speed" },
          totalRainfall: { $sum: "$rainfall" }
        }
      }
    ]);

    // --- 3. Historique (10 dernières mesures)
    const history = await Data.find({ station: station._id })
      .sort({ measured_at: -1 })
      .limit(10);

    if (current) {
      current.timestamp = current.measured_at;
      if (current.wind_speed !== undefined) current.windSpeed = current.wind_speed * 3.6;
    }
    if (summary[0]?.avgWindSpeed != null) summary[0].avgWindSpeed *= 3.6;
    history.forEach(item => {
      item.timestamp = item.measured_at;
      if (item.wind_speed !== undefined) item.windSpeed = item.wind_speed * 3.6;
    });

    res.json({
      stationUUID: station.uuid || station.code,
      currentWeather: current || {},
      todaySummary: summary[0] || {},
      recentHistory: history || []
    });

  } catch (err) {
    console.error('[weatherDashboard]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
