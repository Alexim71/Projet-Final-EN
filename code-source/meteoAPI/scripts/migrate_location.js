const mongoose = require('mongoose');
const Station = require('../models/Station');

async function migrate() {
  await mongoose.connect('mongodb://127.0.0.1:27017/meteo_db');

  const stations = await Station.find({});

  for (const s of stations) {
    if (
      (!s.location || !s.location.coordinates) &&
      s.latitude != null &&
      s.longitude != null
    ) {
      s.location = {
        type: 'Point',
        coordinates: [s.longitude, s.latitude] // ⚠️ ordre IMPORTANT
      };
      await s.save();
      console.log('Migrated:', s.code);
    }
  }

  await mongoose.disconnect();
  console.log('Migration terminée');
}

migrate();
