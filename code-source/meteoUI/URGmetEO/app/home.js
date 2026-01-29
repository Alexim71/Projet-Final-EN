import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

// Fonction pour convertir degrés en direction cardinale
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

// Fonction pour obtenir la description météo basée sur les données
const getWeatherDescription = (data) => {
  if (!data) return "Ensoleillé";
  
  const { temperature, humidity, rainfall } = data;
  
  if (rainfall > 0) return "Pluvieux";
  if (humidity > 80) return "Humide";
  if (temperature > 30) return "Chaud";
  if (temperature < 15) return "Frais";
  
  return "Ensoleillé";
};

// Composante pour l'indicateur de vent
const WindSpeedIndicator = ({ speed = 0, direction = 0 }) => {
  // Convertir la vitesse de m/s à km/h si nécessaire
  const speedKmh = speed * 3.6;
  
  // Niveau de vent (0-4)
  const windLevel = Math.min(4, Math.floor(speedKmh / 10));
  
  // Convertir direction en degrés vers cardinal
  const directionCardinal = getCardinalDirection(direction);
  
  return (
    <View style={styles.windContainer}>
      {/* Graphique de la vitesse du vent */}
      <View style={styles.windGraph}>
        {/* Barres de niveau de vent */}
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
        
        {/* Aiguille de direction */}
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
        <Text style={styles.windDescription}>
          {getWindDescription(speedKmh)}
        </Text>
      </View>
    </View>
  );
};

export default function Home() {
  const { lat, lon } = useLocalSearchParams();
  const [stationData, setStationData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetchStationData();
  }, []);

  
const fetchStationData = async () => {
  try {
    setLoading(true);
    
    // Configuration d'axios avec timeout et headers
    const response = await apiClient.get(
      '/api/geo/nearest',
      {
        params: {
          lat: parseFloat(lat),
          lon: parseFloat(lon)
        },
      }
    );
    
    // Avec axios, les données sont directement dans response.data
    const data = response.data;
    
    if (data.station && data.data) {
      setStationData(data.station);
      setWeatherData(data.data);
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    
    // Gestion d'erreur plus détaillée avec axios
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'erreur
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Pas de réponse reçue:', error.request);
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur de configuration:', error.message);
    }
    
    setDemoData();
  } finally {
    setLoading(false);
  }
};
  const setDemoData = () => {
    const demoData = {
      temperature: 32.5,
      humidity: 68.2,
      pressure: 1012.3,
      rainfall: 0,
      wind_speed: 8.5,
      wind_direction: 120,
      solar_radiation: 890,
      uv_index: 11,
      visibility: 15.8,
      dew_point: 25.8,
      battery_level: 78.5,
      signal_strength: -62,
      device_status: "ONLINE",
      feels_like: 36.1,
      heat_index: 35.8,
      wind_chill: 32
    };
    setWeatherData(demoData);
  };

  const handleLogin = () => {
    router.replace({
      pathname: "/login",
      params: {
        lat: 18.533333,
        lon: -72.333333,
        defaultCity: "Port-au-Prince"
      },
    });
  };

  const handleSearch = () => {
    console.log("Searching for:", searchQuery);
  };

  const handleCardPress = (cardId, cardTitle) => {
    router.push({
      pathname: `/cardDetail`,
      params: { 
        cardId: cardId.toString(),
        cardTitle: cardTitle,
        lat: lat,
        lon: lon,
        weatherData: JSON.stringify(weatherData),
        stationData: JSON.stringify(stationData)
      }
    });
  };

  // Données météo dynamiques basées sur les données du backend
  const weatherCards = weatherData ? [
    [
      { 
        id: 1, 
        title: "💨 Vent", 
        component: <WindSpeedIndicator 
          speed={weatherData.wind_speed} 
          direction={weatherData.wind_direction} 
        />,
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
        value: weatherData.uv_index.toString(), 
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

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Chargement des données météo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fond */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="grad1"
            cx="85%"
            cy="15%"
            rx="100%"
            ry="40%"
            fx="100%"
            fy="85%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="25%" stopColor="#e8f4ff" stopOpacity="0.18" />
            <Stop offset="50%" stopColor="#c8e4ff" stopOpacity="0.12" />
            <Stop offset="75%" stopColor="#9fd2ff" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient
            id="grad2"
            cx="15%"
            cy="85%"
            rx="100%"
            ry="45%"
            fx="15%"
            fy="85%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="30%" stopColor="#e3f2ff" stopOpacity="0.14" />
            <Stop offset="60%" stopColor="#b8dcff" stopOpacity="0.08" />
            <Stop offset="90%" stopColor="#8ac8ff" stopOpacity="0.02" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient
            id="grad3"
            cx="35%"
            cy="50%"
            rx="100%"
            ry="40%"
            fx="35%"
            fy="50%"
            gradientUnits="userSpaceOnUse"
          >
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
        <Rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill="rgba(255, 255, 255, 0.02)" 
        />
      </Svg>

      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appName}>URGmetEO</Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
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
        </View>
      </View>

      {/* Section des cartes météo */}
      <View style={styles.weatherCardsSection}>
        <Text style={styles.cardsSectionTitle}>Détails météo</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.cardsScrollView}
          contentContainerStyle={styles.cardsContentContainer}
        >
          <View style={styles.mainContent}>
            <Text style={styles.city}>
              {stationData ? stationData.description : "Météo locale"}
            </Text>
            <Text style={styles.coords}>
              📍 {Number(lat).toFixed(2)}, {Number(lon).toFixed(2)}
            </Text>
            <Text style={styles.temp}>
              {weatherData ? `${weatherData.temperature.toFixed(1)}°C` : "--°C"}
            </Text>
            
            <View style={styles.todayTempContainer}>
              <View style={styles.todayTempCard}>
                <Text style={styles.todayTempLabel}>Aujourd'hui</Text>
                <Text style={styles.todayTempDescription}>
                  {getWeatherDescription(weatherData)}
                </Text>
                {weatherData && (
                  <>
                    <Text style={styles.additionalInfo}>
                      Max: {(weatherData.temperature + 2).toFixed(1)}°C
                    </Text>
                    <Text style={styles.additionalInfo}>
                      Min: {(weatherData.temperature - 2).toFixed(1)}°C
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

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
                  {item.component ? (
                    item.component
                  ) : (
                    <Text style={styles.cardValue}>{item.value}</Text>
                  )}
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
        </ScrollView>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  loginText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
    width: 220,
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
  weatherCardsSection: {
    position: "absolute",
    top: 180,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingLeft: 20,
  },
  cardsSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 5,
  },
  cardsScrollView: {
    flexGrow: 0,
  },
  cardsContentContainer: {
    paddingRight: 20,
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
    paddingHorizontal: 20,
    marginTop: 100,
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
  coords: {
    color: "#fff",
    marginTop: 5,
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
});