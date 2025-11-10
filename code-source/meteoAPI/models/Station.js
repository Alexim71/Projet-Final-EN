const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  name: { type: String, required: false },       
  location: { type: String, required: false },   
  latitude: { type: Number, required: false },
  longitude: { type: Number, required: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Station', stationSchema, 'station');
