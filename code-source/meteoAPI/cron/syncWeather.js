/**
 * Sync real weather data from Open-Meteo (free, no API key) into the 3 demo stations.
 * Runs every 10 minutes.
 */
const cron    = require('node-cron');
const axios   = require('axios');
const Station = require('../models/Station');
const Data    = require('../models/Data');

const DEMO_CODES = ['DEMO-PAP-01', 'DEMO-PAP-02', 'DEMO-PAP-03'];

// Open-Meteo free API — no key required
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const PARAMS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'rain',
  'surface_pressure',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'shortwave_radiation',
  'uv_index',
  'visibility',
  'dew_point_2m'
].join(',');

async function fetchOpenMeteo(lat, lon) {
  const { data } = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      current: PARAMS,
      timezone: 'America/Port-au-Prince'
    },
    timeout: 10000
  });
  return data.current;
}

async function syncStation(station) {
  const raw = await fetchOpenMeteo(station.latitude, station.longitude);

  const now = new Date();
  await Data.create({
    station:        station._id,
    temperature:    raw.temperature_2m,
    humidity:       raw.relative_humidity_2m,
    pressure:       raw.surface_pressure,
    rainfall:       raw.precipitation ?? raw.rain ?? 0,
    wind_speed:     (raw.wind_speed_10m ?? 0) / 3.6,   // km/h → m/s
    wind_direction: raw.wind_direction_10m,
    solar_radiation: raw.shortwave_radiation,
    uv_index:       raw.uv_index,
    visibility:     (raw.visibility ?? 0) / 1000,       // m → km
    dew_point:      raw.dew_point_2m,
    feels_like:     raw.apparent_temperature,
    battery_level:  100,
    signal_strength: -60,
    device_status:  'ONLINE',
    source:         'IMPORT',
    measured_at:    now,
    received_at:    now
  });

  // Update last_data_date on station
  await Station.findByIdAndUpdate(station._id, { last_data_date: now });

  console.log(`  ✅ ${station.code} — ${raw.temperature_2m}°C / wind ${raw.wind_speed_10m} km/h / rain ${raw.precipitation} mm`);
}

async function syncAll() {
  console.log(`[${new Date().toISOString()}] 🌤️  Sync Open-Meteo…`);
  try {
    const stations = await Station.find({ code: { $in: DEMO_CODES } });
    if (!stations.length) {
      console.log('  ⚠️  Aucune station DEMO trouvée. Lancez d\'abord: node scripts/seedStations.js');
      return;
    }
    for (const s of stations) {
      await syncStation(s);
    }
    console.log('  ✔️  Sync terminé.');
  } catch (err) {
    console.error('  ❌ Erreur sync Open-Meteo:', err.message);
  }
}

// Toutes les 10 minutes
cron.schedule('*/10 * * * *', syncAll);

// Aussi au démarrage du serveur
syncAll();

console.log('⏱️  Cron Open-Meteo chargé (sync toutes les 10 min).');
