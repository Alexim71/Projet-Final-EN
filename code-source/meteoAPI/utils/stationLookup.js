const mongoose = require('mongoose');
const Station = require('../models/Station');

module.exports = async function findStation(identifier) {
  if (typeof identifier !== 'string' || !identifier.trim()) return null;
  const value = identifier.trim();

  if (mongoose.Types.ObjectId.isValid(value)) {
    const station = await Station.findById(value);
    if (station) return station;
  }

  return Station.findOne({ $or: [{ uuid: value }, { code: value }] });
};
