const express = require('express');
const router = express.Router();
const rainController = require('../controllers/rain.controller');

router.get('/rain-zones', rainController.getRainZones); // Nouvelle route
router.get('/rain-history', rainController.getRainHistory); // Optionnelle pour animation

module.exports = router;