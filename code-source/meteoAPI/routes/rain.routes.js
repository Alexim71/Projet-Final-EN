const express = require('express');
const router = express.Router();
const rainController = require('../controllers/rain.controller');

router.get('/rain-zones',         rainController.getRainZones);
router.get('/rain-history',       rainController.getRainHistory);
router.get('/department-summary', rainController.getDepartmentSummary);

module.exports = router;