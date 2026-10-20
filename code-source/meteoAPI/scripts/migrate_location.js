require('dotenv').config();
const mongoose = require('mongoose');
const Station = require('../models/Station');

async function migrate() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGO_URI (ou MONGODB_URI) doit être configuré.');
  await mongoose.connect(mongoUri);

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
