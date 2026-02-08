const Station = require('../models/Station');

/**
 * Récupérer les zones de pluie pour la carte
 * GET /api/rain/rain-zones?bounds=minLat,minLon,maxLat,maxLon&resolution=...
 */
exports.getRainZones = async (req, res) => {
  try {
    // Option 1: Récupération par bounds (rectangle géographique)
    if (req.query.bounds) {
      const bounds = req.query.bounds.split(',').map(parseFloat);
      if (bounds.length !== 4 || bounds.some(isNaN)) {
        return res.status(400).json({
          message: 'Format bounds incorrect. Utilisez: minLat,minLon,maxLat,maxLon'
        });
      }

      const [minLat, minLon, maxLat, maxLon] = bounds;
      
      // Pipeline pour récupérer les stations dans la zone avec leurs dernières données
      const pipeline = [
        {
          $match: {
            location: {
              $geoWithin: {
                $box: [
                  [minLon, minLat], // Coin inférieur gauche
                  [maxLon, maxLat]  // Coin supérieur droit
                ]
              }
            },
            status: 1
          }
        },
        {
          $lookup: {
            from: 'data',
            let: { stationId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { $eq: ['$station', '$$stationId'] },
                  measured_at: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Données des 30 dernières minutes
                } 
              },
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
        {
          $match: {
            'latestData.rainfall': { $exists: true, $gt: 0 } // Filtrer seulement les stations avec pluie
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            location: 1,
            rainfall: '$latestData.rainfall',
            measured_at: '$latestData.measured_at',
            intensity: {
              $cond: [
                { $lt: ['$latestData.rainfall', 2.5] },
                'light',
                {
                  $cond: [
                    { $lt: ['$latestData.rainfall', 7.5] },
                    'moderate',
                    'heavy'
                  ]
                }
              ]
            }
          }
        }
      ];

      const rainStations = await Station.aggregate(pipeline);

      // Option: Interpolation pour créer des zones continues
      const rainZones = rainStations.map(station => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: station.location.coordinates
        },
        properties: {
          stationId: station._id,
          name: station.name,
          rainfall: station.rainfall,
          intensity: station.intensity,
          measuredAt: station.measured_at
        }
      }));

      res.json({
        type: 'FeatureCollection',
        features: rainZones,
        metadata: {
          count: rainZones.length,
          bounds: { minLat, minLon, maxLat, maxLon },
          timestamp: new Date().toISOString()
        }
      });

    } 
    // Option 2: Récupération autour d'un point (pour zoom)
    else if (req.query.lat && req.query.lon) {
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      const radius = parseInt(req.query.radius) || 10000; // 10km par défaut
      const resolution = parseInt(req.query.resolution) || 10; // Nombre de stations max

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
            maxDistance: radius,
            query: { status: 1 }
          }
        },
        {
          $lookup: {
            from: 'data',
            let: { stationId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { $eq: ['$station', '$$stationId'] },
                  rainfall: { $exists: true },
                  measured_at: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
                } 
              },
              { $sort: { measured_at: -1 } },
              { $limit: 1 }
            ],
            as: 'latestData'
          }
        },
        {
          $unwind: {
            path: '$latestData',
            preserveNullAndEmptyArrays: false
          }
        },
        { $limit: resolution },
        {
          $project: {
            _id: 1,
            name: 1,
            location: 1,
            distance: 1,
            rainfall: '$latestData.rainfall',
            measured_at: '$latestData.measured_at',
            intensity: {
              $switch: {
                branches: [
                  { case: { $lt: ['$latestData.rainfall', 0.5] }, then: 'very-light' },
                  { case: { $lt: ['$latestData.rainfall', 2.5] }, then: 'light' },
                  { case: { $lt: ['$latestData.rainfall', 7.5] }, then: 'moderate' },
                  { case: { $lt: ['$latestData.rainfall', 15] }, then: 'heavy' }
                ],
                default: 'violent'
              }
            }
          }
        }
      ];

      const result = await Station.aggregate(pipeline);

      // Créer un heatmap/contour si nécessaire
      const gridSize = 0.1; // Degrés pour la grille
      const gridData = result.reduce((grid, station) => {
        const coords = station.location.coordinates;
        const gridX = Math.floor(coords[0] / gridSize);
        const gridY = Math.floor(coords[1] / gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!grid[key]) {
          grid[key] = {
            total: 0,
            count: 0,
            stations: []
          };
        }
        
        grid[key].total += station.rainfall;
        grid[key].count++;
        grid[key].stations.push(station._id);
        
        return grid;
      }, {});

      // Convertir en zones géojson
      const zones = Object.entries(gridData).map(([key, data]) => {
        const [gridX, gridY] = key.split(',').map(Number);
        const avgRainfall = data.total / data.count;
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [gridX * gridSize, gridY * gridSize],
              [(gridX + 1) * gridSize, gridY * gridSize],
              [(gridX + 1) * gridSize, (gridY + 1) * gridSize],
              [gridX * gridSize, (gridY + 1) * gridSize],
              [gridX * gridSize, gridY * gridSize]
            ]]
          },
          properties: {
            avgRainfall,
            stationCount: data.count,
            stations: data.stations
          }
        };
      });

      res.json({
        type: 'FeatureCollection',
        features: zones,
        stations: result,
        metadata: {
          center: { lat, lon },
          radius,
          gridSize,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return res.status(400).json({
        message: 'Fournissez soit bounds soit lat/lon'
      });
    }

  } catch (err) {
    console.error('[GeoController] Erreur rain-zones:', err);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des zones de pluie'
    });
  }
};

/**
 * Récupérer les données historiques de pluie pour animation
 * GET /api/geo/rain-history?hours=24&bounds=...
 */
exports.getRainHistory = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 6;
    const bounds = req.query.bounds ? req.query.bounds.split(',').map(parseFloat) : null;
    
    const matchStage = { status: 1 };
    
    if (bounds && bounds.length === 4) {
      const [minLat, minLon, maxLat, maxLon] = bounds;
      matchStage.location = {
        $geoWithin: {
          $box: [
            [minLon, minLat],
            [maxLon, maxLat]
          ]
        }
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'data',
          let: { stationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$station', '$$stationId'] },
                rainfall: { $exists: true, $gt: 0 },
                measured_at: {
                  $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
                }
              }
            },
            { $sort: { measured_at: 1 } },
            {
              $project: {
                rainfall: 1,
                measured_at: 1,
                hour: { $hour: '$measured_at' }
              }
            }
          ],
          as: 'rainData'
        }
      },
      {
        $match: {
          'rainData.0': { $exists: true }
        }
      },
      { $limit: 50 } // Limiter le nombre de stations pour performance
    ];

    const stationsWithHistory = await Station.aggregate(pipeline);

    res.json({
      stations: stationsWithHistory.map(station => ({
        id: station._id,
        name: station.name,
        location: station.location,
        rainHistory: station.rainData
      })),
      metadata: {
        hours,
        count: stationsWithHistory.length,
        fromDate: new Date(Date.now() - hours * 60 * 60 * 1000),
        toDate: new Date()
      }
    });

  } catch (err) {
    console.error('[GeoController] Erreur rain-history:', err);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération de l\'historique'
    });
  }
};