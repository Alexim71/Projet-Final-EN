const express = require('express');
const router = express.Router();
const Data = require('../models/Data');
const paginate = require('../utils/pagination');

// -------------------------------------
// 1️⃣ PRÉVISIONS COURT TERME (24 heures)
// -------------------------------------

router.get('/24h/:uuid', async (req, res) => {
  const uuid = req.params.uuid;

  try {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // récupération paramètres pagination
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

    const details24h = await Data.aggregate([
      { $match: { deviceUUID: uuid, timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            month: { $month: "$timestamp" }
          },
          avgTemp: { $avg: "$temperature" },
          minTemp: { $min: "$temperature" },
          maxTemp: { $max: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          totalRainfall: { $sum: "$rainfall" }
        }
      },
      { $sort: { "_id.day": 1, "_id.hour": 1 } }
    ]);

    const forecast24h = paginate(details24h, page, pageSize);

    res.json({
      period: "24h",
      uuid,
      forecast: forecast24h
    });

  } catch (err) {
    console.error("Erreur forecast 24h :", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------
// 2️⃣ PRÉVISIONS 7 JOURS
// -------------------------------------
router.get('/7d/:uuid', async (req, res) => {
  const uuid = req.params.uuid;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // récupération paramètres pagination
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const forecast7dRaw = await Data.aggregate([
      { $match: { deviceUUID: uuid, timestamp: { $gte: sevenDaysAgo } } },
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

const forecast7d = paginate(forecast7dRaw, page, pageSize);

    res.json({
      period: "7d",
      uuid,
      forecast: forecast7d
    });

  } catch (err) {
    console.error("Erreur forecast 7j :", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------
// 3️⃣ ENDPOINT GLOBAL
// GET /api/weather/forecast/:uuid
// Retourne 24h + 7 jours en un appel
// -------------------------------------
/**
 * @swagger
 * /api/weather/forecast/{uuid}:
 *   get: 
 *     tags: [Data]
 *     parameters:
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
 *         description: Liste des previsions météo
 *       500:
 *         description: Erreur serveur
 */
router.get('/:uuid', async (req, res) => {
  const uuid = req.params.uuid;

  try {
    const now = new Date();

    // Génération 24h
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // récupération paramètres pagination
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const forecast24hRaw = await Data.aggregate([
      { $match: { deviceUUID: uuid, timestamp: { $gte: since24h } } },
      {
        $group: {
          _id: { hour: { $hour: "$timestamp" } },
          avgTemp: { $avg: "$temperature" },
          minTemp: { $min: "$temperature" },
          maxTemp: { $max: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          totalRainfall: { $sum: "$rainfall" }
        }
      },
      { $sort: { "_id.hour": 1 } }
    ]);

    const forecast24h = paginate(forecast24hRaw, page, pageSize);

    // Génération 7 jours
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const forecast7dRaw = await Data.aggregate([
      { $match: { deviceUUID: uuid, timestamp: { $gte: since7d } } },
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

const forecast7d = paginate(forecast7dRaw, page, pageSize);

    res.json({
      uuid,
      forecast24h,
      forecast7d
    });

  } catch (err) {
    console.error("Erreur endpoint forecast global :", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
