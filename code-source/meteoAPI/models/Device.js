const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  // Tu peux ajouter d'autres champs si nécessaire
  // nom: String,
  // location: { type: { type: String }, coordinates: [Number] },
}, { timestamps: true }); // ajoute createdAt et updatedAt automatiquement

module.exports = mongoose.model('Device', deviceSchema, 'device'); // 3e param = nom collection existante