const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  deviceUUID: { type: String, required: true },     
  temperature: { type: Number, required: false },
  humidity: { type: Number, required: false },
  pressure: { type: Number, required: false },
   rainfall: { type: Number }, 
  windSpeed: { type: Number, required: false },
  timestamp: { type: Date, default: Date.now }      
}, { timestamps: true });

module.exports = mongoose.model('Data', dataSchema, 'data');
