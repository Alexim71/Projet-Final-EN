const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geo.controller');



/**
 * GET /api/geo/nearest
 */
router.get('/nearest', geoController.getNearestStation);

module.exports = router;
