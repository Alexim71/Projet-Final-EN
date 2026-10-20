const Data = require('../models/Data');
const { checkWeatherAlerts } = require('../services/alertService');
const { normalizeWeatherPayload } = require('../utils/normalizeData');
const findStation = require('../utils/stationLookup');

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
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ message: 'Un objet JSON est requis.' });
    }
    const stationIdentifier = payload.stationId || payload.stationUUID ||
      payload.deviceUUID || payload.stationCode || payload.station;
    const station = await findStation(stationIdentifier);
    if (!station) {
      return res.status(400).json({ message: 'Une station existante est requise.' });
    }

    const normalized = normalizeWeatherPayload(payload);
    if (payload.source !== undefined && !['SENSOR', 'MANUAL', 'IMPORT'].includes(payload.source)) {
      return res.status(400).json({ message: 'Source de mesure invalide.' });
    }
    const numericFields = [
      ['temperature', -100, 70],
      ['humidity', 0, 100],
      ['pressure', 300, 1200],
      ['rainfall', 0, 2000],
      ['wind_speed', 0, 150],
      ['wind_direction', 0, 360],
      ['solar_radiation', 0, 2000],
      ['uv_index', 0, 30],
      ['visibility', 0, 500],
      ['dew_point', -100, 70],
      ['battery_level', 0, 100],
      ['signal_strength', -200, 100],
      ['feels_like', -100, 70],
      ['heat_index', -100, 100],
      ['wind_chill', -100, 70]
    ];
    const cleanPayload = {
      station: station._id,
      measured_at: new Date(payload.measured_at || payload.timestamp || Date.now()),
      source: payload.source || 'SENSOR'
    };
    if (Number.isNaN(cleanPayload.measured_at.getTime())) {
      return res.status(400).json({ message: 'La date de mesure est invalide.' });
    }

    for (const [field, min, max] of numericFields) {
      const legacyField = field === 'wind_speed' ? 'windSpeed' : field;
      const value = field === 'wind_speed' && normalized.windSpeed !== undefined
        ? normalized.windSpeed / 3.6
        : normalized[field] ?? payload[legacyField];
      if (value === undefined || value === null) continue;
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
        return res.status(400).json({ message: `Valeur invalide pour ${field}.` });
      }
      cleanPayload[field] = numericValue;
    }
    if (!numericFields.some(([field]) => cleanPayload[field] !== undefined)) {
      return res.status(400).json({ message: 'Au moins une mesure météo est requise.' });
    }
    if (payload.device_status !== undefined) {
      if (!['ONLINE', 'OFFLINE', 'ERROR'].includes(payload.device_status)) {
        return res.status(400).json({ message: 'État du dispositif invalide.' });
      }
      cleanPayload.device_status = payload.device_status;
    }
    if (typeof payload.firmware_version === 'string') cleanPayload.firmware_version = payload.firmware_version.slice(0, 100);
    if (typeof payload.error_code === 'string') cleanPayload.error_code = payload.error_code.slice(0, 100);
    if (typeof payload.created_by === 'string') cleanPayload.created_by = payload.created_by.slice(0, 100);

    const newData = new Data(cleanPayload);
    const saved = await newData.save();
    const alerts = await checkWeatherAlerts({
      ...saved.toObject(),
      deviceUUID: station.uuid || station.code,
      windSpeed: (saved.wind_speed || 0) * 3.6
    });

    res.status(201).json({
      message: "✅ Mesure ajoutée avec succès (normalisée)",
      newData: saved,
      alertsGenerated: alerts
    });

  } catch (err) {
    console.error('[postDatas]', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Les données de mesure sont invalides.' });
    }
    return res.status(500).json({ message: 'Impossible d’enregistrer la mesure.' });
  }
};

//  Import du module d’aide pour les filtres temporels
const { getTimeRange } = require('../utils/dateUtils');
exports.getStationWithUuidPeriode = async (req, res) => {
  try {
    if (!['hour', 'day', 'week', 'month'].includes(req.params.period)) {
      return res.status(400).json({ message: 'Période invalide.' });
    }
    const { start, end } = getTimeRange(req.params.period);
    const station = await findStation(req.params.uuid);
    if (!station) return res.status(404).json({ message: 'Station introuvable.' });
    const data = await Data.find({
      station: station._id,
      measured_at: { $gte: start, $lte: end }
    }).sort({ measured_at: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStationWithUuidCurrent =  async (req, res) => {
  try {
    const station = await findStation(req.params.uuid);
    if (!station) return res.status(404).json({ message: 'Station introuvable.' });
    const latest = await Data.findOne({ station: station._id }).sort({ measured_at: -1 });

    if (!latest)
      return res.status(404).json({ message: "Aucune donnée trouvée" });

    // Structure claire de la réponse
    res.json({
      deviceUUID: station.uuid || station.code,
      temperature: latest.temperature,
      humidity: latest.humidity,
      pressure: latest.pressure,
      windSpeed: latest.wind_speed === undefined ? undefined : latest.wind_speed * 3.6,
      rainfall: latest.rainfall,
      wind_speed: latest.wind_speed,
      measured_at: latest.measured_at,
      timestamp: latest.measured_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStationWithUuidSummary = async (req, res) => {
  try {
    const station = await findStation(req.params.uuid);
    if (!station) return res.status(404).json({ message: 'Station introuvable.' });
    const summary = await Data.aggregate([
      { $match: { station: station._id } },
      {
        $group: {
          _id: {
            year: { $year: "$measured_at" },
            month: { $month: "$measured_at" },
            day: { $dayOfMonth: "$measured_at" }
          },
          avgTemp: { $avg: "$temperature" },
          minTemp: { $min: "$temperature" },
          maxTemp: { $max: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          avgPressure: { $avg: "$pressure" },
          avgWindSpeed: { $avg: "$wind_speed" },
          totalRainfall: { $sum: "$rainfall" }
        }
      },

      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 7 }
    ]);

    summary.forEach(day => {
      if (day.avgWindSpeed !== null) day.avgWindSpeed *= 3.6;
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};