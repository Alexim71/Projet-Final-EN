import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import { apiClient } from './api';

const { width } = Dimensions.get('window');

// Configuration
const POLLING_INTERVAL = 30000; // 30 secondes pour les données météo
const LOCATION_UPDATE_INTERVAL = 10000; // 10 secondes pour la position
const MAX_RETRIES = 3;
const LOCATION_CHANGE_THRESHOLD = 0.001; // ~100m - seuil plus bas pour réactivité
const LOCATION_ACCURACY = Location.Accuracy.Balanced;

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

const getWindDescription = (speedKmh) => {
  if (speedKmh < 5) return "Calme";
  if (speedKmh < 20) return "Léger";
  if (speedKmh < 40) return "Modéré";
  if (speedKmh < 60) return "Fort";
  return "Très fort";
};

const getUVDescription = (uvIndex) => {
  if (uvIndex <= 2) return "Faible";
  if (uvIndex <= 5) return "Modéré";
  if (uvIndex <= 7) return "Élevé";
  if (uvIndex <= 10) return "Très élevé";
  return "Extrême";
};

const getWeatherDescription = (data) => {
  if (!data) return "Ensoleillé";
  const { temperature, humidity, rainfall } = data;
  if (rainfall > 0) return "Pluvieux";
  if (humidity > 80) return "Humide";
  if (temperature > 30) return "Chaud";
  if (temperature < 15) return "Frais";
  return "Ensoleillé";
};

const WindSpeedIndicator = ({ speed = 0, direction = 0 }) => {
  const speedKmh = speed * 3.6;
  const windLevel = Math.min(4, Math.floor(speedKmh / 10));
  const directionCardinal = getCardinalDirection(direction);
  
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
            transform={`rotate(${direction}, 30, 30)`}
          />
          <Circle cx="30" cy="12" r="3" fill="#ffffff" 
            transform={`rotate(${direction}, 30, 30)`}
          />
          <Circle cx="30" cy="30" r="3" fill="#ffffff" />
        </Svg>
      </View>
      
      <View style={styles.windInfo}>
        <Text style={styles.windSpeedValue}>{speedKmh.toFixed(1)} km/h</Text>
        <Text style={styles.windDirectionText}>{directionCardinal}</Text>
        <Text style={styles.windDescription}>{getWindDescription(speedKmh)}</Text>
      </View>
    </View>
  );
};

