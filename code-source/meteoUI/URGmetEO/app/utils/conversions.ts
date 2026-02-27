

// 🌡 Conversion température Celsius ↔ Fahrenheit
export const convertTemperature = (value: number, useCelsius: boolean): number => {
  if (useCelsius) return value; // API déjà en Celsius
  return (value * 9) / 5 + 32;
};

// 🌬 Conversion vitesse du vent m/s ↔ km/h
export const convertWindSpeed = (
  value: number,
  unit: "km/h" | "m/s"
): number => {
  if (unit === "m/s") return value; // déjà en m/s
  return value * 3.6; // m/s → km/h
};

// 🌪 Conversion pression hPa ↔ mmHg
export const convertPressure = (value: number, unit: string): number => {
  if (unit === "hpa") return value;
  return value * 0.75006; // hPa → mmHg
};