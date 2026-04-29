const axios = require('axios');

const GRID_SIZE = 3; // 3×3 = 9 points en parallèle

async function fetchOpenMeteoPoint(lat, lon, forecastHours = 0) {
  try {
    if (forecastHours === 0) {
      // Données actuelles
      const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: { latitude: lat, longitude: lon, current: 'precipitation,rain,showers,snowfall', timezone: 'auto' },
        timeout: 8000
      });
      const c = res.data.current;
      return { lat, lon, rainfall: Math.max(c.precipitation ?? 0, c.rain ?? 0, c.showers ?? 0) };
    } else {
      // Prévision : total des précipitations sur les N prochaines heures
      const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: { latitude: lat, longitude: lon, hourly: 'precipitation', forecast_hours: forecastHours, timezone: 'auto' },
        timeout: 8000
      });
      const precip = res.data.hourly?.precipitation ?? [];
      const total  = precip.slice(0, forecastHours).reduce((s, v) => s + (v ?? 0), 0);
      return { lat, lon, rainfall: parseFloat(total.toFixed(2)) };
    }
  } catch {
    return { lat, lon, rainfall: null };
  }
}

function getIntensity(mm) {
  if (mm < 0.1)  return null;         // sec → exclure
  if (mm < 0.5)  return 'very-light';
  if (mm < 2.5)  return 'light';
  if (mm < 7.5)  return 'moderate';
  if (mm < 15)   return 'heavy';
  return 'violent';
}

/**
 * GET /api/rain/rain-zones?bounds=minLat,minLon,maxLat,maxLon
 * GET /api/rain/rain-zones?lat=X&lon=Y&radius=20000
 */
exports.getRainZones = async (req, res) => {
  try {
    let minLat, minLon, maxLat, maxLon;

    if (req.query.bounds) {
      const b = req.query.bounds.split(',').map(parseFloat);
      if (b.length !== 4 || b.some(isNaN)) {
        return res.status(400).json({ message: 'Format bounds: minLat,minLon,maxLat,maxLon' });
      }
      [minLat, minLon, maxLat, maxLon] = b;

    } else if (req.query.lat && req.query.lon) {
      const lat   = parseFloat(req.query.lat);
      const lon   = parseFloat(req.query.lon);
      const delta = ((parseInt(req.query.radius) || 20000) / 111000) * 1.5;
      minLat = lat - delta;  maxLat = lat + delta;
      minLon = lon - delta;  maxLon = lon + delta;

    } else {
      return res.status(400).json({ message: 'Fournissez bounds ou lat/lon' });
    }

    // Grille GRID_SIZE × GRID_SIZE sur la zone visible
    const gridPoints = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        gridPoints.push({
          lat: minLat + (maxLat - minLat) * (i + 0.5) / GRID_SIZE,
          lon: minLon + (maxLon - minLon) * (j + 0.5) / GRID_SIZE
        });
      }
    }

    const forecastHours = parseInt(req.query.hours) || 0;

    // Appels parallèles Open-Meteo
    const results = await Promise.all(gridPoints.map(p => fetchOpenMeteoPoint(p.lat, p.lon, forecastHours)));

    const features = results
      .filter(r => r.rainfall !== null)
      .map(r => {
        const intensity = getIntensity(r.rainfall);
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [r.lon, r.lat]
          },
          properties: {
            stationId:   `om_${r.lat.toFixed(3)}_${r.lon.toFixed(3)}`,
            name:        `Zone (${r.lat.toFixed(2)}, ${r.lon.toFixed(2)})`,
            rainfall:    parseFloat(r.rainfall.toFixed(2)),
            intensity:   intensity || 'very-light',
            hasRain:     r.rainfall >= 0.1,
            measuredAt:  new Date().toISOString(),
            source:      'Open-Meteo'
          }
        };
      });

    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        count:      features.filter(f => f.properties.hasRain).length,
        gridPoints: gridPoints.length,
        source:     'Open-Meteo',
        timestamp:  new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[RainController]', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const HAITI_DEPARTMENTS = [
  { name: 'Artibonite', lat: 19.4569, lon: -72.6884 },
  { name: 'Centre',     lat: 19.1500, lon: -71.9667 },
  { name: "Grand'Anse", lat: 18.6500, lon: -74.1167 },
  { name: 'Nippes',     lat: 18.4500, lon: -73.1000 },
  { name: 'Nord',       lat: 19.7578, lon: -72.2006 },
  { name: 'Nord-Est',   lat: 19.6667, lon: -71.8333 },
  { name: 'Nord-Ouest', lat: 19.9333, lon: -72.8333 },
  { name: 'Ouest',      lat: 18.5425, lon: -72.3386 },
  { name: 'Sud',        lat: 18.1942, lon: -73.7497 },
  { name: 'Sud-Est',    lat: 18.2341, lon: -72.5362 },
];

/**
 * GET /api/rain/department-summary
 * Retourne le statut météo (pluie ou soleil) pour chacun des 10 départements d'Haïti
 */
exports.getDepartmentSummary = async (req, res) => {
  try {
    const forecastHours = parseInt(req.query.hours) || 0;
    const results = await Promise.all(
      HAITI_DEPARTMENTS.map(async (d) => {
        const r = await fetchOpenMeteoPoint(d.lat, d.lon, forecastHours);
        const rainfall = r.rainfall ?? 0;
        return {
          name:      d.name,
          lat:       d.lat,
          lon:       d.lon,
          rainfall:  parseFloat(rainfall.toFixed(2)),
          intensity: getIntensity(rainfall) || null,
          hasRain:   rainfall >= 0.1,
        };
      })
    );
    res.json({ departments: results, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[DepartmentSummary]', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * GET /api/rain/rain-history?hours=6&bounds=...
 */
exports.getRainHistory = async (req, res) => {
  const Station = require('../models/Station');
  try {
    const hours  = parseInt(req.query.hours) || 6;
    const bounds = req.query.bounds ? req.query.bounds.split(',').map(parseFloat) : null;

    const matchStage = { status: 1 };
    if (bounds && bounds.length === 4) {
      const [minLat, minLon, maxLat, maxLon] = bounds;
      matchStage.location = {
        $geoWithin: { $box: [[minLon, minLat], [maxLon, maxLat]] }
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
                measured_at: { $gte: new Date(Date.now() - hours * 3600000) }
              }
            },
            { $sort: { measured_at: 1 } },
            { $project: { rainfall: 1, measured_at: 1 } }
          ],
          as: 'rainData'
        }
      },
      { $match: { 'rainData.0': { $exists: true } } },
      { $limit: 50 }
    ];

    const stations = await Station.aggregate(pipeline);

    res.json({
      stations: stations.map(s => ({
        id: s._id, name: s.name, location: s.location, rainHistory: s.rainData
      })),
      metadata: { hours, count: stations.length, timestamp: new Date().toISOString() }
    });

  } catch (err) {
    console.error('[RainHistory]', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
