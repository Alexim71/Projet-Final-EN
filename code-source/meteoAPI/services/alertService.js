const Alert = require('../models/Alert');

exports.checkWeatherAlerts = async (data) => {
  const alerts = [];

  // 1️⃣ Détection : Canicule
  if (data.temperature && data.temperature > 35) {
    alerts.push({
      type: 'CANICULE',
      message: `Température élevée (${data.temperature}°C) détectée`,
      level: 'high'
    });
  }

  // 2️⃣ Détection : Vent fort
  if (data.windSpeed && data.windSpeed > 80) {
    alerts.push({
      type: 'VENT_FORT',
      message: `Vent violent (${data.windSpeed} km/h) détecté`,
      level: 'high'
    });
  }

  // 3️⃣ Détection : Pression très basse (orage possible)
  if (data.pressure && data.pressure < 1000) {
    alerts.push({
      type: 'PRESSION_BASSE',
      message: `Pression atmosphérique basse (${data.pressure} hPa)`,
      level: 'medium'
    });
  }

  // 4️⃣ Détection : Forte pluie
  if (data.rainfall && data.rainfall > 10) {
    alerts.push({
      type: 'PLUIE_IMPORTANTE',
      message: `Précipitations fortes (${data.rainfall} mm)`,
      level: 'medium'
    });
  }

  // 💾 Enregistrer toutes les alertes détectées
  for (const a of alerts) {
    await Alert.create({
      deviceUUID: data.deviceUUID,
      ...a
    });
  }

  return alerts;
};
