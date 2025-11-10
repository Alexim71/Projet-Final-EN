const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  deviceUUID: { type: String, required: true },     // identifiant du capteur ou station
  temperature: { type: Number, required: false },
  humidity: { type: Number, required: false },
  pressure: { type: Number, required: false },
  windSpeed: { type: Number, required: false },
  timestamp: { type: Date, default: Date.now }      // champ time-series
}, { timestamps: true });

module.exports = mongoose.model('Data', dataSchema, 'data');
