const express = require('express');
const router = express.Router();

const Data = require('../models/Data');
const Alert = require('../models/Alert');
const findStation = require('../utils/stationLookup');

// UTIL: Calcul prévisions simples (min/max/avg par jour)
const getForecast = async (stationId) => {
  return await Data.aggregate([
    { $match: { station: stationId } },
    {
      $group: {
        _id: {
          year: { $year: "$measured_at" },
          month: { $month: "$measured_at" },
          day: { $dayOfMonth: "$measured_at" }
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
    const station = await findStation(uuid);
    if (!station) {
      return res.status(404).json({ message: "Station introuvable" });
    }

    const current = await Data.findOne({ station: station._id })
      .sort({ measured_at: -1 })
      .lean();

    const summary = await Data.aggregate([
      { $match: { station: station._id } },
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

    const forecast = await getForecast(station._id);
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const alerts = await Alert.find({
      deviceUUID: station.uuid || station.code,
      createdAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .lean();

    if (current) {
      current.timestamp = current.measured_at;
      if (current.wind_speed !== undefined) current.windSpeed = current.wind_speed * 3.6;
    }
    if (summary[0]?.avgWindSpeed != null) summary[0].avgWindSpeed *= 3.6;

    return res.json({
      station,
      current,
      summary: summary[0] || null,
      forecast,
      alerts
    });

  } catch (err) {
    console.error("Erreur API /weather/home :", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }

});

module.exports = router;
