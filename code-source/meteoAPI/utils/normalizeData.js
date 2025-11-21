// utils/normalizeData.js

function toNumber(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function round(value, decimals = 2) {
  if (typeof value !== 'number') return value;
  return Number(value.toFixed(decimals));
}


module.exports.normalizeWeatherPayload = (payload) => {
  const data = { ...payload };

  // Température (Kelvin -> °C si > 100)
  if (data.temperature !== undefined) {
    data.temperature = toNumber(data.temperature);
    if (data.temperature > 80) {
      // Ex: 300K -> 27°C
      data.temperature = data.temperature - 273.15;
    }
     data.temperature = round(data.temperature, 2);
  }

  // Vent (m/s -> km/h si <= 25 m/s)
  if (data.windSpeed !== undefined) {
    const v = toNumber(data.windSpeed);
    if (v <= 25) {
      data.windSpeed = round(v * 3.6, 2); // conversion m/s -> km/h
    } else {
      data.windSpeed = round(v, 2); // déjà km/h
    }
  }

  // Pression (Pa -> hPa si très grosse valeur)
  if (data.pressure !== undefined) {
    const p = toNumber(data.pressure);
    if (p > 2000) {
      data.pressure = round(p / 100, 2); // Pa -> hPa
    } else {
      data.pressure = round(p, 2);
    }
  }

  // Pluie (L/m² = mm) — on normalise juste le type
  if (data.rainfall !== undefined) {
    data.rainfall = round(toNumber(data.rainfall), 2);
  }

  return data;
};
