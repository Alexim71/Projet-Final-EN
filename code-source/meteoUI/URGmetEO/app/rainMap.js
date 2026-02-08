import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Heatmap, Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiClient } from './../app/api.js';

const { width, height } = Dimensions.get('window');

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
  const [rainHistory, setRainHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [timeRange, setTimeRange] = useState('current'); // 'current', '1h', '3h', '6h'
  
  const mapRef = useRef(null);
  
  // Intensités de pluie avec couleurs
  const rainIntensities = {
    'very-light': { color: 'rgba(33, 150, 243, 0.3)', label: 'Très légère (< 0.5 mm)', emoji: '🌦️' },
    'light': { color: 'rgba(33, 150, 243, 0.5)', label: 'Légère (0.5-2.5 mm)', emoji: '🌧️' },
    'moderate': { color: 'rgba(255, 152, 0, 0.6)', label: 'Modérée (2.5-7.5 mm)', emoji: '🌧️🌧️' },
    'heavy': { color: 'rgba(244, 67, 54, 0.7)', label: 'Forte (7.5-15 mm)', emoji: '⛈️' },
    'violent': { color: 'rgba(156, 39, 176, 0.8)', label: 'Violente (> 15 mm)', emoji: '🌩️' },
  };
  
  // Récupérer les zones de pluie
  const fetchRainZones = async () => {
    try {
      setLoading(true);
      
      const bounds = [
        mapRegion.latitude - mapRegion.latitudeDelta,
        mapRegion.longitude - mapRegion.longitudeDelta,
        mapRegion.latitude + mapRegion.latitudeDelta,
        mapRegion.longitude + mapRegion.longitudeDelta,
      ];
      
      console.log('📡 Chargement zones pluie pour bounds:', bounds);
      
      const response = await apiClient.get('/api/rain/rain-zones', {
        params: {
          bounds: bounds.join(','),
          resolution: 50
        }
      });
      
      console.log('✅ Données zones pluie reçues:', response.data);
      
      if (response.data && response.data.features) {
        // Filtrer les zones avec coordonnées valides
        const validZones = response.data.features.filter(zone => {
          const coords = zone.geometry?.coordinates;
          return coords && 
                 coords.length === 2 && 
                 typeof coords[1] === 'number' && 
                 typeof coords[0] === 'number' &&
                 !isNaN(coords[1]) && 
                 !isNaN(coords[0]);
        });
        
        console.log(`✅ ${validZones.length} zones valides sur ${response.data.features.length}`);
        setRainZones(validZones);
        
        // Si pas de données valides, récupérer autour du point central
        if (validZones.length === 0) {
          fetchRainByLocation();
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement zones pluie:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de pluie');
      
      // Données de démo
      setDemoData();
    } finally {
      setLoading(false);
    }
  };
  
  // Récupérer par localisation
  const fetchRainByLocation = async () => {
    try {
      const response = await apiClient.get('/api/rain/rain-zones', {
        params: {
          lat: mapRegion.latitude,
          lon: mapRegion.longitude,
          radius: 20000, // 20km
          resolution: 30
        }
      });
      
      if (response.data && response.data.features) {
        // Filtrer les zones avec coordonnées valides
        const validZones = response.data.features.filter(zone => {
          const coords = zone.geometry?.coordinates;
          return coords && 
                 coords.length === 2 && 
                 typeof coords[1] === 'number' && 
                 typeof coords[0] === 'number' &&
                 !isNaN(coords[1]) && 
                 !isNaN(coords[0]);
        });
        
        setRainZones(validZones);
      }
    } catch (error) {
      console.error('Erreur alternative:', error);
    }
  };
  
  // Récupérer l'historique
  const fetchRainHistory = async () => {
    try {
      const bounds = [
        mapRegion.latitude - mapRegion.latitudeDelta,
        mapRegion.longitude - mapRegion.longitudeDelta,
        mapRegion.latitude + mapRegion.latitudeDelta,
        mapRegion.longitude + mapRegion.longitudeDelta,
      ];
      
      const response = await apiClient.get('/api/geo/rain-history', {
        params: {
          bounds: bounds.join(','),
          hours: parseInt(timeRange === 'current' ? 1 : timeRange.replace('h', ''))
        }
      });
      
      if (response.data && response.data.stations) {
        setRainHistory(response.data.stations);
      }
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  };
  
  // Données de démo
  const setDemoData = () => {
    const baseLat = !isNaN(initialLat) ? initialLat : 18.533333;
    const baseLon = !isNaN(initialLon) ? initialLon : -72.333333;
    
    const demoZones = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [baseLon + 0.05, baseLat + 0.05] // [longitude, latitude]
        },
        properties: {
          stationId: 'demo1',
          name: 'Station Démo 1',
          rainfall: 1.2,
          intensity: 'light',
          measuredAt: new Date().toISOString()
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [baseLon - 0.03, baseLat - 0.02]
        },
        properties: {
          stationId: 'demo2',
          name: 'Station Démo 2',
          rainfall: 5.8,
          intensity: 'moderate',
          measuredAt: new Date().toISOString()
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [baseLon + 0.02, baseLat - 0.04]
        },
        properties: {
          stationId: 'demo3',
          name: 'Station Démo 3',
          rainfall: 0.3,
          intensity: 'very-light',
          measuredAt: new Date().toISOString()
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [baseLon - 0.06, baseLat + 0.03]
        },
        properties: {
          stationId: 'demo4',
          name: 'Station Démo 4',
          rainfall: 10.2,
          intensity: 'heavy',
          measuredAt: new Date().toISOString()
        }
      }
    ];
    
    setRainZones(demoZones);
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
        
        setMapRegion(newRegion);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    }
  };
  
  // Initialisation
  useEffect(() => {
    fetchRainZones();
    
    // Mettre à jour toutes les 5 minutes
    const interval = setInterval(fetchRainZones, 300000);
    
    return () => clearInterval(interval);
  }, [mapRegion]);
  
  // Mettre à jour l'historique quand le timeRange change
  useEffect(() => {
    if (timeRange !== 'current') {
      fetchRainHistory();
    }
  }, [timeRange]);
  
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
  const renderLegend = () => (
    <View style={styles.legendContainer}>
      <TouchableOpacity 
        style={styles.legendHeader}
        onPress={() => setShowLegend(!showLegend)}
      >
        <Text style={styles.legendTitle}>Légende des intensités de pluie</Text>
        <Text style={styles.legendToggle}>{showLegend ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {showLegend && (
        <View style={styles.legendContent}>
          {Object.entries(rainIntensities).map(([key, data]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: data.color }]} />
              <Text style={styles.legendLabel}>{data.emoji} {data.label}</Text>
            </View>
          ))}
          
          <View style={styles.legendStats}>
            <Text style={styles.legendStatsText}>
              {rainZones.length} zone(s) pluvieuse(s) détectée(s)
            </Text>
            <Text style={styles.legendStatsText}>
              Dernière mise à jour: {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
  
  // Rendu des contrôles de temps
  const renderTimeControls = () => (
    <View style={styles.timeControls}>
      <Text style={styles.timeLabel}>Période:</Text>
      {['current', '1h', '3h', '6h'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.timeButton,
            timeRange === period && styles.timeButtonActive
          ]}
          onPress={() => setTimeRange(period)}
        >
          <Text style={[
            styles.timeButtonText,
            timeRange === period && styles.timeButtonTextActive
          ]}>
            {period === 'current' ? 'Actuel' : period}
          </Text>
        </TouchableOpacity>
      ))}
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
        onRegionChangeComplete={setMapRegion}
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
          onPress={zoomToCurrentLocation}
        >
          <Text style={styles.controlButtonText}>📍</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => {
            setMapRegion({
              ...mapRegion,
              latitudeDelta: Math.max(0.001, mapRegion.latitudeDelta * 0.5),
              longitudeDelta: Math.max(0.001, mapRegion.longitudeDelta * 0.5),
            });
          }}
        >
          <Text style={styles.controlButtonText}>+</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => {
            setMapRegion({
              ...mapRegion,
              latitudeDelta: Math.min(20, mapRegion.latitudeDelta * 2),
              longitudeDelta: Math.min(20, mapRegion.longitudeDelta * 2),
            });
          }}
        >
          <Text style={styles.controlButtonText}>-</Text>
        </TouchableOpacity>
      </View>
      
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
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    maxHeight: 300,
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
  
  timeControls: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginRight: 15,
  },
  
  timeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    marginHorizontal: 5,
  },
  
  timeButtonActive: {
    backgroundColor: '#2196F3',
  },
  
  timeButtonText: {
    fontSize: 12,
    fontWeight: '500',
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