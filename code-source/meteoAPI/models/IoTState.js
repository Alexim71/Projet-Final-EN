const mongoose = require('mongoose');

const iotStateSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'demo-scenario'
  },
  stationCode: {
    type: String,
    enum: ['DEMO-PAP-01', 'DEMO-PAP-02', 'DEMO-PAP-03'],
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  level: {
    type: String,
    enum: ['normal', 'warning', 'critical'],
    default: 'normal'
  },
  led: {
    type: String,
    enum: ['green', 'yellow', 'red'],
    default: 'green'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'iot_state',
  versionKey: false
});

module.exports = mongoose.model('IoTState', iotStateSchema);
