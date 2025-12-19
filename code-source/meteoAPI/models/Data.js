const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
  // 🔗 Liaison station
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
    index: true
  },

  // 🌡️ Données météo principales
  temperature: Number,        // °C
  humidity: Number,           // %
  pressure: Number,           // hPa

  rainfall: Number,           // mm
  wind_speed: Number,         // m/s
  wind_direction: Number,     // degrés (0-360)

  solar_radiation: Number,    // W/m²
  uv_index: Number,
  visibility: Number,         // km

  dew_point: Number,          // °C

  // 🔋 Données capteur
  battery_level: Number,      // %
  signal_strength: Number,    // dBm
  device_status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'ERROR'],
    default: 'ONLINE'
  },
  firmware_version: String,
  error_code: String,

  // 🧠 Données calculées
  feels_like: Number,
  heat_index: Number,
  wind_chill: Number,

  // 🕒 Temps
  measured_at: {
    type: Date,
    required: true,
    index: true
  },
  received_at: {
    type: Date,
    default: Date.now
  },

  // 🧾 Métadonnées
  created_by: String,
  source: {
    type: String,
    enum: ['SENSOR', 'MANUAL', 'IMPORT'],
    default: 'SENSOR'
  }
},
{
  timestamps: true
});

// 🚀 Index composé (station + date)
DataSchema.index({ station: 1, measured_at: -1 });

module.exports = mongoose.model('Data', DataSchema);
