const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceUUID: { type: String, required: true },
  type: { type: String, required: true }, // Exemple : "CANICULE", "VENT_FORT"
  message: { type: String, required: true },
  level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema, 'alerts');
