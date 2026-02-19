import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PressureGauge from './PressureGauge'; // Importez votre composant précédent

const PressureCard = ({ 
  pressure = 1013.5,
  minPressure = 950,
  maxPressure = 1050,
  unit = 'hPa',
  title = 'Pression Atmosphérique',
  location = 'Delmas',
  trend = 'stable', // 'rising', 'falling', 'stable'
  lastUpdated = 'Il y a 5 min',
  onPress = () => {},
  style = {}
}) => {
  // Valeurs par défaut
  const currentPressure = typeof pressure === 'number' ? pressure : 1013.5;
  
  // Déterminer le statut basé sur la pression
  const getPressureStatus = () => {
    const normalRange = { min: 1010, max: 1020 };
    if (currentPressure < normalRange.min) return 'Basse';
    if (currentPressure > normalRange.max) return 'Élevée';
    return 'Normale';
  };
  
  // Icône de tendance
  const getTrendIcon = () => {
    switch(trend) {
      case 'rising': return '↗';
      case 'falling': return '↘';
      default: return '→';
    }
  };
  
  // Couleur du statut
  const getStatusColor = () => {
    const status = getPressureStatus();
    switch(status) {
      case 'Basse': return '#FF6B6B';
      case 'Élevée': return '#FFA726';
      default: return '#4CAF50';
    }
  };
  
  // Description de la pression
  const getPressureDescription = () => {
    const status = getPressureStatus();
    switch(status) {
      case 'Basse': return 'Pression basse - Temps instable possible';
      case 'Élevée': return 'Pression élevée - Temps généralement stable';
      default: return 'Pression normale - Conditions standards';
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* En-tête de la carte */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>{location}</Text>
            <Text style={styles.lastUpdated}>• {lastUpdated}</Text>
          </View>
        </View>
        
        
      </View>

      {/* Badge de statut */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getPressureStatus()}
          </Text>
        </View>
      
      {/* Contenu principal */}
      <View style={styles.content}>
        {/* Jauge de pression */}
        <View style={styles.gaugeContainer}>
          <PressureGauge
            currentPressure={currentPressure}
            minPressure={minPressure}
            maxPressure={maxPressure}
            unit={unit}
            size={130}
            strokeWidth={15}
          />
        </View>
        
        {/* Informations détaillées */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valeur actuelle</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>
                {currentPressure.toFixed(1)}
              </Text>
              <Text style={styles.infoUnit}>{unit}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tendance</Text>
            <View style={styles.trendContainer}>
              <Text style={[styles.trendIcon, { color: trend === 'rising' ? '#4CAF50' : trend === 'falling' ? '#F44336' : '#9E9E9E' }]}>
                {getTrendIcon()}
              </Text>
              <Text style={styles.trendText}>
                {trend === 'rising' ? 'En hausse' : trend === 'falling' ? 'En baisse' : 'Stable'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plage normale</Text>
            <Text style={styles.normalRange}>1010 - 1020 {unit}</Text>
          </View>
        </View>
      </View>
      
      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>
          {getPressureDescription()}
        </Text>
      </View>
      
      {/* Légende et statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.statText}>Basse pression</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statText}>Normale</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#FFA726' }]} />
          <Text style={styles.statText}>Élevée</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 70,
    shadowColor: '#000',
   
    shadowOffset: {
      width: 0,
      height: 2,

    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#95A5A6',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
   
    
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  gaugeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  infoValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
  },
  infoUnit: {
    fontSize: 16,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 18,
    marginRight: 6,
    fontWeight: 'bold',
  },
  trendText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  normalRange: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  descriptionContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingTop: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    color: '#6C757D',
  },
});

export default PressureCard;