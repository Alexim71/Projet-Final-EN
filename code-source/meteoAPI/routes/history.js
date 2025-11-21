const express = require('express');
const router = express.Router();
const Data = require('../models/Data');
const paginate = require('../utils/pagination');

// ----------------------------------------------
// 1️⃣ HISTORIQUE 24 HEURES
// ----------------------------------------------
router.get('/24h/:uuid', async (req, res) => {
  const uuid = req.params.uuid;

  try {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // récupération paramètres pagination
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10; 

    const result = await Data.aggregate([
      { $match: { deviceUUID: uuid, timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            month: { $month: "$timestamp" }
          },
          avgTemp: { $avg: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          avgWindSpeed: { $avg: "$windSpeed" },
          totalRain: { $sum: "$rainfall" }
        }
      },
      { $sort: { "_id.day": 1, "_id.hour": 1 } }
    ]);

    // Transformation en format lisible
    const history = result.map(r => ({
      hour: `${r._id.hour.toString().padStart(2, '0')}:00`,
      temperature: Number(r.avgTemp.toFixed(1)),
      humidity: Math.round(r.avgHumidity),
      windSpeed: Math.round(r.avgWindSpeed),
      rainfall: r.totalRain
    }));

    const history24h = paginate(history, page, pageSize);

    res.json({ uuid, period: "24h", history24h });

  } catch (err) {
    console.error("Erreur historique 24h :", err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------
// 2️⃣ HISTORIQUE 7 JOURS (AGRÉGATION PAR JOUR)
// ----------------------------------------------

router.get('/7d/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
 
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    // récupération paramètres pagination
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10; 

    const result = await Data.aggregate([
      { $match: { deviceUUID: uuid, timestamp: { $gte: since } } },
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
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    const history = result.map(r => ({
      day: `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
      minTemp: r.minTemp,
      maxTemp: r.maxTemp,
      humidity: Math.round(r.avgHumidity),
      rainfall: r.totalRainfall
    }));

   const history7d = paginate(history, page, pageSize);

    res.json({ uuid, period: "7d", history7d });

  } catch (err) {
    console.error("Erreur historique 7j :", err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------
// 3️⃣ ENDPOINT GLOBAL
//    /api/weather/history/:uuid/:period
// ----------------------------------------------
/**
 * @swagger
 * /api/weather/history/{uuid}/{period}:
 *   get:
 *     tags: [Data]
 *     parameters:
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [day, week]
 *       - in: path
 *         name: uuid
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Liste des historiques météo
 *       500:
 *         description: Erreur serveur
 */
router.get('/:uuid/:period', async (req, res) => {
  const { uuid, period } = req.params;

  if (period === "day") {
    return res.redirect(`/api/weather/history/24h/${uuid}`);
  }

  if (period === "week") {
    return res.redirect(`/api/weather/history/7d/${uuid}`);
  }

  res.status(400).json({ error: "Période invalide. Utiliser : 24h ou 7d" });
});

module.exports = router;
