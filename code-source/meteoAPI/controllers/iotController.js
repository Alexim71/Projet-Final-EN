const Data = require('../models/Data');
const IoTState = require('../models/IoTState');
const findStation = require('../utils/stationLookup');
const { checkWeatherAlerts } = require('../services/alertService');
const { classifyWeather } = require('../services/weatherSeverity');

const DEMO_LEVELS = {
  'DEMO-PAP-01': { level: 'normal', led: 'green' },
  'DEMO-PAP-02': { level: 'warning', led: 'yellow' },
  'DEMO-PAP-03': { level: 'critical', led: 'red' }
};

const MEASUREMENT_RANGES = {
  temperature: [-100, 70],
  humidity: [0, 100],
  pressure: [300, 1200],
  rainfall: [0, 2000],
  wind_speed: [0, 150],
  wind_direction: [0, 360],
  battery_level: [0, 100],
  signal_strength: [-200, 100]
};

exports.setDemoState = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ message: 'Un objet JSON est requis.' });
  }
  const { demoMode = true, stationCode } = req.body;
  if (typeof demoMode !== 'boolean') {
    return res.status(400).json({ message: 'État du mode démo invalide.' });
  }
  if (demoMode === false) {
    try {
      const updated = await IoTState.findByIdAndUpdate(
        'demo-scenario',
        {
          stationCode: null,
          active: false,
          level: 'normal',
          led: 'green',
          updatedAt: new Date()
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json({
        stationCode: updated.stationCode,
        active: updated.active,
        level: updated.level,
        led: updated.led,
        updatedAt: updated.updatedAt
      });
    } catch (err) {
      console.error('[iot:setDemoState]', err);
      return res.status(500).json({ message: 'Impossible de désactiver le scénario IoT.' });
    }
  }

  if (!Object.prototype.hasOwnProperty.call(DEMO_LEVELS, stationCode)) {
    return res.status(400).json({ message: 'Scénario de démonstration invalide.' });
  }
  const state = DEMO_LEVELS[stationCode];

  try {
    const updated = await IoTState.findByIdAndUpdate(
      'demo-scenario',
      { stationCode, active: true, ...state, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({
      stationCode: updated.stationCode,
      active: updated.active,
      level: updated.level,
      led: updated.led,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    console.error('[iot:setDemoState]', err);
    return res.status(500).json({ message: 'Impossible d’enregistrer le scénario IoT.' });
  }
};

exports.getDemoState = async (req, res) => {
  try {
    const state = await IoTState.findById('demo-scenario').lean();
    return res.json({
      stationCode: state?.stationCode || null,
      active: state?.active ?? false,
      level: state?.active ? state.level : 'normal',
      led: state?.active ? state.led : 'green',
      updatedAt: state?.updatedAt || null
    });
  } catch (err) {
    console.error('[iot:getDemoState]', err);
    return res.status(500).json({ message: 'Impossible de lire le scénario IoT.' });
  }
};

exports.postMeasurement = async (req, res) => {
  const stationCode = process.env.IOT_STATION_CODE;
  if (!stationCode) {
    return res.status(503).json({ message: 'La station de l’appareil IoT n’est pas configurée.' });
  }

  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Un objet JSON est requis.' });
    }
    const station = await findStation(stationCode);
    if (!station) {
      return res.status(503).json({ message: 'La station configurée pour l’appareil est introuvable.' });
    }

    const payload = req.body || {};
    const data = {};
    let hasMeasurement = false;
    for (const [field, [min, max]] of Object.entries(MEASUREMENT_RANGES)) {
      const value = payload[field];
      if (value === undefined || value === null) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) ||
          value < min || value > max) {
        return res.status(400).json({ message: `Valeur invalide pour ${field}.` });
      }
      data[field] = value;
      if (['temperature', 'humidity', 'pressure', 'rainfall', 'wind_speed', 'wind_direction'].includes(field)) {
        hasMeasurement = true;
      }
    }
    if (!hasMeasurement) {
      return res.status(400).json({ message: 'Au moins une mesure météorologique est requise.' });
    }

    const measuredAt = new Date(payload.measured_at || Date.now());
    if (Number.isNaN(measuredAt.getTime())) {
      return res.status(400).json({ message: 'La date de mesure est invalide.' });
    }
    if (payload.device_status !== undefined &&
        !['ONLINE', 'OFFLINE', 'ERROR'].includes(payload.device_status)) {
      return res.status(400).json({ message: 'État du dispositif invalide.' });
    }

    const saved = await Data.create({
      ...data,
      station: station._id,
      measured_at: measuredAt,
      device_status: payload.device_status || 'ONLINE',
      firmware_version: typeof payload.firmware_version === 'string'
        ? payload.firmware_version.slice(0, 100)
        : undefined,
      source: 'SENSOR'
    });
    const weatherState = classifyWeather(saved);
    const alerts = await checkWeatherAlerts({
      ...saved.toObject(),
      deviceUUID: station.uuid || station.code,
      windSpeed: (saved.wind_speed || 0) * 3.6
    });

    return res.status(201).json({
      message: 'Mesure enregistrée.',
      stationCode: station.code,
      measured_at: saved.measured_at,
      ...weatherState,
      alertsGenerated: alerts
    });
  } catch (err) {
    console.error('[iot:postMeasurement]', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Les données de mesure sont invalides.' });
    }
    return res.status(500).json({ message: 'Impossible d’enregistrer la mesure IoT.' });
  }
};
