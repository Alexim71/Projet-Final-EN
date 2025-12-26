const Alert = require('../models/Alert');


exports.getAlerts = async (req, res) => {
     const { uuid } = req.query;
      try {
        const filter = uuid ? { deviceUUID: uuid } : {};
        const alerts = await Alert.find(filter).sort({ createdAt: -1 });
        res.json(alerts);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    };