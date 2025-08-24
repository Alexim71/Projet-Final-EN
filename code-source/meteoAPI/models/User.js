const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  motDePasse: { type: String },
  estVerifie: { type: Boolean, default: false },
  tokenConfirmation: { type: String }
});

module.exports = mongoose.model('User', userSchema);
