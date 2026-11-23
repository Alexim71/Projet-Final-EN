const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireDeviceToken = require('../middleware/requireDeviceToken');
const iotController = require('../controllers/iotController');

const router = express.Router();

router.post('/demo-state', requireAuth, iotController.setDemoState);
router.get('/demo-state', requireDeviceToken, iotController.getDemoState);
router.post('/measurements', requireDeviceToken, iotController.postMeasurement);

module.exports = router;
