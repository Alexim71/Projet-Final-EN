// utils/dateUtils.js

exports.getTimeRange = (type) => {
  const now = new Date();
  let start;

  switch (type) {
    case 'day':
      // Période de 24 heures
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;

    case 'week':
      // Période de 7 jours
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;

    case 'hour':
      // Période de la dernière heure
      start = new Date(now);
      start.setHours(now.getHours() - 1);
      break;

    default:
      // Si aucun paramètre valide, retour depuis le début de la base
      start = new Date(0);
  }

  return { start, end: new Date() };
};
