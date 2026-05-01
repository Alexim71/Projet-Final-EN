const Station = require('../models/Station');
const Data    = require('../models/Data');

// ─── Données fixes pour les stations démo ────────────────────────────────────
// Ces valeurs sont retournées directement sans passer par MongoDB,
// garantissant un niveau d'alerte prévisible pour les tests.
const DEMO_FIXED_DATA = {
  'DEMO-PAP-01': {
    temperature: 30.0, humidity: 65,   pressure: 1013.0, rainfall: 1.5,
    wind_speed: 2.8,   wind_direction: 112, solar_radiation: 580, uv_index: 5,
    visibility: 15,    dew_point: 21.0, battery_level: 92, signal_strength: -61,
    device_status: 'ONLINE', feels_like: 31.5, heat_index: 32.0, source: 'SENSOR',
  },
  'DEMO-PAP-02': {
    temperature: 35.0, humidity: 82,   pressure: 997.0,  rainfall: 22.0,
    wind_speed: 14.0,  wind_direction: 245, solar_radiation: 190, uv_index: 8,
    visibility: 7,     dew_point: 31.5, battery_level: 73, signal_strength: -74,
    device_status: 'ONLINE', feels_like: 42.0, heat_index: 43.5, source: 'SENSOR',
  },
  'DEMO-PAP-03': {
    temperature: 40.0, humidity: 96,   pressure: 985.0,  rainfall: 55.0,
    wind_speed: 25.0,  wind_direction: 310, solar_radiation: 25,  uv_index: 11,
    visibility: 1.5,   dew_point: 39.0, battery_level: 38, signal_strength: -87,
    device_status: 'ONLINE', feels_like: 55.0, heat_index: 57.0, source: 'SENSOR',
  },
};

/**
 * Trouver la station météo la plus proche
 * GET /api/geo/nearest?lat=..&lon=..
 */
exports.getNearestStation = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) { 
      return res.status(400).json({
        message: 'Latitude et longitude requises'
      });
    }



    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lon, lat] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: 50_000,
          query: { status: 1 }
        }
      },
      {
        $lookup: {
          from: 'data',
          let: { stationId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$station', '$$stationId'] } } },
            { $sort: { measured_at: -1 } },
            { $limit: 1 }
          ],
          as: 'latestData'
        }
      },
      {
        $unwind: {
          path: '$latestData',
          preserveNullAndEmptyArrays: true
        }
      },
      { $limit: 1 }
    ];

    const result = await Station.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        message: 'Aucune station proche trouvée'
      });
    }

    res.json({
      station: result[0],
      data: result[0].latestData || null
    });

  } catch (err) {
    console.error('[GeoController]', err);
    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
};

/**
 * Données météo temps réel via Open-Meteo + adresse via Nominatim (OpenStreetMap)
 * GET /api/geo/realtime?lat=..&lon=..
 */
exports.getRealtime = async (req, res) => {
  const axios = require('axios');
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ message: 'Latitude et longitude requises' });
  }

  try {
    // 1. Météo temps réel depuis Open-Meteo
    const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: [
          'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
          'precipitation', 'rain', 'surface_pressure',
          'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
          'shortwave_radiation', 'uv_index', 'visibility', 'dew_point_2m'
        ].join(','),
        timezone: 'auto'
      },
      timeout: 10000
    });
    const raw = weatherRes.data.current;

    // 2. Adresse lisible via Nominatim (OpenStreetMap) — gratuit, sans clé
    let address = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    let department = '';
    try {
      const geoRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon, format: 'json', 'accept-language': 'fr' },
        headers: { 'User-Agent': 'URGmetEO/1.0 (urgmeteo@gmail.com)' },
        timeout: 6000
      });
      const geo = geoRes.data?.address ?? {};
      const clean = (s) => (s || '')
        .replace(/^(Arrondissement|Commune|D[eé]partement)\s+(de\s+(l[''e]|la\s+|les\s+)?|du\s+|d[ue]\s+)?/i, '')
        .trim();
      const rawCity  = clean(geo.city || geo.town || geo.village || geo.suburb || geo.county || '');
      const rawState = clean(geo.state || geo.region || '');
      address    = [rawCity, rawState].filter(Boolean).join(', ') || address;
      department = rawState;
    } catch (_) { /* Nominatim indisponible → on garde les coordonnées */ }

    const now = new Date();
    res.json({
      station: {
        _id: null,
        code: 'REALTIME',
        address,
        department,
        latitude: lat,
        longitude: lon,
        status: 1
      },
      data: {
        temperature:     raw.temperature_2m,
        humidity:        raw.relative_humidity_2m,
        pressure:        raw.surface_pressure,
        rainfall:        raw.precipitation ?? raw.rain ?? 0,
        wind_speed:      (raw.wind_speed_10m ?? 0) / 3.6,   // km/h → m/s
        wind_direction:  raw.wind_direction_10m ?? 0,
        solar_radiation: raw.shortwave_radiation ?? 0,
        uv_index:        raw.uv_index ?? 0,
        visibility:      (raw.visibility ?? 0) / 1000,       // m → km
        dew_point:       raw.dew_point_2m ?? 0,
        feels_like:      raw.apparent_temperature ?? raw.temperature_2m,
        battery_level:   100,
        signal_strength: -60,
        device_status:   'ONLINE',
        measured_at:     now,
        source:          'IMPORT'
      }
    });
  } catch (err) {
    console.error('[getRealtime]', err.message);
    res.status(500).json({ message: 'Impossible de récupérer la météo temps réel' });
  }
};