export default function Home() {
  const params = useLocalSearchParams();
  const [stationData, setStationData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
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
  
  const pollingRef = useRef(null);
  const locationWatchRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastApiLocationRef = useRef(null); // Dernière position utilisée pour l'API
  const appStateRef = useRef(AppState.currentState);
  const router = useRouter();

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

  // 4. Charger les données météo (TOUJOURS utiliser les paramètres explicites)
  const fetchWeatherData = async (latitude, longitude) => {
    try {
      setError(null);
      
      console.log(`📡 Requête météo pour: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      const response = await apiClient.get('/api/geo/nearest', {
        params: {
          lat: latitude,
          lon: longitude
        },
      });
      
      const data = response.data;
      
      if (data.station && data.data) {
        setStationData(data.station);
        setWeatherData(data.data);
        setLastUpdate(new Date());
        retryCountRef.current = 0;
        console.log("✅ Données météo mises à jour");
        
        // Mettre à jour la référence de la dernière position utilisée
        lastApiLocationRef.current = { lat: latitude, lon: longitude };
      }
    } catch (error) {
      console.error('❌ Erreur API météo:', error);
      retryCountRef.current += 1;
      
      if (retryCountRef.current >= MAX_RETRIES) {
        setError("Connexion impossible. Mode démo activé.");
        setPollingEnabled(false);
      }
      
      // Fallback aux données de démo
      setDemoData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 5. Rafraîchissement manuel (utilise la position actuelle)
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
      if (pollingEnabled) {
        console.log("🔄 Rafraîchissement automatique des données météo");
        // TOUJOURS utiliser currentLocation qui est à jour
        fetchWeatherData(currentLocation.lat, currentLocation.lon);
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

  const formatTimeSinceUpdate = (date) => {
    if (!date) return "Jamais";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins === 0) return "À l'instant";
    if (diffMins === 1) return "Il y a 1 minute";
    if (diffMins < 60) return `Il y a ${diffMins} minutes`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "Il y a 1 heure";
    if (diffHours < 24) return `Il y a ${diffHours} heures`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} jours`;
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
    setLastUpdate(new Date());
  };

  const handleLogin = () => {
    router.replace({
      pathname: "/login",
      params: {
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        defaultCity: "Port-au-Prince"
      },
    });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Pour l'exemple, on simule une recherche de Port-au-Prince
    if (searchQuery.toLowerCase().includes("port")) {
      const newLocation = {
        lat: 18.533333,
        lon: -72.333333,
        source: 'search'
      };
      
      setCurrentLocation(newLocation);
      lastApiLocationRef.current = { lat: newLocation.lat, lon: newLocation.lon };
      fetchWeatherData(newLocation.lat, newLocation.lon);
    }
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
          "Position mise à jour",
          "Votre position a été actualisée",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'obtenir votre position actuelle");
    }
  };

  const weatherCards = weatherData ? [
    [
      { 
        id: 1, 
        title: "💨 Vent", 
        component: <WindSpeedIndicator speed={weatherData.wind_speed} direction={weatherData.wind_direction} />,
        subtitle: getWindDescription(weatherData.wind_speed * 3.6),
        value: `${(weatherData.wind_speed * 3.6).toFixed(1)} km/h`
      },
      { 
        id: 2, 
        title: "💧 Humidité", 
        value: `${weatherData.humidity.toFixed(1)}%`, 
        subtitle: weatherData.humidity > 70 ? "Élevée" : "Confortable" 
      },
      { 
        id: 3, 
        title: "📊 Pression", 
        value: `${weatherData.pressure.toFixed(1)} hPa`, 
        subtitle: weatherData.pressure > 1013 ? "Haute" : "Normale" 
      },
    ],
    [
      { 
        id: 4, 
        title: "☀️ UV", 
        value: 2,// value: weatherData.uv_index.toString(), 
        subtitle: getUVDescription(weatherData.uv_index) 
      },
      { 
        id: 5, 
        title: "🌡️ Ressenti", 
        value: `${weatherData.feels_like.toFixed(1)}°C`, 
        subtitle: "Indice thermique" 
      },
      { 
        id: 6, 
        title: "💧 Rosée", 
        value: `${weatherData.dew_point.toFixed(1)}°C`, 
        subtitle: "Point de rosée" 
      },
      { 
        id: 7, 
        title: "☀️ Radiation", 
        value: `${weatherData.solar_radiation} W/m²`, 
        subtitle: "Solaire" 
      },
      { 
        id: 8, 
        title: "🔋 Batterie", 
        value: `${weatherData.battery_level}%`, 
        subtitle: "Niveau batterie" 
      },
    ]
  ] : [[], []];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Initialisation...</Text>
        <Text style={styles.coords}>
          📍 {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
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
        <View style={styles.headerTop}>
          <Text style={styles.appName}>URGmetEO</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.gpsStatus, locationWatchRef.current && styles.gpsActive]} 
              onPress={handleUseCurrentLocation}
            >
              <Text style={styles.gpsStatusText}>
                {locationWatchRef.current ? "📍 ON" : "📍 OFF"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.pollingButton, !pollingEnabled && styles.pollingButtonDisabled]} 
              onPress={() => setPollingEnabled(!pollingEnabled)}
            >
              <Text style={styles.pollingButtonText}>
                {pollingEnabled ? "🔄 ON" : "⏸️ OFF"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une ville..."
              placeholderTextColor="#ffffffb3"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.positionInfo}>
            <TouchableOpacity onPress={handleUseCurrentLocation}>
              <Text style={styles.positionText}>
                📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lon.toFixed(6)}
                {locationAccuracy && ` (±${Math.round(locationAccuracy)}m)`}
              </Text>
              <Text style={styles.positionSubtext}>
                Source: {currentLocation.source} • 
                Dernier check: {lastLocationCheck ? formatTimeSinceUpdate(lastLocationCheck) : 'Jamais'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.updateInfoContainer}>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.updateText}>
                Météo: {formatTimeSinceUpdate(lastUpdate)}
                {pollingEnabled && ` • Auto: ${POLLING_INTERVAL/1000}s`}
              </Text>
            )}
            
            <View style={styles.refreshButtons}>
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

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#ffffff"]}
            tintColor="#ffffff"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weatherCardsSection}>
          <View style={styles.mainContent}>
            <Text style={styles.city}>
              {stationData ? stationData.description : "Météo locale"}
            </Text>
            <Text style={styles.distanceInfo}>
              {stationData && stationData.distance ? 
                `Distance: ${stationData.distance.toFixed(1)} km` : 
                ""}
            </Text>
            <Text style={styles.temp}>
              {weatherData ? `${weatherData.temperature.toFixed(1)}°C` : "--°C"}
            </Text>
            
            <View style={styles.todayTempContainer}>
              <View style={styles.todayTempCard}>
                <Text style={styles.todayTempLabel}>Conditions actuelles</Text>
                <Text style={styles.todayTempDescription}>
                  {getWeatherDescription(weatherData)}
                </Text>
                {weatherData && (
                  <>
                    <Text style={styles.additionalInfo}>
                      Ressenti: {weatherData.feels_like.toFixed(1)}°C
                    </Text>
                    <Text style={styles.additionalInfo}>
                      Humidité: {weatherData.humidity.toFixed(1)}%
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.cardsSectionTitle}>Détails météo</Text>
          
          <View style={styles.cardsContainer}>
            <View style={styles.cardRow}>
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
            </View>
            
            <View style={styles.cardRow}>
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
            </View>
          </View>
          
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Statut du système</Text>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Position actuelle:</Text>
              <Text style={styles.debugValue}>
                {currentLocation.lat.toFixed(6)}, {currentLocation.lon.toFixed(6)}
              </Text>
            </View>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Dernière API:</Text>
              <Text style={styles.debugValue}>
                {lastApiLocationRef.current ? 
                  `${lastApiLocationRef.current.lat.toFixed(6)}, ${lastApiLocationRef.current.lon.toFixed(6)}` : 
                  'Aucune'}
              </Text>
            </View>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Suivi GPS:</Text>
              <Text style={[styles.debugValue, locationWatchRef.current ? styles.debugActive : styles.debugInactive]}>
                {locationWatchRef.current ? 'ACTIF' : 'INACTIF'}
              </Text>
            </View>
            
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Polling météo:</Text>
              <Text style={[styles.debugValue, pollingEnabled ? styles.debugActive : styles.debugInactive]}>
                {pollingEnabled ? 'ACTIF' : 'INACTIF'}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.debugButton} onPress={() => {
              Alert.alert(
                "Forcer mise à jour",
                "Utiliser la position actuelle pour rafraîchir les données?",
                [
                  { text: "Annuler", style: "cancel" },
                  { 
                    text: "OK", 
                    onPress: () => {
                      lastApiLocationRef.current = { 
                        lat: currentLocation.lat, 
                        lon: currentLocation.lon 
                      };
                      fetchWeatherData(currentLocation.lat, currentLocation.lon);
                    }
                  }
                ]
              );
            }}>
              <Text style={styles.debugButtonText}>Forcer rafraîchissement API</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2d40e9",
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
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
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
  gpsActive: {
    backgroundColor: "rgba(76, 217, 100, 0.2)",
    borderColor: "rgba(76, 217, 100, 0.4)",
  },
  gpsStatusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
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
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
    marginBottom: 20,
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
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
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
  positionSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    marginTop: 2,
  },
  updateInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    paddingHorizontal: 5,
  },
  updateText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    flex: 1,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    flex: 1,
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
  weatherCardsSection: {
    marginTop: 200,
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
  cardsContainer: {
    flexDirection: "column",
  },
  cardRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  weatherCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    padding: 12,
    marginRight: 12,
    width: 150,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
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
  mainContent: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
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
  distanceInfo: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginBottom: 10,
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
});