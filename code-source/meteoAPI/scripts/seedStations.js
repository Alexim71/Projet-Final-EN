/**
 * Seed 3 demo stations near Port-au-Prince with normal / warning / critical data.
 * Run: node scripts/seedStations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Station = require('../models/Station');
const Data    = require('../models/Data');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/meteo_db2';

const stations = [
  {
    code: 'DEMO-PAP-01',
    description: 'Station Centre-Ville – Données normales',
    latitude:  18.5433,
    longitude: -72.3395,
    altitude: 37,
    address: 'Centre-Ville, Port-au-Prince',
    department: 'Ouest',
    province: 'Port-au-Prince',
    status: 1,
    location: { type: 'Point', coordinates: [-72.3395, 18.5433] },
    installation_date: new Date('2024-01-15'),
    _class: 'ht.edu.fds.recicamet.domain.Station'
  },
  {
    code: 'DEMO-PAP-02',
    description: 'Station Pétion-Ville – Données d\'avertissement',
    latitude:  18.5123,
    longitude: -72.2894,
    altitude: 196,
    address: 'Pétion-Ville, Port-au-Prince',
    department: 'Ouest',
    province: 'Port-au-Prince',
    status: 1,
    location: { type: 'Point', coordinates: [-72.2894, 18.5123] },
    installation_date: new Date('2024-02-10'),
    _class: 'ht.edu.fds.recicamet.domain.Station'
  },
  {
    code: 'DEMO-PAP-03',
    description: 'Station Delmas – Données critiques',
    latitude:  18.5601,
    longitude: -72.3105,
    altitude: 90,
    address: 'Delmas, Port-au-Prince',
    department: 'Ouest',
    province: 'Port-au-Prince',
    status: 1,
    location: { type: 'Point', coordinates: [-72.3105, 18.5601] },
    installation_date: new Date('2024-03-05'),
    _class: 'ht.edu.fds.recicamet.domain.Station'
  }
];

const dataPayloads = [
  // Station 1 – Normale (tous les paramètres sous les seuils d'avertissement)
  {
    temperature: 30.0,    // < 35°C  → normale
    humidity: 65,         // < 80%   → normale
    pressure: 1013.0,     // ≥ 1000  → normale
    rainfall: 1.5,        // < 20 mm → normale
    wind_speed: 2.8,      // m/s ≈ 10 km/h  < 50 → normale
    wind_direction: 112,
    solar_radiation: 580,
    uv_index: 5,
    visibility: 15,
    dew_point: 21.0,
    battery_level: 92,
    signal_strength: -61,
    device_status: 'ONLINE',
    feels_like: 31.5,
    heat_index: 32.0,
    source: 'SENSOR'
  },
  // Station 2 – Avertissement (tous les paramètres au seuil jaune)
  {
    temperature: 35.0,    // = 35°C  → avertissement
    humidity: 82,         // ≥ 80%   → avertissement
    pressure: 997.0,      // < 1000  → avertissement
    rainfall: 22.0,       // ≥ 20 mm → avertissement
    wind_speed: 14.0,     // m/s ≈ 50.4 km/h ≥ 50 → avertissement
    wind_direction: 245,
    solar_radiation: 190,
    uv_index: 8,
    visibility: 7,
    dew_point: 31.5,
    battery_level: 73,
    signal_strength: -74,
    device_status: 'ONLINE',
    feels_like: 42.0,
    heat_index: 43.5,
    source: 'SENSOR'
  },
  // Station 3 – Critique (tous les paramètres au seuil rouge)
  {
    temperature: 40.0,    // = 40°C  → critique
    humidity: 96,         // ≥ 95%   → critique
    pressure: 985.0,      // < 990   → critique
    rainfall: 55.0,       // ≥ 50 mm → critique
    wind_speed: 25.0,     // m/s = 90 km/h ≥ 90 → critique
    wind_direction: 310,
    solar_radiation: 25,
    uv_index: 11,
    visibility: 1.5,
    dew_point: 39.0,
    battery_level: 38,
    signal_strength: -87,
    device_status: 'ONLINE',
    feels_like: 55.0,
    heat_index: 57.0,
    source: 'SENSOR'
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connecté');

  for (let i = 0; i < stations.length; i++) {
    const stationDef = stations[i];
    const dataDef    = dataPayloads[i];

    // Upsert station by code
    let station = await Station.findOneAndUpdate(
      { code: stationDef.code },
      stationDef,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`📍 Station "${station.code}" — ${station.description}`);

    // Supprimer toutes les anciennes données pour cette station (évite que l'ancien enregistrement soit retourné)
    const deleted = await Data.deleteMany({ station: station._id });
    if (deleted.deletedCount > 0) console.log(`   🗑️  ${deleted.deletedCount} ancienne(s) donnée(s) supprimée(s)`);

    // Insérer le nouvel enregistrement avec l'heure actuelle
    const now = new Date();
    await Data.create({
      station: station._id,
      ...dataDef,
      measured_at: now,
      received_at: now
    });
    console.log(`   📊 Données insérées (temp=${dataDef.temperature}°C, wind=${dataDef.wind_speed} m/s, rain=${dataDef.rainfall} mm)`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Seed terminé. 3 stations + 3 jeux de données insérés.');
}

seed().catch(err => {
  console.error('❌ Erreur seed:', err.message);
  process.exit(1);
});
