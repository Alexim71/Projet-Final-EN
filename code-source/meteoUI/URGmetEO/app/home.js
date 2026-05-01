import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions, Image, RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { apiClient } from './api';
import { getSearchSuggestions, searchHaitiLocation } from './haiti-locations';
import { convertTemperature, convertWindSpeed, convertPressure } from "./utils/conversions";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { applyNotificationPrefs } from "./services/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 250;

// Configuration
const POLLING_INTERVAL = 30000; // 30 secondes pour les données météo
const LOCATION_UPDATE_INTERVAL = 10000; // 10 secondes pour la position
const MAX_RETRIES = 3;
const LOCATION_CHANGE_THRESHOLD = 0.001; // ~100m - seuil plus bas pour réactivité
const LOCATION_ACCURACY = Location.Accuracy.Balanced;


const DAY_NAMES = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

// ── Phase lunaire (calcul algorithmique, pas d'API requise) ──────────────────
const LUNAR_CYCLE = 29.530588853;
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z');

function getMoonPhase(t, date = new Date()) {
  const elapsed  = (date - KNOWN_NEW_MOON) / 86400000;
  const cyclePos = ((elapsed % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE;
  const illum    = Math.round(50 * (1 - Math.cos(2 * Math.PI * cyclePos / LUNAR_CYCLE)));
  let phase, emoji;
  if      (cyclePos <  1.85) { phase = t('home.moonNew');              emoji = '🌑'; }
  else if (cyclePos <  7.38) { phase = t('home.moonWaxingCrescent');   emoji = '🌒'; }
  else if (cyclePos <  9.22) { phase = t('home.moonFirstQuarter');     emoji = '🌓'; }
  else if (cyclePos < 14.77) { phase = t('home.moonWaxingGibbous');    emoji = '🌔'; }
  else if (cyclePos < 16.61) { phase = t('home.moonFull');             emoji = '🌕'; }
  else if (cyclePos < 22.15) { phase = t('home.moonWaningGibbous');    emoji = '🌖'; }
  else if (cyclePos < 23.99) { phase = t('home.moonLastQuarter');      emoji = '🌗'; }
  else                        { phase = t('home.moonWaningCrescent');  emoji = '🌘'; }
  const daysToFull = cyclePos < 14.77
    ? Math.ceil(14.77 - cyclePos)
    : Math.ceil(LUNAR_CYCLE - cyclePos + 14.77);
  const daysToNew  = cyclePos < 0.5
    ? Math.ceil(0.5 - cyclePos)
    : Math.ceil(LUNAR_CYCLE - cyclePos + 0.5);
  return { phase, emoji, illum, daysToFull, daysToNew, cyclePos };
}

function fmtSunTime(isoStr) {
  if (!isoStr) return '--:--';
  try { return isoStr.slice(11, 16); } catch { return '--:--'; }
}

const getRainCondition = (rainfall) => {
  if (rainfall > 10) return '⛈️';
  if (rainfall > 5) return '🌧️';
  if (rainfall > 1) return '🌦️';
  return '☀️';
};

// Fonction de distance simplifiée (plus rapide)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const dx = lat2 - lat1;
  const dy = lon2 - lon1;
  return Math.sqrt(dx * dx + dy * dy);
};

// Fonctions utilitaires existantes
const getCardinalDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5);
  return directions[index % 16];
};

const getWindDescription = (speedKmh, t) => {
  if (speedKmh < 5) return t('home.windCalm');
  if (speedKmh < 20) return t('home.windLight');
  if (speedKmh < 40) return t('home.windModerate');
  if (speedKmh < 60) return t('home.windStrong');
  return t('home.windVeryStrong');
};

const getUVDescription = (uvIndex, t) => {
  if (uvIndex <= 2) return t('home.uvLow');
  if (uvIndex <= 5) return t('home.uvModerate');
  if (uvIndex <= 7) return t('home.uvHigh');
  if (uvIndex <= 10) return t('home.uvVeryHigh');
  return t('home.uvExtreme');
};

const getWeatherDescription = (data, t) => {
  if (!data) return t('home.weatherSunny');
  const { temperature, humidity, rainfall } = data;
  if (rainfall > 0) return t('home.weatherRainy');
  if (humidity > 80) return t('home.weatherHumid');
  if (temperature > 30) return t('home.weatherHot');
  if (temperature < 15) return t('home.weatherFresh');
  return t('home.weatherSunny');
};

const getWeatherEmoji = (data) => {
  if (!data) return '🌤️';
  const rainfall = data.rainfall || 0;
  const humidity = data.humidity || 0;
  const uv = data.uv_index || 0;
  if (rainfall > 10) return '⛈️';
  if (rainfall > 3)  return '🌧️';
  if (rainfall > 0.5) return '🌦️';
  if (humidity > 90) return '🌫️';
  if (uv > 8)  return '☀️';
  if (uv > 3)  return '🌤️';
  return '⛅';
};

