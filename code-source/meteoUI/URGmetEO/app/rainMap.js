import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Heatmap, Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiClient } from './api.js';

const { width, height } = Dimensions.get('window');

// Constante au niveau du module — accessible partout dans le fichier
const rainIntensities = {
  'very-light': { color: 'rgba(33, 150, 243, 0.3)', label: 'Très légère (< 0.5 mm)', emoji: '🌦️' },
  'light':      { color: 'rgba(33, 150, 243, 0.5)', label: 'Légère (0.5-2.5 mm)',     emoji: '🌧️' },
  'moderate':   { color: 'rgba(255, 152, 0, 0.6)',  label: 'Modérée (2.5-7.5 mm)',    emoji: '🌧️🌧️' },
  'heavy':      { color: 'rgba(244, 67, 54, 0.7)',  label: 'Forte (7.5-15 mm)',        emoji: '⛈️' },
  'violent':    { color: 'rgba(156, 39, 176, 0.8)', label: 'Violente (> 15 mm)',       emoji: '🌩️' },
};

// Composant statique au niveau du module — ne se recrée pas à chaque rendu
function DepartmentMarker({ dept }) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const icon = dept.hasRain ? (rainIntensities[dept.intensity]?.emoji || '🌧️') : '☀️';

  return (
    <Marker
      coordinate={{ latitude: dept.lat, longitude: dept.lon }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View onLayout={() => setTracksViewChanges(false)}>
        <Text style={styles.deptIconOnly}>{icon}</Text>
      </View>
    </Marker>
  );
}

