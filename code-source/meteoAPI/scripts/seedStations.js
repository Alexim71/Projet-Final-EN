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
  // Station 1 – Normal (température ~27°C, humidité modérée, vent léger)
  {
    temperature: 27.4,
    humidity: 62,
    pressure: 1013.2,
    rainfall: 0,
    wind_speed: 3.8,      // m/s ≈ 14 km/h
    wind_direction: 112,
    solar_radiation: 620,
    uv_index: 6,
    visibility: 14,
    dew_point: 19.8,
    battery_level: 92,
    signal_strength: -62,
    device_status: 'ONLINE',
    feels_like: 29.1,
    heat_index: 29.5,
    source: 'SENSOR'
  },
  // Station 2 – Avertissement (forte chaleur, pluie modérée, vent fort)
  {
    temperature: 36.8,
    humidity: 84,
    pressure: 1005.7,
    rainfall: 18.4,
    wind_speed: 11.2,     // m/s ≈ 40 km/h
    wind_direction: 245,
    solar_radiation: 180,
    uv_index: 9,
    visibility: 6,
    dew_point: 33.1,
    battery_level: 74,
    signal_strength: -75,
    device_status: 'ONLINE',
    feels_like: 44.2,
    heat_index: 46.0,
    source: 'SENSOR'
  },
  // Station 3 – Critique (température extrême, pluie torrentielle, vent violent)
  {
    temperature: 42.5,
    humidity: 91,
    pressure: 995.3,
    rainfall: 87.6,
    wind_speed: 23.6,     // m/s ≈ 85 km/h (force ouragan Cat-1)
    wind_direction: 310,
    solar_radiation: 30,
    uv_index: 11,
    visibility: 1.2,
    dew_point: 40.8,
    battery_level: 41,
    signal_strength: -88,
    device_status: 'ONLINE',
    feels_like: 58.0,
    heat_index: 60.2,
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

    // Insert one data record with current timestamp
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