const WindSpeedIndicator = ({ speed = 0, direction = 0, unit = "km/h", t }) => {

  const safeSpeed = speed || 0;
  const safeDirection = direction || 0;

  const windLevel = Math.min(4, Math.floor(safeSpeed / 10));
  const directionCardinal = getCardinalDirection(safeDirection);
  
  return (
    <View style={styles.windContainer}>
      <View style={styles.windGraph}>
        <View style={styles.windBars}>
          {[1, 2, 3, 4].map((level) => (
            <View 
              key={level} 
              style={[
                styles.windBar,
                level <= windLevel && styles.windBarActive,
                { height: 12 + (level * 6) }
              ]}
            />
          ))}
        </View>
        
        <Svg width={60} height={60} style={styles.windDirectionArrow}>
          <Circle cx="30" cy="30" r="20" fill="rgba(255, 255, 255, 0.1)" />
          <Line
            x1="30"
            y1="30"
            x2="30"
            y2="10"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${safeDirection}, 30, 30)`}
          />
          <Circle cx="30" cy="12" r="3" fill="#ffffff" 
            transform={`rotate(${safeDirection}, 30, 30)`}
          />
          <Circle cx="30" cy="30" r="3" fill="#ffffff" />
        </Svg>
      </View>
      
      <View style={styles.windInfo}>
        <Text style={styles.windSpeedValue}>
          {safeSpeed.toFixed(1)} {unit}
        </Text>
        <Text style={styles.windDirectionText}>{directionCardinal}</Text>
        <Text style={styles.windDescription}>
          {getWindDescription(safeSpeed, t)}
        </Text>
      </View>
    </View>
  );
};

export default function Home() {
  const params = useLocalSearchParams();
  const [stationData, setStationData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [forecastDays, setForecastDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState({
    lat: parseFloat(params.lat) || 18.533333,
    lon: parseFloat(params.lon) || -72.333333,
    source: 'initial'
  });
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [lastLocationCheck, setLastLocationCheck] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  
  const pollingRef = useRef(null);
  const locationWatchRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastApiLocationRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const demoModeRef = useRef(demoMode);
  const demoStationCodeRef = useRef(demoStationCode);
  const isFirstDemoEffect = useRef(true);
  const router = useRouter();

  
const [searchSuggestions, setSearchSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [criticalSensors, setCriticalSensors] = useState([]);
const [alertDismissed, setAlertDismissed] = useState(false);

  //const theme = useTheme(); 
const { t } = useTranslation();
const { useCelsius, windUnit, pressureUnit, demoMode, demoStationCode, notifications } = useSettings();
const { isLoggedIn, user, logout } = useAuth();
const wind = convertWindSpeed(weatherData?.wind_speed || 0, windUnit);

// Fonction pour gérer la saisie
const handleSearchInputChange = (text) => {
  setSearchQuery(text);
  
  if (text.length >= 2) {
    const suggestions = getSearchSuggestions(text, 5);
    setSearchSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  } else {
    setShowSuggestions(false);
  }
};



// Fonction pour sélectionner une suggestion
const handleSuggestionSelect = (suggestion) => {
  setSearchQuery(suggestion.name);
  setShowSuggestions(false);
  
  // Rechercher cette localité
  const searchResult = searchHaitiLocation(suggestion.name);
  if (searchResult.success && searchResult.results.length > 0) {
    navigateToLocation(searchResult.results[0]);
  }
};


  // Fonction utilitaire pour convertir en nombre avec valeur par défaut
const safeNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Fonction utilitaire pour formater avec toFixed de manière sécurisée
const safeToFixed = (value, digits = 1, defaultValue = 0) => {
  const num = safeNumber(value, defaultValue);
  return num.toFixed(digits);
};

  // 1. Initialisation automatique du suivi GPS
  const initializeLocationTracking = async () => {
    try {
      // Demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log("⚠️ Permission GPS non accordée");
        // Continuer avec la position initiale
        return false;
      }
      
      console.log("✅ Permission GPS accordée");
      
      // Configurer le watchPosition pour un suivi en temps réel
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: LOCATION_ACCURACY,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 10, // 10m minimum entre les updates
        },
        (location) => {
          handleNewLocation(location);
        }
      );
      
      console.log("📍 Suivi GPS démarré");
      return true;
      
    } catch (error) {
      console.error("❌ Erreur initialisation GPS:", error);
      return false;
    }
  };

  // 2. Gérer une nouvelle position GPS
  const handleNewLocation = (location) => {
    if (!location || !location.coords) return;
    
    const newCoords = {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date(),
      source: 'gps'
    };
    
    // Toujours mettre à jour l'affichage de la position
    setCurrentLocation(prev => ({
      ...prev,
      lat: newCoords.lat,
      lon: newCoords.lon,
      source: 'gps'
    }));
    
    setLocationAccuracy(newCoords.accuracy);
    setLastLocationCheck(new Date());
    
    // Vérifier si on doit rafraîchir les données météo
    const shouldRefresh = shouldRefreshWeatherData(newCoords);
    
    if (shouldRefresh) {
      console.log("📍 Position changée, rafraîchissement des données...");
      console.log("lastApiLocationRef.current.lat:", lastApiLocationRef.current.lat);
       console.log("newCoords.lat:", newCoords.lat);
      lastApiLocationRef.current = { lat: newCoords.lat, lon: newCoords.lon };
      fetchWeatherData(newCoords.lat, newCoords.lon);
    }
  };

  // 3. Déterminer si on doit rafraîchir les données météo
  const shouldRefreshWeatherData = (newCoords) => {
    if (!lastApiLocationRef.current) {
      return true; // Première fois
    }
    
    const distance = calculateDistance(
      lastApiLocationRef.current.lat,
      lastApiLocationRef.current.lon,
      newCoords.lat,
      newCoords.lon
    );
    
    return distance > LOCATION_CHANGE_THRESHOLD;
  };

  // 4. Charger les données météo
  const fetchWeatherData = async (latitude, longitude) => {
    // --- MODE DÉMO : utiliser la station sélectionnée ---
    if (demoModeRef.current && demoStationCodeRef.current) {
      try {
        setError(null);
        const response = await apiClient.get(`/api/geo/station/${demoStationCodeRef.current}`);
        const { station, data } = response.data;
        if (station) {
          setStationData(station);
          retryCountRef.current = 0;
          if (data) {
            const demoProcessed = {
              ...data,
              temperature:     safeNumber(data.temperature, 22),
              humidity:        safeNumber(data.humidity, 50),
              pressure:        safeNumber(data.pressure, 1013),
              wind_speed:      safeNumber(data.wind_speed, 0),
              wind_direction:  safeNumber(data.wind_direction, 0),
              feels_like:      safeNumber(data.feels_like, data.temperature || 22),
              dew_point:       safeNumber(data.dew_point, 15),
              uv_index:        safeNumber(data.uv_index, 0),
              solar_radiation: safeNumber(data.solar_radiation, 0),
              battery_level:   safeNumber(data.battery_level, 50),
            };
            setWeatherData(demoProcessed);
            evaluateAlerts(demoProcessed);
            applyNotificationPrefs(
              notifications,
              {
                temp:      `${convertTemperature(demoProcessed.temperature, useCelsius).toFixed(0)}°${useCelsius ? 'C' : 'F'}`,
                city:      station.address || station.description || '',
                condition: getWeatherDescription(demoProcessed, t),
              },
              {
                lat:  currentLocation.lat,
                lon:  currentLocation.lon,
                city: station.address || station.description || '',
              }
            ).catch(e => console.log('[Notif] reschedule error:', e));
          } else {
            setDemoData();
          }
          setLastUpdate(new Date());
          if (station._id) fetchForecast(station._id);
        }
      } catch (err) {
        console.error('❌ Erreur station démo:', err.message);
        setDemoData();
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }
    // --- FIN MODE DÉMO ---

    try {
      setError(null);

      console.log(`📡 Requête météo pour: ${safeToFixed(latitude, 6)}, ${safeToFixed(longitude, 6)}`);

      const response = await apiClient.get('/api/geo/realtime', {
        params: {
          lat: safeNumber(latitude),
          lon: safeNumber(longitude),
        },
      });

      const data = response.data;

      if (data && data.station) {
        setStationData(data.station);
        lastApiLocationRef.current = { lat: latitude, lon: longitude };
        retryCountRef.current = 0;

        if (data.data) {
          const processedData = {
            ...data.data,
            temperature: safeNumber(data.data.temperature, 22),
            humidity: safeNumber(data.data.humidity, 50),
            pressure: safeNumber(data.data.pressure, 1013),
            wind_speed: safeNumber(data.data.wind_speed, 0),
            wind_direction: safeNumber(data.data.wind_direction, 0),
            feels_like: safeNumber(data.data.feels_like, data.data.temperature || 22),
            dew_point: safeNumber(data.data.dew_point, 15),
            uv_index: safeNumber(data.data.uv_index, 0),
            solar_radiation: safeNumber(data.data.solar_radiation, 0),
            battery_level: safeNumber(data.data.battery_level, 50),
          };
          setWeatherData(processedData);
          evaluateAlerts(processedData);
          console.log("✅ Données météo mises à jour");
          applyNotificationPrefs(
            notifications,
            {
              temp:      `${convertTemperature(processedData.temperature, useCelsius).toFixed(0)}°${useCelsius ? 'C' : 'F'}`,
              city:      data.station?.address || data.station?.description || '',
              condition: getWeatherDescription(processedData, t),
            },
            {
              lat:  latitude,
              lon:  longitude,
              city: data.station?.address || data.station?.description || '',
            }
          ).catch(e => console.log('[Notif] reschedule error:', e));
        } else {
          // Station trouvée mais aucune mesure disponible
          setDemoData();
          console.log("⚠️ Station sans données — mode démo");
        }

        setLastUpdate(new Date());
        fetchForecastDays(latitude, longitude);
      } else {
        throw new Error("Réponse API invalide");
      }
    } catch (error) {
      const status = error.response?.status;

      if (status === 404) {
        // Pas de station proche : pas besoin de retry
        console.log("⚠️ Aucune station météo à proximité");
        setError("Aucune station à proximité. Mode démo activé.");
        setPollingEnabled(false);
        setDemoData();
      } else {
        console.error('❌ Erreur API météo:', error.message || error);
        retryCountRef.current += 1;

        if (retryCountRef.current >= MAX_RETRIES) {
          setError("Connexion impossible. Mode démo activé.");
          setPollingEnabled(false);
        }
        setDemoData();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 5. Charger les prévisions 10 jours via Open-Meteo
  const fetchForecast = async (stationId) => { /* legacy — remplacé */ };

  const fetchForecastDays = async (lat, lon) => {
    try {
      const res = await apiClient.get('/api/geo/forecast', { params: { lat, lon } });
      setForecastDays(res.data?.daily || []);
    } catch (err) {
      console.log('Forecast Open-Meteo non disponible:', err.message);
    }
  };

  // 6. Rafraîchissement manuel (utilise la position actuelle)
  const onRefresh = () => {
    setRefreshing(true);
    setPollingEnabled(true);
    fetchWeatherData(currentLocation.lat, currentLocation.lon);
  };

  // 6. Polling automatique des données météo
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      if (pollingEnabled && lastApiLocationRef.current) {
        console.log("🔄 Rafraîchissement automatique des données météo");
        // TOUJOURS utiliser currentLocation qui est à jour
      
        fetchWeatherData(lastApiLocationRef.current.lat, lastApiLocationRef.current.lon);
      }
    }, POLLING_INTERVAL);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // 7. Gestion du changement d'état de l'app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // L'app revient au premier plan, vérifier la position
        console.log("📱 App revenue au premier plan");
        checkCurrentPosition();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);


  // 8. Vérifier la position actuelle
  const checkCurrentPosition = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_ACCURACY,
        timeout: 5000,
      });
      
      if (location && location.coords) {
        handleNewLocation(location);
      }
    } catch (error) {
      console.log("⚠️ Impossible d'obtenir la position actuelle:", error);
    }
  };

  // 9. Effet principal d'initialisation
  useEffect(() => {
    const init = async () => {
      console.log("🚀 Initialisation de l'application");
      
      // Initialiser la référence de position API
      lastApiLocationRef.current = {
        lat: currentLocation.lat,
        lon: currentLocation.lon
      };
      
      // Démarrer le suivi GPS automatiquement
      await initializeLocationTracking();
      
      // Charger les données initiales
      fetchWeatherData(currentLocation.lat, currentLocation.lon);
      
      // Démarrer le polling météo
      startPolling();
      
      // Vérifier la position immédiatement
      setTimeout(() => checkCurrentPosition(), 1000);
    };
    
    init();
    
    // Nettoyage
    return () => {
      stopPolling();
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, []);

  // 10. Redémarrer le polling quand il est activé/désactivé
  useEffect(() => {
    if (pollingEnabled) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [pollingEnabled]);

  // 10b. Réagir aux changements de mode démo (Settings)
  useEffect(() => {
    demoModeRef.current = demoMode;
    demoStationCodeRef.current = demoStationCode;

    if (isFirstDemoEffect.current) {
      isFirstDemoEffect.current = false;
      return; // L'init effect gère le premier chargement
    }

    retryCountRef.current = 0;
    setPollingEnabled(true);
    fetchWeatherData(currentLocation.lat, currentLocation.lon);
  }, [demoMode, demoStationCode]);

  // 11. Gérer les paramètres de navigation
  useEffect(() => {
    const newLat = parseFloat(params.lat);
    const newLon = parseFloat(params.lon);
    
    if (!isNaN(newLat) && !isNaN(newLon)) {
      const hasChanged = 
        newLat !== currentLocation.lat || 
        newLon !== currentLocation.lon;
      
      if (hasChanged) {
        console.log("📍 Changement via navigation");
        const newLocation = {
          lat: newLat,
          lon: newLon,
          source: 'navigation'
        };
        
        setCurrentLocation(newLocation);
        lastApiLocationRef.current = { lat: newLat, lon: newLon };
        
        // Rafraîchir immédiatement avec les nouvelles coordonnées
        fetchWeatherData(newLat, newLon);
      }
    }
  }, [params.lat, params.lon]);

  const formatTimeSinceUpdate = (date, t) => {
    if (!date) return t('home.timeNever');
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins === 0) return t('home.timeJustNow');
    if (diffMins === 1) return t('home.time1min');
    if (diffMins < 60) return t('home.timeMins', { count: diffMins });

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return t('home.time1hour');
    if (diffHours < 24) return t('home.timeHours', { count: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return t('home.time1day');
    return t('home.timeDays', { count: diffDays });
  };

  // Évaluer les alertes à partir des données météo reçues
  const evaluateAlerts = async (data) => {
    try {
      const windKmh = (data.wind_speed || 0) * 3.6;
      const sensorValues = {
        temperature: data.temperature ?? null,
        humidity:    data.humidity    ?? null,
        pressure:    data.pressure    ?? null,
        wind:        windKmh,
        rain:        data.rainfall    ?? null,
      };
      await AsyncStorage.setItem('last_weather_sensor', JSON.stringify({ ...sensorValues, timestamp: Date.now() }));

      const raw = await AsyncStorage.getItem('alert_thresholds_v1');
      const saved = raw ? JSON.parse(raw) : [];

      const SENSOR_DEFS = [
        { id: 'temperature', emoji: '🌡️', label: 'Température', unit: '°C',   warnThreshold: 35,   critThreshold: 40,  direction: 'up'   },
        { id: 'humidity',    emoji: '💧', label: 'Humidité',    unit: '%',    warnThreshold: 80,   critThreshold: 95,  direction: 'up'   },
        { id: 'pressure',   emoji: '🌀', label: 'Pression',    unit: 'hPa',  warnThreshold: 1000, critThreshold: 990, direction: 'down' },
        { id: 'wind',       emoji: '🌬️', label: 'Vent',        unit: 'km/h', warnThreshold: 50,   critThreshold: 90,  direction: 'up'   },
        { id: 'rain',       emoji: '🌧️', label: 'Pluie',       unit: 'mm/h', warnThreshold: 20,   critThreshold: 50,  direction: 'up'   },
      ];

      const configs = SENSOR_DEFS.map(def => {
        const s = saved.find(t => t.id === def.id);
        return s ? { ...def, warnThreshold: s.warnThreshold, critThreshold: s.critThreshold } : def;
      });

      const critical = configs.filter(cfg => {
        const val = sensorValues[cfg.id];
        if (val === null || val === undefined) return false;
        return cfg.direction === 'up' ? val >= cfg.critThreshold : val < cfg.critThreshold;
      }).map(cfg => ({ ...cfg, value: parseFloat((sensorValues[cfg.id]).toFixed(1)) }));

      setCriticalSensors(critical);
      if (critical.length > 0) setAlertDismissed(false);
    } catch (e) {
      console.log('[Alerts] evaluateAlerts error:', e);
    }
  };

  const setDemoData = () => {
    const demoData = {
      temperature: 22 + Math.random() * 10,
      humidity: 40 + Math.random() * 40,
      pressure: 1000 + Math.random() * 30,
      rainfall: Math.random() > 0.8 ? Math.random() * 5 : 0,
      wind_speed: Math.random() * 15,
      wind_direction: Math.random() * 360,
      solar_radiation: Math.random() * 1000,
      uv_index: Math.floor(Math.random() * 12),
      visibility: 5 + Math.random() * 15,
      dew_point: 10 + Math.random() * 15,
      battery_level: 20 + Math.random() * 80,
      signal_strength: -50 - Math.random() * 50,
      device_status: "ONLINE",
      feels_like: 22 + Math.random() * 10,
      heat_index: 22 + Math.random() * 10,
      wind_chill: 22 + Math.random() * 10
    };
    setWeatherData(demoData);
    evaluateAlerts(demoData);
    setLastUpdate(new Date());
  };

  const handleLogin = () => {
    if (isLoggedIn) {
      Alert.alert(
        user?.email ?? 'Compte',
        t('home.userMenu'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('home.signOut'), style: 'destructive', onPress: logout },
        ]
      );
    } else {
      router.push({
        pathname: '/login',
        params: { lat: currentLocation.lat, lon: currentLocation.lon },
      });
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    try {
    setLoading(true);
    
    // Rechercher dans les localités d'Haïti
    const searchResult = searchHaitiLocation(searchQuery);
    
    if (!searchResult.success || searchResult.results.length === 0) {
      Alert.alert(
        t('home.noResults'),
        t('home.noResultsMsg', { query: searchQuery }),
        [{ text: 'OK' }]
      );
      return;
    }

    // Si plusieurs résultats, montrer une sélection
    if (searchResult.results.length > 1) {
      Alert.alert(
        t('home.multipleResults'),
        t('home.chooseLocation'),
        searchResult.results.map((loc, index) => ({
          text: `${loc.name} (${loc.type})`,
          onPress: () => navigateToLocation(loc)
        }))
      );
    } else {
      // Un seul résultat, naviguer directement
      navigateToLocation(searchResult.results[0]);
    }

  } catch (error) {
    console.error('Erreur recherche:', error);
    Alert.alert(t('home.noResults'), t('home.searchError'));
  } finally {
    setLoading(false);
  }
};

// Fonction pour naviguer vers une localité
const navigateToLocation = (location) => {
  console.log('Navigation vers:', location);
  
  // Mettre à jour la position actuelle
  const newLocation = {
    lat: location.coordinates.latitude,
    lon: location.coordinates.longitude,
    source: 'search',
    searchResult: location
  };
  
  setCurrentLocation(newLocation);
  lastApiLocationRef.current = { 
    lat: location.coordinates.latitude, 
    lon: location.coordinates.longitude 
  };
  
  // Rafraîchir les données météo
  fetchWeatherData(location.coordinates.latitude, location.coordinates.longitude);
  
  // Optionnel: Afficher un message
  Alert.alert(
    t('home.locationUpdated'),
    t('home.redirectedTo', { name: location.name }),
    [{ text: 'OK' }]
  );
  };

  const handleCardPress = (cardId, cardTitle) => {
    router.push({
      pathname: `/cardDetail`,
      params: { 
        cardId: cardId.toString(),
        cardTitle: cardTitle,
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        weatherData: JSON.stringify(weatherData),
        stationData: JSON.stringify(stationData)
      }
    });
  };

  const handleForceRefresh = () => {
    console.log("🔄 Forcer rafraîchissement avec position actuelle");
    onRefresh();
  };

  const handleUseCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_ACCURACY,
        timeout: 5000,
      });
      
      if (location && location.coords) {
        handleNewLocation(location);
        Alert.alert(
          t('home.positionUpdated'),
          t('home.positionUpdatedMsg'),
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(t('home.noResults'), t('home.errorGetPosition'));
    }
  };
const weatherCards = weatherData ? [
  [
     {
    id: 1,
    title: t('home.cardWind'),
    component: (
  <WindSpeedIndicator
    speed={wind}
    direction={weatherData.wind_direction || 0}
    unit={windUnit}
    t={t}
  />
),
    subtitle: getWindDescription(
      convertWindSpeed(weatherData.wind_speed || 0, windUnit), t
    ),
    value: `${convertWindSpeed(
      weatherData.wind_speed || 0,
      windUnit
    ).toFixed(1)} ${windUnit}`
  },
  {
    id: 2,
    title: t('home.cardHumidity'),
    value: `${(weatherData.humidity || 0).toFixed(1)}%`,
    subtitle:
      (weatherData.humidity || 0) > 70 ? t('home.highHumidity') : t('home.comfortableHumidity')
  },
  {
    id: 3,
    title: t('home.cardPressure'),
    value: `${convertPressure(
      weatherData.pressure || 0,
      pressureUnit
    ).toFixed(1)} ${pressureUnit}`,
    subtitle:
      (weatherData.pressure || 0) > 1013 ? t('home.highPressure') : t('home.normalPressure')
  }
],
[
  {
    id: 4,
    title: t('home.cardUV'),
    value: (weatherData.uv_index || 0).toString(),
    subtitle: getUVDescription(weatherData.uv_index || 0, t)
  },
  {
    id: 5,
    title: t('home.cardFeelsLike'),
    value: `${convertTemperature(
      weatherData.feels_like || 0,
      useCelsius
    ).toFixed(1)}°${useCelsius ? "C" : "F"}`,
    subtitle: t('home.thermicIndex')
  },
  {
    id: 6,
    title: t('home.cardDewPoint'),
    value: `${convertTemperature(
      weatherData.dew_point || 0,
      useCelsius
    ).toFixed(1)}°${useCelsius ? "C" : "F"}`,
    subtitle: t('home.dewPointLabel')
  },
  {
    id: 7,
    title: t('home.cardSolar'),
    value: `${weatherData.solar_radiation || 0} W/m²`,
    subtitle: t('home.solarLabel')
  },
  {
    id: 8,
    title: t('home.cardBattery'),
    value: `${weatherData.battery_level || 0}%`,
    subtitle: t('home.batteryLabel')
  },
  (() => {
    const moon = getMoonPhase(t);
    return {
      id: 9,
      title: t('home.cardMoon'),
      value: `${moon.emoji}  ${moon.illum}%`,
      subtitle: moon.phase,
    };
  })(),
  ]
] : [[], []];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>{t('home.loading')}</Text>
        <Text style={styles.coords}>
            📍 {safeToFixed(currentLocation.lat, 4)}, {safeToFixed(currentLocation.lon, 4)}
        </Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="grad1" cx="85%" cy="15%" rx="100%" ry="40%" fx="100%" fy="85%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="25%" stopColor="#e8f4ff" stopOpacity="0.18" />
            <Stop offset="50%" stopColor="#c8e4ff" stopOpacity="0.12" />
            <Stop offset="75%" stopColor="#9fd2ff" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="grad2" cx="15%" cy="85%" rx="100%" ry="45%" fx="15%" fy="85%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="30%" stopColor="#e3f2ff" stopOpacity="0.14" />
            <Stop offset="60%" stopColor="#b8dcff" stopOpacity="0.08" />
            <Stop offset="90%" stopColor="#8ac8ff" stopOpacity="0.02" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="grad3" cx="35%" cy="50%" rx="100%" ry="40%" fx="35%" fy="50%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="20%" stopColor="#f0f8ff" stopOpacity="0.13" />
            <Stop offset="45%" stopColor="#d9edff" stopOpacity="0.08" />
            <Stop offset="70%" stopColor="#b5deff" stopOpacity="0.04" />
            <Stop offset="95%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        <Rect x="0" y="0" width="100%" height="100%" fill="#4facfe" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="rgba(255, 255, 255, 0.02)" />
      </Svg>

<View style={styles.header}>
   {/* On réplique le même fond SVG mais seulement pour le header */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="headerGrad1" cx="85%" cy="15%" rx="100%" ry="40%" fx="100%" fy="85%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="25%" stopColor="#e8f4ff" stopOpacity="0.18" />
            <Stop offset="50%" stopColor="#c8e4ff" stopOpacity="0.12" />
            <Stop offset="75%" stopColor="#9fd2ff" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="headerGrad2" cx="15%" cy="85%" rx="100%" ry="45%" fx="15%" fy="85%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="30%" stopColor="#e3f2ff" stopOpacity="0.14" />
            <Stop offset="60%" stopColor="#b8dcff" stopOpacity="0.08" />
            <Stop offset="90%" stopColor="#8ac8ff" stopOpacity="0.02" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        <Rect x="0" y="0" width="100%" height="100%" fill="#4facfe" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#headerGrad1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#headerGrad2)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="rgba(255, 255, 255, 0.02)" />
      </Svg>
      
  
  {/* Contenu complet du header */}
  <View style={styles.headerContent}>
    <View style={styles.headerTop}>
      <Text style={styles.appName}>URGmetEO</Text>
      <View style={styles.headerActions}>
       
         {/* Settings Button */}
    {isLoggedIn && (
    <TouchableOpacity
      style={styles.settingsButton}
      onPress={() => router.push('/settings')}
    >
      <Text style={styles.settingsIcon}>⚙️</Text>
    </TouchableOpacity>
    )}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>
            {isLoggedIn ? (user?.email?.split('@')[0] ?? '👤') : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    
        
        {/* <TouchableOpacity 
          style={[styles.pollingButton, !pollingEnabled && styles.pollingButtonDisabled]} 
          onPress={() => setPollingEnabled(!pollingEnabled)}
        >
          <Text style={styles.pollingButtonText}>
            {pollingEnabled ? "🔄 ON" : "⏸️ OFF"}
          </Text>
        </TouchableOpacity> */}

    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor="#ffffffb3"
          value={searchQuery}
          onChangeText={handleSearchInputChange}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.positionInfo}>
        <View style={styles.positionIconContainer}>
          <Image
            source={require('./../assets/position-icon.png')}
            style={[
              styles.positionIcon,
              !locationWatchRef.current && styles.positionIconInactive
            ]}
          />
          {locationWatchRef.current && (
            <View style={styles.gpsActiveDot} />
          )}
          <Text style={styles.positionText}>
            {!demoMode && stationData?.address
              ? ` ${stationData.address}  •  ${currentLocation.lat.toFixed(2)}, ${currentLocation.lon.toFixed(2)}`
              : `${currentLocation.lat.toFixed(2)}, ${currentLocation.lon.toFixed(2)}${locationAccuracy ? ` (±${Math.round(locationAccuracy)}m)` : ''}`
            }
          </Text>
        </View>
      </View>
      
      <View style={styles.updateInfoContainer}>
        {demoMode ? (
          <Text style={[styles.updateText, { color: '#ffd700', fontWeight: '700' }]}>
            {t('home.demoMode')}
            {stationData?.address ? ` — ${stationData.address}` : demoStationCode ? ` — ${demoStationCode}` : ''}
          </Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.updateText}>{t('home.currentWeather')}</Text>
        )}
        
        <View style={styles.refreshButtons}>
           <TouchableOpacity 
          style={[styles.gpsStatus, locationWatchRef.current && styles.gpsActive]} 
          onPress={handleUseCurrentLocation}
        >
          <Text style={styles.gpsStatusText}>
            {locationWatchRef.current ? "📍 ON" : "📍 OFF"}
          </Text>
        </TouchableOpacity>
          <TouchableOpacity style={styles.smallRefreshButton} onPress={handleForceRefresh}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallRefreshButton} onPress={onRefresh} disabled={refreshing}>
            <Text style={styles.refreshButtonText}>{refreshing ? "⏳" : "↻"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
</View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#ffffff"]}
            tintColor="#ffffff"
             progressViewOffset={HEADER_HEIGHT - 20}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.headerSpacer} />

        {/* ── Bannière alerte critique ── */}
        {criticalSensors.length > 0 && !alertDismissed && (
          <View style={styles.criticalBannerWrap}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push('/alertes')}
              activeOpacity={0.85}
            >
              <View style={styles.criticalBannerContent}>
                <Text style={styles.criticalBannerTitle}>{t('home.criticalAlert')}</Text>
                <Text style={styles.criticalBannerSub} numberOfLines={2}>
                  {criticalSensors.map(s => `${s.emoji} ${s.label} : ${s.value} ${s.unit}`).join('  •  ')}
                </Text>
                <Text style={styles.criticalBannerTap}>{t('home.tapForDetails')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAlertDismissed(true)}
              hitSlop={12}
              style={styles.criticalBannerX}
            >
              <Text style={styles.criticalBannerXText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.weatherCardsSection}>

          {/* ══ HÉROS : ville + température + condition ══ */}
          <View style={styles.heroSection}>
            <Text style={styles.heroCity}>
              {stationData
                ? (stationData.address || stationData.description || t('home.localWeather'))
                : t('home.localWeather')}
            </Text>
            {stationData?.distance != null && (
              <Text style={styles.heroDistance}>📍 À {stationData.distance.toFixed(1)} km</Text>
            )}
            <Text style={styles.heroConditionEmoji}>{getWeatherEmoji(weatherData)}</Text>
            <Text style={styles.heroTemp}>
              {weatherData
                ? `${convertTemperature(weatherData.temperature, useCelsius).toFixed(0)}°`
                : '--°'}
            </Text>
            <Text style={styles.heroConditionLabel}>{getWeatherDescription(weatherData, t)}</Text>

            {weatherData && (
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>
                    {convertTemperature(weatherData.feels_like || 0, useCelsius).toFixed(0)}°
                  </Text>
                  <Text style={styles.heroStatLabel}>{t('home.feelsLike')}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{(weatherData.humidity || 0).toFixed(0)}%</Text>
                  <Text style={styles.heroStatLabel}>{t('home.humidity')}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>
                    {(weatherData.rainfall || 0) > 0
                      ? `${(weatherData.rainfall || 0).toFixed(1)} mm`
                      : t('home.dry')}
                  </Text>
                  <Text style={styles.heroStatLabel}>{t('home.precip')}</Text>
                </View>
              </View>
            )}

          </View>

          {/* ══ LEVER / COUCHER DU SOLEIL ══ */}
          {forecastDays.length > 0 && (
            <View style={styles.sunriseSunsetBar}>
              <View style={styles.sunriseSunsetItem}>
                <Text style={styles.sunriseSunsetEmoji}>🌅</Text>
                <View>
                  <Text style={styles.sunriseSunsetTime}>{fmtSunTime(forecastDays[0]?.sunrise)}</Text>
                  <Text style={styles.sunriseSunsetLabel}>{t('home.sunrise')}</Text>
                </View>
              </View>
              <View style={styles.sunriseSunsetDivider} />
              <View style={styles.sunriseSunsetCenter}>
                <Text style={styles.sunriseSunsetDaylight}>
                  {(() => {
                    const rise = forecastDays[0]?.sunrise;
                    const set  = forecastDays[0]?.sunset;
                    if (!rise || !set) return t('home.sunlightFmt', { h: '--', m: '' });
                    const riseMin = parseInt(rise.slice(11,13))*60 + parseInt(rise.slice(14,16));
                    const setMin  = parseInt(set.slice(11,13))*60  + parseInt(set.slice(14,16));
                    const total   = setMin - riseMin;
                    return t('home.sunlightFmt', { h: Math.floor(total/60), m: String(total%60).padStart(2,'0') });
                  })()}
                </Text>
                <Text style={styles.sunriseSunsetArc}>☀️</Text>
              </View>
              <View style={styles.sunriseSunsetDivider} />
              <View style={styles.sunriseSunsetItem}>
                <Text style={styles.sunriseSunsetEmoji}>🌇</Text>
                <View>
                  <Text style={styles.sunriseSunsetTime}>{fmtSunTime(forecastDays[0]?.sunset)}</Text>
                  <Text style={styles.sunriseSunsetLabel}>{t('home.sunset')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ══ GRILLE RAPIDE 2×2 ══ */}
          {weatherData && (
            <View style={styles.quickGrid}>
              <View style={styles.quickGridRow}>
                <TouchableOpacity style={styles.quickCard} onPress={() => handleCardPress(1, t('home.cardWind'))} activeOpacity={0.7}>
                  <Text style={styles.quickCardEmoji}>💨</Text>
                  <Text style={styles.quickCardValue}>{convertWindSpeed(weatherData.wind_speed || 0, windUnit).toFixed(1)}</Text>
                  <Text style={styles.quickCardUnit}>{windUnit}</Text>
                  <Text style={styles.quickCardLabel}>{t('home.windLabel', { dir: getCardinalDirection(weatherData.wind_direction || 0) })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickCard} onPress={() => handleCardPress(4, t('home.cardUV'))} activeOpacity={0.7}>
                  <Text style={styles.quickCardEmoji}>☀️</Text>
                  <Text style={styles.quickCardValue}>{(weatherData.uv_index || 0).toFixed(0)}</Text>
                  <Text style={styles.quickCardUnit}>UV</Text>
                  <Text style={styles.quickCardLabel}>{getUVDescription(weatherData.uv_index || 0, t)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickGridRow}>
                <TouchableOpacity style={styles.quickCard} onPress={() => handleCardPress(3, t('home.cardPressure'))} activeOpacity={0.7}>
                  <Text style={styles.quickCardEmoji}>📊</Text>
                  <Text style={styles.quickCardValue}>{convertPressure(weatherData.pressure || 0, pressureUnit).toFixed(0)}</Text>
                  <Text style={styles.quickCardUnit}>{pressureUnit}</Text>
                  <Text style={styles.quickCardLabel}>{t('home.pressure')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickCard} onPress={() => handleCardPress(6, t('home.cardDewPoint'))} activeOpacity={0.7}>
                  <Text style={styles.quickCardEmoji}>🌡️</Text>
                  <Text style={styles.quickCardValue}>{convertTemperature(weatherData.dew_point || 0, useCelsius).toFixed(0)}°</Text>
                  <Text style={styles.quickCardUnit}>{useCelsius ? 'C' : 'F'}</Text>
                  <Text style={styles.quickCardLabel}>{t('home.dewPointQuick')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══ BOUTON CARTE PLUIE ══ */}
          <TouchableOpacity
            style={styles.rainMapButtonCompact}
            onPress={() => router.push('/rainMap')}
            activeOpacity={0.7}
          >
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="mapGradientCompact" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#2196F3" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#0D47A1" stopOpacity="0.3" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#mapGradientCompact)" />
            </Svg>
            <Text style={styles.rainMapCompactIcon}>🌧️</Text>
            <View style={styles.rainMapCompactText}>
              <Text style={styles.rainMapCompactTitle}>{t('home.rainMap')}</Text>
              <Text style={styles.rainMapCompactSub}>{t('home.rainMapSub')}</Text>
            </View>
            <Text style={styles.rainMapCompactArrow}>→</Text>
          </TouchableOpacity>

          {/* ══ DONNÉES DÉTAILLÉES ══ */}
          <View style={styles.detailCardsSection}>
            <View style={styles.detailCardsHeader}>
              <Text style={styles.detailCardsTitle}>{t('home.detailedData')}</Text>
              <View style={styles.scrollIndicators}>
                <View style={[styles.scrollDot, activeSection === 0 && styles.scrollDotActive]} />
                <View style={[styles.scrollDot, activeSection === 1 && styles.scrollDotActive]} />
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScrollView}
              contentContainerStyle={styles.horizontalScrollContent}
              onScroll={(event) => {
                setActiveSection(event.nativeEvent.contentOffset.x < 500 ? 0 : 1);
              }}
              scrollEventThrottle={16}
            >
              {weatherCards[0].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.weatherCard}
                  onPress={() => handleCardPress(item.id, item.title)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.component ? item.component : <Text style={styles.cardValue}>{item.value}</Text>}
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
              {weatherCards[1].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.weatherCard}
                  onPress={() => handleCardPress(item.id, item.title)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardValue}>{item.value}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.forecastSection}>
  <Text style={styles.forecastTitle}>{t('home.forecast10')}</Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.forecastScrollView}
    contentContainerStyle={styles.forecastScrollContent}
  >
    {(forecastDays.length > 0 ? forecastDays : Array.from({ length: 5 }, (_, i) => ({
      date: null, weathercode: null, tempMax: null, tempMin: null,
      precipitation: 0, rainProba: null,
    }))).map((day, index) => {
      const dt       = day.date ? new Date(day.date) : null;
      const DAY_FR   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
      const dayLabel = !dt ? `J+${index}`
        : index === 0 ? t('home.today')
        : index === 1 ? t('home.tomorrow')
        : `${DAY_FR[dt.getDay()]}.${dt.getDate()}`;
      const wcode    = day.weathercode;
      const emoji    = wcode == null ? '…'
        : wcode === 0 ? '☀️'
        : wcode <= 2  ? '⛅'
        : wcode <= 3  ? '☁️'
        : wcode <= 48 ? '🌫️'
        : wcode <= 55 ? '🌦️'
        : wcode <= 67 ? '🌧️'
        : wcode <= 77 ? '🌨️'
        : wcode <= 82 ? '🌧️'
        : wcode <= 86 ? '❄️'
        : '⛈️';
      const hasRain  = (day.precipitation || 0) >= 0.5;
      const rainProba = day.rainProba != null ? `${day.rainProba}%` : null;

      return (
        <View key={index} style={[styles.forecastDayCard, hasRain && styles.forecastDayCardRain]}>
          <Text style={styles.forecastDay}>{dayLabel}</Text>
          <Text style={styles.forecastCondition}>{emoji}</Text>
          <Text style={styles.forecastTemp}>
            {day.tempMax != null ? `${convertTemperature(day.tempMax, useCelsius).toFixed(0)}°` : '--°'}
          </Text>
          <Text style={styles.forecastTempMin}>
            {day.tempMin != null ? `${convertTemperature(day.tempMin, useCelsius).toFixed(0)}°` : '--°'}
          </Text>
          {hasRain ? (
            <View style={styles.rainInfo}>
              <Text style={styles.rainIcon}>💧</Text>
              <Text style={styles.rainPercent}>{(day.precipitation || 0).toFixed(1)}</Text>
            </View>
          ) : (
            <View style={styles.rainInfo}>
              <Text style={styles.rainIcon}>☀️</Text>
              <Text style={[styles.rainPercent, { color: '#ffd600' }]}>{t('home.dry')}</Text>
            </View>
          )}
          {rainProba && (
            <Text style={styles.forecastProba}>{rainProba}</Text>
          )}
        </View>
      );
    })}
  </ScrollView>

  <TouchableOpacity
    style={styles.seeMoreButton}
    onPress={() => router.push({
      pathname: '/forecastDetail',
      params: {
        city: stationData ? (stationData.address || stationData.description || t('home.localLocation')) : t('home.localLocation'),
        lat: currentLocation.lat,
        lon: currentLocation.lon,
      }
    })}
  >
    <Text style={styles.seeMoreButtonText}>{t('home.seeFullTable')}</Text>
  </TouchableOpacity>
</View>
        </View>
      </ScrollView>

        {/* Suggestions d'autocomplétion */}
  {showSuggestions && searchSuggestions.length > 0 && (
    <View style={styles.suggestionsContainer}>
      {searchSuggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={`suggestion-${index}`}
          style={styles.suggestionItem}
          onPress={() => handleSuggestionSelect(suggestion)}
        >
          <Text style={styles.suggestionText}>{suggestion.display}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )}

  
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Bannière alerte critique ──
  criticalBannerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.92)',
    overflow: 'hidden',
  },
  criticalBannerContent: {
    padding: 14,
    paddingRight: 8,
  },
  criticalBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  criticalBannerSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  criticalBannerTap: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  criticalBannerX: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  criticalBannerXText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },

  container: {
    flex: 1,
    backgroundColor: "#728eb1",
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  // Changer le header pour qu'il ait un fond solide
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50, // Pour la barre de statut
    backgroundColor: "#4facfe", // Fond solide
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingRight: 10,
    paddingLeft: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  gpsStatus: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 8,
  },
  forecastTitle: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 15,
  textAlign: "center",
},
  gpsActive: {
    backgroundColor: "rgba(76, 217, 100, 0.2)",
    borderColor: "rgba(76, 217, 100, 0.4)",
  },

  forecastScrollContent: {
  paddingHorizontal: 5,
  paddingVertical: 5,
},

  gpsStatusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
  },
   horizontalScrollContent: {
    paddingHorizontal: 15, // Espace sur les côtés
    paddingVertical: 5,
  },
  pollingButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginRight: 8,
  },
  pollingButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pollingButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
  },
    positionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scrollContent: {
    paddingBottom: 80, // Padding en bas
    marginTop: 60,
  },
  loginButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  loginText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  searchContainer: {
    width: "100%",
    marginBottom: 5,
  },

  rainPercent: {
  color: "rgba(255, 255, 255, 0.8)",
  fontSize: 12,
},

  forecastDayCard: {
  backgroundColor: "rgba(255, 255, 255, 0.07)",
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 10,
  marginRight: 10,
  width: 80,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.12)",
},
  forecastDayCardRain: {
  backgroundColor: "rgba(33, 150, 243, 0.18)",
  borderColor: "rgba(33, 150, 243, 0.4)",
},
  forecastProba: {
  color: "rgba(33, 150, 243, 0.9)",
  fontSize: 10,
  fontWeight: "700",
  marginTop: 2,
},

forecastDay: {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 8,
},

seeMoreButton: {
  backgroundColor: "rgba(255, 255, 255, 0.12)",
  paddingVertical: 12,
  borderRadius: 10,
  marginTop: 15,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
},


  searchBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    overflow: "hidden",
    paddingHorizontal: 15,
    height: 50,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // headerContent: {
  //   paddingHorizontal: 20,
  //   //paddingBottom: 15, // Espace en bas du header
  // },

  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
  },
  rainInfo: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 4,
},

  searchButton: {
    paddingLeft: 10,
    paddingVertical: 10,
  },
  searchButtonText: {
    fontSize: 20,
    color: "#fff",
    opacity: 0.8,
  },
  forecastScrollView: {
  marginHorizontal: -5,
},

cardHeader: {
  //flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 10,
  
},

alertButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(255, 193, 7, 0.15)",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(255, 193, 7, 0.3)",
},
alertIcon: {
  fontSize: 14,
  marginRight: 5,
},

alertText: {
  color: "#ffc107",
  fontSize: 12,
  fontWeight: "600",
},

activeAlertIndicator: {
  backgroundColor: "rgba(220, 53, 69, 0.15)",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(220, 53, 69, 0.3)",
  marginTop: 10,
  alignItems: "center",
},

activeAlertText: {
  color: "#dc3545",
  fontSize: 12,
  fontWeight: "600",
},

  positionInfo: {
    marginTop: 8,
    marginBottom: 5,
  },
  positionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: 'monospace',
  },
  sectionHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  paddingHorizontal: 15,
},
  positionSubtext: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    
  },
  updateInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 5,
  },
  updateText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  forecastCondition: {
  fontSize: 24,
  marginBottom: 8,
},

  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    flex: 1,
  },
   weatherCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    padding: 12,
    marginRight: 12,
    width: 150, // Largeur fixe pour chaque carte
    minHeight: 140,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtons: {
    flexDirection: "row",
  },
  smallRefreshButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
  },

  forecastTemp: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 2,
},

settingsButton: {
  // backgroundColor: "rgba(255, 255, 255, 0.15)",
  // paddingHorizontal: 12,
  // paddingVertical: 6,
  // borderRadius: 12,
  // borderWidth: 1,
  // borderColor: "rgba(255, 255, 255, 0.3)",
  // marginRight: 8,
},
settingsIcon: {
  fontSize: 16,
  color: "#fff",
  paddingHorizontal: 12,
},

forecastTempMin: {
  color: "rgba(255, 255, 255, 0.7)",
  fontSize: 14,
  marginBottom: 8,
},

  weatherCardsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  cardsSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 5,
  },
    sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 15,
  },
  cardsContainer: {
    flexDirection: "column",
     marginTop: 10,
    marginBottom: 20,
  },

  scrollIndicators: {
  flexDirection: "row",
},

scrollDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "rgba(255, 255, 255, 0.3)",
  marginHorizontal: 3,
},
scrollDotActive: {
  backgroundColor: "#ffffff",
  width: 16,
},
  cardRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  cardTitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  cardValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 5,
  },
  cardSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    textAlign: "center",
    marginTop: 5,
  },

  seeMoreButtonText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
},

  mainContent: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
    headerSpacer: {
    height: 230, // DOIT ÊTRE EXACTEMENT LA MÊME HAUTEUR QUE LE HEADER
  },
  city: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    textAlign: 'center',
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 5,
  },

  loadingForecast: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 20,
},

  distanceInfo: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginBottom: 10,
  },

  loadingForecastText: {
  color: "rgba(255, 255, 255, 0.7)",
  fontSize: 12,
  marginLeft: 10,
},
  coords: {
    color: "#fff",
    marginTop: 10,
    opacity: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  temp: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 10,
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  todayTempContainer: {
    marginBottom: 10,
    marginTop: 10,
  },
  todayTempCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    width: 250,
  },
  todayTempLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: "center",
    
  },

  sunriseSunsetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginHorizontal: 0,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sunriseSunsetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sunriseSunsetEmoji: { fontSize: 26 },
  sunriseSunsetTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sunriseSunsetLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 1,
  },
  sunriseSunsetDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  sunriseSunsetCenter: {
    alignItems: 'center',
    flex: 1,
  },
  sunriseSunsetDaylight: {
    color: '#ffd600',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sunriseSunsetArc: {
    fontSize: 20,
    marginTop: 2,
  },

  forecastSection: {
  marginTop: 25,
  padding: 15,
  backgroundColor: "rgba(54, 52, 52, 0.15)",
  borderRadius: 15,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.15)",
},
  todayTempDescription: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  additionalInfo: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  debugSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  debugTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  debugRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  debugLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
  },
  debugValue: {
    color: "#fff",
    fontSize: 11,
    fontFamily: 'monospace',
  },
  debugActive: {
    color: "#4cd964",
  },
  debugInactive: {
    color: "#ff3b30",
  },
  debugButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  windContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
    width: "100%",
  },
  windGraph: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: 8,
    height: 70,
  },
  windBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 50,
    marginRight: 10,
  },
  windBar: {
    width: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  windBarActive: {
    backgroundColor: "#ffffff",
  },
  windDirectionArrow: {
    marginLeft: 5,
  },
  windInfo: {
    alignItems: "center",
  },
  windSpeedValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  windDirectionText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  windDescription: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    marginTop: 2,
  },

  
  positionIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    //tintColor: "#ffffff", // Pour colorer l'icône en blanc si elle est noire
  },
  
  positionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  
  positionTextContainer: {
    flex: 1,
  },
  
  positionIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

positionIconInactive: {
  opacity: 0.5,
},

gpsActiveDot: {
  position: 'absolute',
  top: -2,
  right: -2,
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: '#4cd964',
  borderWidth: 1,
  borderColor: '#4facfe',
},

rainMapButton: {
  backgroundColor: "rgba(33, 150, 243, 0.2)",
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 12,
  marginTop: 15,
  marginBottom: 20,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(33, 150, 243, 0.4)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 3,
  width: 250,
  alignSelf: "center", // Pour centrer le bouton
},

rainMapButtonText: {
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "600",
},

rainMapButtonMinimal: {
  backgroundColor: "rgba(33, 150, 243, 0.12)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: 14,
  padding: 14,
  marginTop: 15,
  marginBottom: 20,
  width: "85%",
  alignSelf: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
},

rainMapButtonInner: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

rainIconMinimal: {
  fontSize: 22,
  opacity: 0.9,
},

rainMapButtonTextMinimal: {
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "500",
  flex: 1,
  marginLeft: 12,
  letterSpacing: 0.2,
},

badgeContainer: {
  minWidth: 40,
},

rainBadge: {
  backgroundColor: "rgba(76, 217, 100, 0.2)",
  color: "#4cd964",
  fontSize: 11,
  fontWeight: "600",
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(76, 217, 100, 0.3)",
},
// Version 1
rainMapButtonV1: {
  backgroundColor: "rgba(33, 150, 243, 0.15)",
  paddingHorizontal: 25,
  paddingVertical: 14,
  borderRadius: 16,
  marginTop: 18,
  marginBottom: 20,
  borderWidth: 1.5,
  borderColor: "rgba(33, 150, 243, 0.3)",
  shadowColor: "#2196F3",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 5,
  width: 280,
  alignSelf: "center",
},

rainMapIcon: {
  fontSize: 22,
},

rainMapArrow: {
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: 18,
  fontWeight: "bold",
},

// Version 2
rainMapButtonV2: {
  backgroundColor: "rgba(33, 150, 243, 0.12)",
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderRadius: 20,
  marginTop: 20,
  marginBottom: 25,
  borderWidth: 1,
  borderColor: "rgba(33, 150, 243, 0.25)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 4,
  width: 300,
  alignSelf: "center",
},

rainMapButtonContent: {
  flexDirection: "row",
  alignItems: "center",
},

rainMapIconContainer: {
  backgroundColor: "rgba(33, 150, 243, 0.25)",
  width: 50,
  height: 50,
  borderRadius: 25,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 15,
},

rainMapIconLarge: {
  fontSize: 26,
},

rainMapTextWrapper: {
  flex: 1,
},

rainMapButtonTitle: {
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 3,
},

rainMapButtonSubtitle: {
  color: "rgba(255, 255, 255, 0.7)",
  fontSize: 12,
},

// Version 3
rainMapButtonV3: {
  backgroundColor: "rgba(33, 150, 243, 0.18)",
  paddingHorizontal: 25,
  paddingVertical: 16,
  borderRadius: 14,
  marginTop: 18,
  marginBottom: 22,
  borderWidth: 1.5,
  borderColor: "rgba(255, 255, 255, 0.2)",
  position: "relative",
  overflow: "hidden",
  width: 260,
  alignSelf: "center",
  alignItems: "center",
},

buttonShineEffect: {
  position: "absolute",
  top: -50,
  left: -50,
  width: 100,
  height: 100,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 50,
  transform: [{ rotate: "45deg" }],
},

rainMapButtonIcon: {
  fontSize: 24,
  marginBottom: 8,
},

rainMapButtonLabel: {
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "600",
  letterSpacing: 0.5,
},

// Version 4
rainMapButtonV4: {
  backgroundColor: "rgba(33, 150, 243, 0.1)",
  padding: 18,
  borderRadius: 18,
  marginTop: 20,
  marginBottom: 25,
  borderWidth: 1,
  borderColor: "rgba(33, 150, 243, 0.2)",
  shadowColor: "#2196F3",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 3,
  width: 280,
  alignSelf: "center",
},

rainMapHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

rainIcon: {
  fontSize: 22,
  marginRight: 10,
},

rainMapTitle: {
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "600",
  flex: 1,
},

rainIndicator: {
  backgroundColor: "rgba(0, 0, 0, 0.1)",
  padding: 10,
  borderRadius: 10,
},

rainAmount: {
  color: "#90CAF9",
  fontSize: 13,
  fontWeight: "500",
  marginBottom: 6,
  textAlign: "center",
},

rainLevelBar: {
  height: 6,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 3,
  overflow: "hidden",
},

rainLevelFill: {
  height: "100%",
  backgroundColor: "#2196F3",
  borderRadius: 3,
},

noRainText: {
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: 13,
  textAlign: "center",
  fontStyle: "italic",
  paddingVertical: 8,
},

// Version 5 (Glassmorphism)
// Bouton avec dimensions augmentées
rainMapButtonLarge: {
  backgroundColor: "rgba(33, 150, 243, 0.08)",
  padding: 25,
  borderRadius: 22,
  marginTop: 20,
  marginBottom: 25,
  borderWidth: 1.5,
  borderColor: "rgba(255, 255, 255, 0.2)",
  position: "relative",
  overflow: "hidden",
  width: 340, // Augmenté de 290 à 340
  height: 180, // Augmenté de 140 à 180
  alignSelf: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
},

mapOverlayLarge: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(33, 150, 243, 0.25)", // Overlay légèrement plus sombre
  borderRadius: 22,
},

glassEffectLarge: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderRadius: 22,
},

// Contenu du bouton redimensionné
buttonContentLarge: {
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
},

iconCircleLarge: {
  backgroundColor: "rgba(33, 150, 243, 0.25)",
  width: 70,
  height: 70,
  borderRadius: 35,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 15,
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.3)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

buttonIconLarge: {
  fontSize: 32,
},

buttonMainTextLarge: {
  color: "#ffffff",
  fontSize: 20,
  fontWeight: "700",
  marginBottom: 8,
  letterSpacing: 0.5,
  textShadowColor: "rgba(0, 0, 0, 0.3)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
},

buttonHintLarge: {
  color: "rgba(255, 255, 255, 0.85)",
  fontSize: 15,
  fontWeight: "500",
  letterSpacing: 0.3,
},

// ─── Hero section ────────────────────────────────────────────────────────────
heroSection: {
  alignItems: 'center',
  paddingVertical: 24,
  paddingHorizontal: 16,
  marginBottom: 8,
},
heroCity: {
  fontSize: 20,
  fontWeight: '700',
  color: '#fff',
  textAlign: 'center',
  textShadowColor: 'rgba(0,0,0,0.2)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 3,
},
heroDistance: {
  color: 'rgba(255,255,255,0.6)',
  fontSize: 12,
  marginTop: 4,
},
heroConditionEmoji: {
  fontSize: 60,
  marginVertical: 10,
},
heroTemp: {
  fontSize: 86,
  fontWeight: '300',
  color: '#fff',
  lineHeight: 96,
  textShadowColor: 'rgba(0,0,0,0.2)',
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 4,
},
heroConditionLabel: {
  fontSize: 18,
  fontWeight: '500',
  color: 'rgba(255,255,255,0.85)',
  marginTop: 6,
  marginBottom: 16,
  letterSpacing: 0.3,
},
heroStatsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.12)',
  borderRadius: 22,
  paddingVertical: 12,
  paddingHorizontal: 8,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.18)',
},
heroStatItem: {
  alignItems: 'center',
  paddingHorizontal: 16,
},
heroStatValue: {
  color: '#fff',
  fontSize: 17,
  fontWeight: '600',
},
heroStatLabel: {
  color: 'rgba(255,255,255,0.55)',
  fontSize: 10,
  marginTop: 2,
},
heroStatDivider: {
  width: 1,
  height: 28,
  backgroundColor: 'rgba(255,255,255,0.2)',
},
heroAlertBadge: {
  backgroundColor: 'rgba(220,53,69,0.18)',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: 'rgba(220,53,69,0.35)',
  marginTop: 12,
},
heroAlertText: {
  color: '#ff8080',
  fontSize: 12,
  fontWeight: '600',
},

// ─── Quick 2×2 grid ──────────────────────────────────────────────────────────
quickGrid: {
  marginBottom: 16,
},
quickGridRow: {
  flexDirection: 'row',
  marginBottom: 10,
},
quickCard: {
  flex: 1,
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.16)',
  marginHorizontal: 5,
},
quickCardEmoji: {
  fontSize: 26,
  marginBottom: 6,
},
quickCardValue: {
  color: '#fff',
  fontSize: 20,
  fontWeight: '700',
},
quickCardUnit: {
  color: 'rgba(255,255,255,0.55)',
  fontSize: 10,
  marginTop: 2,
},
quickCardLabel: {
  color: 'rgba(255,255,255,0.75)',
  fontSize: 11,
  marginTop: 5,
  fontWeight: '500',
},

// ─── Compact rain map button ─────────────────────────────────────────────────
rainMapButtonCompact: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(33,150,243,0.1)',
  borderRadius: 18,
  padding: 18,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: 'rgba(33,150,243,0.3)',
  overflow: 'hidden',
  position: 'relative',
},
rainMapCompactIcon: {
  fontSize: 32,
  marginRight: 14,
},
rainMapCompactText: {
  flex: 1,
},
rainMapCompactTitle: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
rainMapCompactSub: {
  color: 'rgba(255,255,255,0.6)',
  fontSize: 12,
  marginTop: 3,
},
rainMapCompactArrow: {
  color: 'rgba(255,255,255,0.7)',
  fontSize: 22,
  fontWeight: '600',
},

// ─── Detail cards section ─────────────────────────────────────────────────────
detailCardsSection: {
  marginBottom: 16,
},
detailCardsHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 4,
  marginBottom: 12,
},
detailCardsTitle: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
  letterSpacing: 0.2,
},

suggestionsContainer: {
  position: 'absolute',
  top: 55,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: 'rgba(0, 0, 0, 0.1)',
  zIndex: 1000,
  maxHeight: 200,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
},

suggestionItem: {
  paddingHorizontal: 15,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(0, 0, 0, 0.05)',
},

suggestionText: {
  fontSize: 14,
  color: '#333',
},
});
//1041 {stationData?.address ? ` • ${stationData.address}` : ''}