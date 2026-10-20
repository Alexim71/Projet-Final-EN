require('dotenv').config();
const mongoose = require('mongoose');
const Station = require('../models/Station');
const Data = require('../models/Data');

async function migrate() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGO_URI (ou MONGODB_URI) doit être configuré.');
  await mongoose.connect(mongoUri);

  let migrated = 0;
  let skipped = 0;
  const legacyRecords = Data.collection.find({
    $or: [{ station: { $exists: false } }, { station: null }],
    deviceUUID: { $exists: true },
    timestamp: { $exists: true }
  });

  for await (const record of legacyRecords) {
    const station = await Station.findOne({
      $or: [{ uuid: record.deviceUUID }, { code: record.deviceUUID }]
    });
    const measuredAt = record.timestamp == null ? null : new Date(record.timestamp);
    if (!station || !measuredAt || Number.isNaN(measuredAt.getTime())) {
      skipped += 1;
      console.warn(`Mesure ${record._id} ignorée: station ou date introuvable.`);
      continue;
    }

    const update = {
      station: station._id,
      measured_at: measuredAt
    };
    if (record.windSpeed != null && Number.isFinite(Number(record.windSpeed))) {
      update.wind_speed = Number(record.windSpeed) / 3.6;
    }
    await Data.collection.updateOne(
      { _id: record._id },
      { $set: update, $unset: { deviceUUID: '', timestamp: '', windSpeed: '' } }
    );
    migrated += 1;
  }

  await mongoose.disconnect();
  console.log(`Migration terminée: ${migrated} migrée(s), ${skipped} ignorée(s).`);
}

migrate().catch(async err => {
  console.error('Échec de la migration des mesures:', err);
  await mongoose.disconnect();
  process.exitCode = 1;
});
