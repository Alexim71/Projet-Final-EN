const Data = require('../models/Data');
const { checkWeatherAlerts } = require('../services/alertService');
const { normalizeWeatherPayload } = require('../utils/normalizeData');

exports.getDatas = async (req, res) => {
  try {
    const allData = await Data.find().limit(50); 
    res.json(allData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.postDatas = async (req, res) => {
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
};

//  Import du module d’aide pour les filtres temporels
const { getTimeRange } = require('../utils/dateUtils');
exports.getStationWithUuidPeriode = async (req, res) => {
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
};

exports.getStationWithUuidCurrent =  async (req, res) => {
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
};

exports.getStationWithUuidSummary = async (req, res) => {
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
};