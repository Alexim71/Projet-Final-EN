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



    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lon, lat] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: 50_000,
          query: { status: 1 }
        }
      },
      {
        $lookup: {
          from: 'data',
          let: { stationId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$station', '$$stationId'] } } },
            { $sort: { measured_at: -1 } },
            { $limit: 1 }
          ],
          as: 'latestData'
        }
      },
      {
        $unwind: {
          path: '$latestData',
          preserveNullAndEmptyArrays: true
        }
      },
      { $limit: 1 }
    ];

    const result = await Station.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        message: 'Aucune station proche trouvée'
      });
    }

    res.json({
      station: result[0],
      data: result[0].latestData || null
    });

  } catch (err) {
    console.error('[GeoController]', err);
    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
};
