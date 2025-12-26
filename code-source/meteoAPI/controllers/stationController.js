const Station = require('../models/Station');

exports.getStations = async (req, res) => {
  try {
    const stations = await Station.find().sort({ createdAt: -1 });
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.postStations = async (req, res) => {
  try {
    const newStation = new Station(req.body);
    await newStation.save();
    res.status(201).json({ message: "✅ Station ajoutée", newStation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};