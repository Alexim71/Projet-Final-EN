const Station = require('../models/Station');

/**
 * Trouver la station météo la plus proche
 * GET /api/geo/nearest?lat=..&lon=..
 */
exports.getNearestStation = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        message: 'Latitude et longitude requises'
      });
    }

    const station = await Station.findOne({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat] // ⚠️ ordre obligatoire
          },
          $maxDistance: 50_000 // 50 km
        }
      },
      status: 1
    }).lean();

    if (!station) {
      return res.status(404).json({
        message: 'Aucune station proche trouvée'
      });
    }

    res.json({
      station
    });

  } catch (err) {
    console.error('[GeoController]', err);
    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
};
