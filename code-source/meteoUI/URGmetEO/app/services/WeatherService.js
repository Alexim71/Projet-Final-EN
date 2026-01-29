import AsyncStorage from '@react-native-async-storage/async-storage';

export class WeatherService {
  static STORAGE_KEYS = {
    LAST_WEATHER_DATA: '@last_weather_data',
    LAST_UPDATE_TIME: '@last_update_time',
    USER_PREFERENCES: '@weather_preferences',
  };

  /**
   * Sauvegarder les données localement
   */
  static async saveLocalData(data, location) {
    try {
      const storageData = {
        data,
        location,
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.LAST_WEATHER_DATA,
        JSON.stringify(storageData)
      );
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.LAST_UPDATE_TIME,
        new Date().toISOString()
      );
      
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde locale:', error);
      return false;
    }
  }

  /**
   * Charger les données sauvegardées
   */
  static async loadLocalData() {
    try {
      const stored = await AsyncStorage.getItem(
        this.STORAGE_KEYS.LAST_WEATHER_DATA
      );
      
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Vérifier si les données ne sont pas trop vieilles (24h)
        const dataTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now - dataTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return parsed;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erreur chargement local:', error);
      return null;
    }
  }

  /**
   * Calculer la prochaine heure de mise à jour
   */
  static calculateNextUpdateTime(currentData) {
    if (!currentData?.timestamp) return null;
    
    const lastUpdate = new Date(currentData.timestamp);
    const nextUpdate = new Date(lastUpdate.getTime() + 5 * 60 * 1000); // +5 minutes
    
    return nextUpdate;
  }

  /**
   * Formater les données pour l'affichage
   */
  static formatWeatherData(rawData) {
    if (!rawData?.data) return null;
    
    const { data, station } = rawData;
    
    return {
      station: {
        name: station?.name || 'Station inconnue',
        distance: station?.distance ? `${station.distance.toFixed(1)} km` : 'N/A',
        lastUpdate: new Date(data?.timestamp || Date.now()).toLocaleTimeString(),
      },
      current: {
        temperature: data?.temperature ? `${data.temperature.toFixed(1)}°C` : 'N/A',
        humidity: data?.humidity ? `${data.humidity}%` : 'N/A',
        pressure: data?.pressure ? `${data.pressure} hPa` : 'N/A',
        windSpeed: data?.wind_speed ? `${data.wind_speed} km/h` : 'N/A',
        windDirection: data?.wind_direction || 'N/A',
        rainfall: data?.rainfall ? `${data.rainfall} mm` : '0 mm',
      },
      trends: {
        temperatureTrend: data?.temperature_trend || 'stable',
        pressureTrend: data?.pressure_trend || 'stable',
      },
      raw: rawData,
    };
  }

  /**
   * Vérifier si une mise à jour est nécessaire
   */
  static shouldUpdate(lastUpdateTime, force = false) {
    if (force) return true;
    
    if (!lastUpdateTime) return true;
    
    const now = new Date();
    const lastUpdate = new Date(lastUpdateTime);
    const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
    
    return minutesSinceUpdate >= 5; // Mettre à jour après 5 minutes
  }
}

export default WeatherService;