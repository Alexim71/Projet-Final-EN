const THRESHOLDS = {
  temperature: { warning: 35, critical: 40 },
  humidity: { warning: 80, critical: 95 },
  pressure: { warning: 1000, critical: 990, lowerIsWorse: true },
  rainfall: { warning: 20, critical: 50 },
  windSpeedKmh: { warning: 50, critical: 90 }
};

function isCritical(value, threshold) {
  return threshold.lowerIsWorse
    ? value < threshold.critical
    : value >= threshold.critical;
}

function isWarning(value, threshold) {
  return threshold.lowerIsWorse
    ? value < threshold.warning
    : value >= threshold.warning;
}

function classifyWeather(data) {
  const readings = [
    [data.temperature, THRESHOLDS.temperature],
    [data.humidity, THRESHOLDS.humidity],
    [data.pressure, THRESHOLDS.pressure],
    [data.rainfall, THRESHOLDS.rainfall],
    [data.wind_speed === undefined ? undefined : data.wind_speed * 3.6, THRESHOLDS.windSpeedKmh]
  ];

  if (readings.some(([value, threshold]) =>
    value !== undefined && value !== null && isCritical(value, threshold)
  )) {
    return { level: 'critical', led: 'red' };
  }
  if (readings.some(([value, threshold]) =>
    value !== undefined && value !== null && isWarning(value, threshold)
  )) {
    return { level: 'warning', led: 'yellow' };
  }
  return { level: 'normal', led: 'green' };
}

module.exports = { classifyWeather, THRESHOLDS };