export default function RainMap() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Valider les paramètres d'entrée
  const initialLat = parseFloat(params.lat);
  const initialLon = parseFloat(params.lon);
  
  const [mapRegion, setMapRegion] = useState({
    latitude: !isNaN(initialLat) ? initialLat : 18.533333,
    longitude: !isNaN(initialLon) ? initialLon : -72.333333,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  
  const [rainZones, setRainZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [timeRange, setTimeRange] = useState('current');
  const [departmentWeather, setDepartmentWeather] = useState([]);
  
  const mapRef = useRef(null);
  const mapRegionRef = useRef(mapRegion);
  const regionChangeTimer = useRef(null);
  const timeRangeRef = useRef('current');

  // Récupérer les zones de pluie
  const fetchRainZones = async () => {
    const region = mapRegionRef.current;
    try {
      setLoading(true);

      const bounds = [
        region.latitude - region.latitudeDelta,
        region.longitude - region.longitudeDelta,
        region.latitude + region.latitudeDelta,
        region.longitude + region.longitudeDelta,
      ];

      console.log('📡 Chargement zones pluie pour bounds:', bounds);

      const hours = timeRangeRef.current === 'current' ? 0 : parseInt(timeRangeRef.current);
      const response = await apiClient.get('/api/rain/rain-zones', {
        params: { bounds: bounds.join(','), ...(hours > 0 ? { hours } : {}) }
      });

      if (response.data && response.data.features) {
        const validZones = response.data.features.filter(zone => {
          const coords = zone.geometry?.coordinates;
          return coords &&
                 coords.length === 2 &&
                 typeof coords[1] === 'number' &&
                 typeof coords[0] === 'number' &&
                 !isNaN(coords[1]) &&
                 !isNaN(coords[0]);
        });

        console.log(`✅ ${validZones.length} zones reçues (Open-Meteo)`);
        setRainZones(validZones);
      }
    } catch (error) {
      console.error('❌ Erreur chargement zones pluie:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Changement de région avec debounce
  const handleRegionChange = (region) => {
    setMapRegion(region);
    mapRegionRef.current = region;
    if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
    regionChangeTimer.current = setTimeout(fetchRainZones, 1500);
  };
  
  // Résumé météo par département haïtien
  const fetchDepartmentWeather = async () => {
    try {
      const hours = timeRangeRef.current === 'current' ? 0 : parseInt(timeRangeRef.current);
      const response = await apiClient.get('/api/rain/department-summary', {
        params: hours > 0 ? { hours } : {}
      });
      if (response.data?.departments) {
        setDepartmentWeather(response.data.departments);
      }
    } catch (error) {
      console.error('❌ Erreur départements:', error.message);
    }
  };

  
  // Zoom sur la position actuelle
  const zoomToCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      if (location && location.coords) {
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        
        mapRegionRef.current = newRegion;
        setMapRegion(newRegion);
        fetchRainZones();

        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error) {
      console.error('Erreur localisation:', error);
    }
  };
  
  // Chargement initial + rafraîchissement toutes les 5 minutes
  useEffect(() => {
    fetchRainZones();
    fetchDepartmentWeather();
    const interval = setInterval(() => {
      fetchRainZones();
      fetchDepartmentWeather();
    }, 300000);
    return () => {
      clearInterval(interval);
      if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
    };
  }, []);
  
  
  // Composant Marker sécurisé
  const SafeMarker = ({ zone, onPress, index }) => {
    if (!zone || !zone.geometry || !zone.geometry.coordinates) {
      console.warn('Zone invalide pour marqueur:', zone);
      return null;
    }
    
    const coordinates = zone.geometry.coordinates;
    const lat = coordinates[1];
    const lon = coordinates[0];
    
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      console.warn('Coordonnées invalides:', lat, lon);
      return null;
    }
    
    const intensity = rainIntensities[zone.properties?.intensity] || rainIntensities.light;
    
    return (
      <Marker
        key={`rain-${index}-${lat}-${lon}`}
        coordinate={{
          latitude: lat,
          longitude: lon,
        }}
        onPress={onPress}
      >
        <View style={styles.rainMarker}>
          <View style={[styles.markerCircle, { backgroundColor: intensity.color }]}>
            <Text style={styles.markerText}>{intensity.emoji}</Text>
          </View>
          <View style={styles.markerTriangle} />
        </View>
      </Marker>
    );
  };
  
  // Rendu des polygones de zone
  const renderRainPolygons = () => {
    if (rainZones.length === 0) return null;
    
    // Group zones by grid for polygons (simplifié)
    const zonesByGrid = {};
    
    rainZones.forEach(zone => {
      if (zone.geometry.type === 'Point') {
        const coords = zone.geometry.coordinates;
        const lat = coords[1];
        const lon = coords[0];
        
        if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
          return;
        }
        
        const gridKey = `${Math.floor(lat * 10)},${Math.floor(lon * 10)}`;
        
        if (!zonesByGrid[gridKey]) {
          zonesByGrid[gridKey] = {
            zones: [],
            totalRainfall: 0,
            maxIntensity: 'light'
          };
        }
        
        zonesByGrid[gridKey].zones.push(zone);
        zonesByGrid[gridKey].totalRainfall += zone.properties.rainfall || 0;
        
        // Déterminer l'intensité max
        const intensities = ['very-light', 'light', 'moderate', 'heavy', 'violent'];
        const currentIdx = intensities.indexOf(zonesByGrid[gridKey].maxIntensity);
        const zoneIdx = intensities.indexOf(zone.properties.intensity);
        
        if (zoneIdx > currentIdx) {
          zonesByGrid[gridKey].maxIntensity = zone.properties.intensity;
        }
      }
    });
    
    // Créer des polygones pour chaque grille
    return Object.entries(zonesByGrid).map(([gridKey, data], index) => {
      const [gridLat, gridLon] = gridKey.split(',').map(Number);
      const intensity = rainIntensities[data.maxIntensity] || rainIntensities.light;
      
      return (
        <Polygon
          key={`poly-${index}`}
          coordinates={[
            { latitude: gridLat / 10, longitude: gridLon / 10 },
            { latitude: gridLat / 10, longitude: (gridLon + 1) / 10 },
            { latitude: (gridLat + 1) / 10, longitude: (gridLon + 1) / 10 },
            { latitude: (gridLat + 1) / 10, longitude: gridLon / 10 },
          ]}
          fillColor={intensity.color}
          strokeColor="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
        />
      );
    });
  };
  
  // Rendu de la légende
  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <TouchableOpacity
          style={styles.legendHeader}
          onPress={() => setShowLegend(!showLegend)}
        >
          <Text style={styles.legendTitle}>Détails par département · Intensités</Text>
          <Text style={styles.legendToggle}>{showLegend ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showLegend && (
          <View style={styles.legendContent}>
            {/* Résumé par département */}
            {departmentWeather.length > 0 && (
              <View style={styles.deptSummaryGrid}>
                {departmentWeather.map((d, i) => (
                  <View key={i} style={[styles.deptSummaryItem, { borderColor: d.hasRain ? '#1565C0' : '#F9A825' }]}>
                    <Text style={styles.deptSummaryIcon}>
                      {d.hasRain ? (rainIntensities[d.intensity]?.emoji || '🌧️') : '☀️'}
                    </Text>
                    <Text style={styles.deptSummaryName}>{d.name}</Text>
                    <Text style={styles.deptSummaryVal}>
                      {d.hasRain ? `${d.rainfall} mm` : 'Sec'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Échelle d'intensité */}
            <Text style={styles.legendSectionTitle}>Échelle d'intensité</Text>
            {Object.entries(rainIntensities).map(([key, data]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: data.color }]} />
                <Text style={styles.legendLabel}>{data.emoji} {data.label}</Text>
              </View>
            ))}

            <View style={styles.legendStats}>
              <Text style={styles.legendStatsText}>
                Source: Open-Meteo · {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };
  
  // Rendu des contrôles de temps
  const renderTimeControls = () => (
    <View style={styles.timeControls}>
      <Text style={styles.timeLabel}>Période de prévision</Text>
      <View style={styles.timeButtonsRow}>
        {['current', '3h', '6h', '9h', '12h'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.timeButton, timeRange === period && styles.timeButtonActive]}
            onPress={() => {
              if (period === timeRange) return;
              timeRangeRef.current = period;
              setTimeRange(period);
              fetchRainZones();
              fetchDepartmentWeather();
            }}
          >
            <Text style={[styles.timeButtonText, timeRange === period && styles.timeButtonTextActive]}>
              {period === 'current' ? 'Actuel' : period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  if (loading && rainZones.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement de la carte de pluie...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Carte de pluie</Text>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchRainZones}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>
      
      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        initialRegion={mapRegion}
      >
        {/* Marqueur position actuelle - avec validation */}
        {!isNaN(mapRegion.latitude) && !isNaN(mapRegion.longitude) && (
          <Marker
            coordinate={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            }}
            title="Votre position"
            description={params.city || "Localisation actuelle"}
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
              <View style={styles.currentLocationRing} />
            </View>
          </Marker>
        )}
        
        {/* Zones de pluie - polygones */}
        {renderRainPolygons()}
        
        {/* Marqueurs de pluie sécurisés */}
        {rainZones.map((zone, index) => (
          <SafeMarker
            key={`marker-${index}`}
            zone={zone}
            index={index}
            onPress={() => setSelectedZone(zone)}
          />
        ))}
        
        {/* Marqueurs par département */}
        {departmentWeather.map((dept, idx) => (
          <DepartmentMarker
            key={`dept-${dept.name}-${dept.hasRain}-${dept.intensity || 'none'}`}
            dept={dept}
          />
        ))}

        {/* Heatmap optionnel */}
        {rainZones.length > 5 && (
          <Heatmap
            points={rainZones
              .filter(zone => {
                const coords = zone.geometry?.coordinates;
                return coords && coords.length === 2 && !isNaN(coords[1]) && !isNaN(coords[0]);
              })
              .map(zone => ({
                latitude: zone.geometry.coordinates[1],
                longitude: zone.geometry.coordinates[0],
                weight: zone.properties.rainfall || 1
              }))}
            radius={50}
            opacity={0.7}
            gradient={{
              colors: ['rgba(33, 150, 243, 0)', 'rgba(33, 150, 243, 0.5)', 'rgba(255, 152, 0, 0.7)', 'rgba(244, 67, 54, 0.9)'],
              startPoints: [0, 0.3, 0.6, 1]
            }}
          />
        )}
      </MapView>
      
      {/* Contrôles de carte */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            const haitiRegion = { latitude: 19.0, longitude: -73.0, latitudeDelta: 4.0, longitudeDelta: 4.5 };
            mapRegionRef.current = haitiRegion;
            setMapRegion(haitiRegion);
            if (mapRef.current) mapRef.current.animateToRegion(haitiRegion, 800);
          }}
        >
          <Text style={styles.controlButtonTextSmall}>🇭🇹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={zoomToCurrentLocation}
        >
          <Text style={styles.controlButtonText}>📍</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            const r = mapRegionRef.current;
            const newRegion = { ...r, latitudeDelta: Math.max(0.001, r.latitudeDelta * 0.5), longitudeDelta: Math.max(0.001, r.longitudeDelta * 0.5) };
            mapRegionRef.current = newRegion;
            setMapRegion(newRegion);
            fetchRainZones();
          }}
        >
          <Text style={styles.controlButtonText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            const r = mapRegionRef.current;
            const newRegion = { ...r, latitudeDelta: Math.min(20, r.latitudeDelta * 2), longitudeDelta: Math.min(20, r.longitudeDelta * 2) };
            mapRegionRef.current = newRegion;
            setMapRegion(newRegion);
            fetchRainZones();
          }}
        >
          <Text style={styles.controlButtonText}>-</Text>
        </TouchableOpacity>
      </View>
      
      {/* Barre de résumé départements — en haut sous le header */}
      {departmentWeather.length > 0 && (
        <View style={styles.deptSummaryBar}>
          <Text style={styles.deptSummaryBarText}>
            🌧️ {departmentWeather.filter(d => d.hasRain).length} sous la pluie
            {'   '}
            ☀️ {departmentWeather.filter(d => !d.hasRain).length} ensoleillé(s)
          </Text>
        </View>
      )}

      {/* Légende */}
      {renderLegend()}

      {/* Contrôles de temps */}
      {renderTimeControls()}
      
      {/* Modal des détails */}
      <Modal
        visible={!!selectedZone}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedZone(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedZone && selectedZone.geometry && selectedZone.geometry.coordinates && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedZone.properties?.name || 'Zone pluvieuse'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedZone(null)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.zoneDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Intensité:</Text>
                    <View style={styles.intensityBadge}>
                      <Text style={[
                        styles.intensityText,
                        { color: rainIntensities[selectedZone.properties?.intensity]?.color || '#2196F3' }
                      ]}>
                        {rainIntensities[selectedZone.properties?.intensity]?.emoji || '🌧️'}
                        {' '}
                        {(selectedZone.properties?.intensity || 'light').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Précipitations:</Text>
                    <Text style={styles.detailValue}>
                      {(selectedZone.properties?.rainfall || 0).toFixed(1)} mm/h
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dernière mesure:</Text>
                    <Text style={styles.detailValue}>
                      {selectedZone.properties?.measuredAt 
                        ? new Date(selectedZone.properties.measuredAt).toLocaleTimeString()
                        : 'Inconnue'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Coordonnées:</Text>
                    <Text style={styles.detailValue}>
                      {selectedZone.geometry.coordinates[1]?.toFixed(4) || '0.0000'}°, 
                      {selectedZone.geometry.coordinates[0]?.toFixed(4) || '0.0000'}°
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.detailButton}
                    onPress={() => {
                      // Zoom sur cette zone
                      if (mapRef.current && selectedZone.geometry.coordinates) {
                        const coords = selectedZone.geometry.coordinates;
                        if (!isNaN(coords[1]) && !isNaN(coords[0])) {
                          mapRef.current.animateToRegion({
                            latitude: coords[1],
                            longitude: coords[0],
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                          }, 1000);
                          setSelectedZone(null);
                        }
                      }
                    }}
                  >
                    <Text style={styles.detailButtonText}>Zoom sur cette zone</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#2196F3',
    borderBottomWidth: 1,
    borderBottomColor: '#1976D2',
  },

  deptSummaryBar: {
    position: 'absolute',
    top: 89,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(21, 101, 192, 0.92)',
    paddingVertical: 7,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 10,
    elevation: 7,
  },

  deptSummaryBarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  backButton: {
    padding: 8,
  },
  
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  refreshButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  
  map: {
    flex: 1,
    width: '100%',
  },
  
  mapControls: {
    position: 'absolute',
    right: 20,
    bottom: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  controlButtonText: {
    fontSize: 24,
    color: '#2196F3',
  },
  
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  currentLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  
  currentLocationRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  
  rainMarker: {
    alignItems: 'center',
  },
  
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  
  markerText: {
    fontSize: 20,
  },
  
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: -2,
  },
  
  legendContainer: {
    position: 'absolute',
    top: 119,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    maxHeight: 400,
  },
  
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  
  legendToggle: {
    fontSize: 16,
    color: '#666',
  },
  
  legendContent: {
    padding: 15,
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  legendLabel: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  
  legendStats: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  legendStatsText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  
  deptIconOnly: {
    fontSize: 26,
  },

  deptSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },

  deptSummaryItem: {
    width: '30%',
    margin: '1.5%',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },

  deptSummaryIcon: {
    fontSize: 18,
  },

  deptSummaryName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
    textAlign: 'center',
  },

  deptSummaryVal: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },

  legendSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    marginTop: 4,
  },

  controlButtonTextSmall: {
    fontSize: 18,
    color: '#2196F3',
  },

  timeControls: {
    position: 'absolute',
    bottom: 120,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },

  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  timeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeButton: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    alignItems: 'center',
  },

  timeButtonActive: {
    backgroundColor: '#2196F3',
  },

  timeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2196F3',
  },

  timeButtonTextActive: {
    color: '#fff',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  
  modalClose: {
    fontSize: 20,
    color: '#666',
    padding: 5,
  },
  
  zoneDetails: {
    padding: 20,
  },
  
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  
  intensityBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  detailButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  
  detailButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});