/**
 * Lister les stations de démo avec leurs dernières données
 * GET /api/geo/demo-stations
 */
exports.getDemoStations = async (req, res) => {
  try {
    const stations = await Station.find({ code: /^DEMO-/ }).sort({ code: 1 });
    const now = new Date();

    const result = stations.map(station => ({
      station,
      // Données fixes si station démo connue, sinon MongoDB
      data: DEMO_FIXED_DATA[station.code]
        ? { ...DEMO_FIXED_DATA[station.code], measured_at: now, received_at: now }
        : null,
    }));

    res.json(result);
  } catch (err) {
    console.error('[getDemoStations]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Prévisions 7 jours + données horaires via Open-Meteo
 * GET /api/geo/forecast?lat=..&lon=..
 */
exports.getForecast = async (req, res) => {
  const axios = require('axios');
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ message: 'lat et lon requis' });
  }

  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude:  lat,
        longitude: lon,
        daily: [
          'temperature_2m_max', 'temperature_2m_min',
          'precipitation_sum', 'weathercode',
          'wind_speed_10m_max', 'wind_gusts_10m_max',
          'wind_direction_10m_dominant',
          'relative_humidity_2m_max', 'surface_pressure_mean',
          'precipitation_probability_max',
          'uv_index_max',
          'sunrise', 'sunset'
        ].join(','),
        hourly: [
          'temperature_2m', 'apparent_temperature',
          'precipitation', 'precipitation_probability',
          'surface_pressure',
          'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
          'relative_humidity_2m', 'weathercode',
          'uv_index'
        ].join(','),
        forecast_days: 10,
        timezone: 'auto'
      },
      timeout: 12000
    });

    const d = response.data;

    const daily = d.daily.time.map((date, i) => ({
      date,
      tempMax:        d.daily.temperature_2m_max[i],
      tempMin:        d.daily.temperature_2m_min[i],
      precipitation:  d.daily.precipitation_sum[i],
      weathercode:    d.daily.weathercode[i],
      windSpeedMax:   d.daily.wind_speed_10m_max[i],
      windGustsMax:   d.daily.wind_gusts_10m_max[i],
      windDirDominant: d.daily.wind_direction_10m_dominant[i],
      humidityMax:    d.daily.relative_humidity_2m_max[i],
      pressureMean:   d.daily.surface_pressure_mean[i],
      rainProba:      d.daily.precipitation_probability_max[i] ?? null,
      uvIndexMax:     d.daily.uv_index_max[i] ?? null,
      sunrise:        d.daily.sunrise[i] ?? null,
      sunset:         d.daily.sunset[i] ?? null,
    }));

    const hourly = d.hourly.time.map((time, i) => ({
      time,
      temperature:   d.hourly.temperature_2m[i],
      feelsLike:     d.hourly.apparent_temperature[i],
      precipitation: d.hourly.precipitation[i],
      rainProba:     d.hourly.precipitation_probability[i] ?? null,
      pressure:      d.hourly.surface_pressure[i],
      windSpeed:     d.hourly.wind_speed_10m[i],
      windDirection: d.hourly.wind_direction_10m[i],
      windGusts:     d.hourly.wind_gusts_10m[i],
      humidity:      d.hourly.relative_humidity_2m[i],
      weathercode:   d.hourly.weathercode[i],
      uvIndex:       d.hourly.uv_index[i] ?? null,
    }));

    res.json({ daily, hourly });
  } catch (err) {
    console.error('[getForecast]', err.message);
    res.status(500).json({ message: 'Impossible de récupérer les prévisions' });
  }
};

/**
 * Récupérer une station par son code avec sa dernière mesure
 * GET /api/geo/station/:code
 */
exports.getStationByCode = async (req, res) => {
  try {
    const code = req.params.code;
    const station = await Station.findOne({ code });
    if (!station) return res.status(404).json({ message: 'Station non trouvée' });

    // Stations démo : données fixes garanties, indépendantes de MongoDB
    if (DEMO_FIXED_DATA[code]) {
      const now = new Date();
      return res.json({
        station,
        data: { ...DEMO_FIXED_DATA[code], measured_at: now, received_at: now },
      });
    }

    const data = await Data.findOne({ station: station._id })
      .sort({ measured_at: -1 });

    res.json({ station, data: data || null });
  } catch (err) {
    console.error('[getStationByCode]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
