const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geo.controller');




router.get('/nearest',       geoController.getNearestStation);
router.get('/realtime',      geoController.getRealtime);
router.get('/forecast',      geoController.getForecast);
router.get('/demo-stations', geoController.getDemoStations);
router.get('/station/:code', geoController.getStationByCode);

module.exports = router;
