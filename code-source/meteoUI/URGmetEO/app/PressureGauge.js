import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

const PressureGauge = ({
  currentPressure = 1013,
  minPressure = 950,
  maxPressure = 1050,
  unit = 'hPa',
  size = 250,
  strokeWidth = 25
}) => {
  // S'assurer que toutes les valeurs sont définies et valides
  const safeCurrentPressure = currentPressure !== undefined ? currentPressure : 1013;
  const safeMinPressure = minPressure !== undefined ? minPressure : 950;
  const safeMaxPressure = maxPressure !== undefined ? maxPressure : 1050;
  
  // Validation des valeurs
  const validatedCurrentPressure = Math.max(safeMinPressure, Math.min(safeMaxPressure, safeCurrentPressure));
  
  // Calculer le pourcentage
  const calculatePercentage = () => {
    const range = safeMaxPressure - safeMinPressure;
    if (range <= 0) return 50; // Éviter la division par zéro
    
    return ((validatedCurrentPressure - safeMinPressure) / range) * 100;
  };

  // Calculer l'angle (3/4 de cercle = 270 degrés)
  const calculateAngle = () => {
    const percentage = calculatePercentage();
    return (percentage / 100) * 270;
  };

  // Convertir l'angle en radians
  const angleToRadians = (angle) => {
    return (angle * Math.PI) / 180;
  };

  // Paramètres du cercle
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = -225; // Pour un arc qui commence en bas à gauche
  const endAngle = startAngle + 270;

  // Obtenir les coordonnées d'un point sur le cercle
  const getCoordinates = (angle) => {
    const rad = angleToRadians(angle);
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // Créer le chemin pour l'arc
  const createArcPath = (start, end) => {
    const startCoords = getCoordinates(start);
    const endCoords = getCoordinates(end);
    
    const largeArcFlag = end - start <= 180 ? "0" : "1";
    
    return `M ${startCoords.x} ${startCoords.y}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endCoords.x} ${endCoords.y}`;
  };

  // Créer le chemin pour la pression actuelle
  const createCurrentPressurePath = () => {
    const currentAngle = startAngle + calculateAngle();
    return createArcPath(startAngle, currentAngle);
  };

  const percentage = calculatePercentage();

  // Couleur en fonction de la pression
  const getPressureColor = () => {
    if (percentage < 33) return '#FF6B6B';
    if (percentage < 66) return '#4ECDC4';
    return '#45B7D1';
  };

  return (
    <View style={styles.container}>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          {/* Arc de fond (plage totale) */}
          <Path
            d={createArcPath(startAngle, endAngle)}
            stroke="#E8E8E8"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Arc de la pression actuelle */}
          <Path
            d={createCurrentPressurePath()}
            stroke={getPressureColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Marqueurs */}
          <G>
            <Circle
              cx={getCoordinates(startAngle).x}
              cy={getCoordinates(startAngle).y}
              r="4"
              fill="#999"
            />
            <Circle
              cx={getCoordinates(endAngle).x}
              cy={getCoordinates(endAngle).y}
              r="4"
              fill="#999"
            />
          </G>
        </Svg>
        
        {/* Affichage central */}
        <View style={[styles.centerDisplay, { top: center - 40 }]}>
          <Text style={styles.pressureValue}>
            {validatedCurrentPressure.toFixed(1)}
          </Text>
          <Text style={styles.pressureUnit}>{unit}</Text>
          
          {/* <View style={styles.rangeContainer}>
            <Text style={styles.rangeText}>
              {safeMinPressure.toFixed(0)} - {safeMaxPressure.toFixed(0)} {unit}
            </Text>
          </View> */}
        </View>
      </View>
      
      {/* Légendes
      <View style={styles.legendsContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E8E8E8' }]} />
          <Text style={styles.legendText}>Plage totale</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getPressureColor() }]} />
          <Text style={styles.legendText}>Pression actuelle</Text>
        </View>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDisplay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressureValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  pressureUnit: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  rangeContainer: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  rangeText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
  legendsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#495057',
  },
});

export default PressureGauge;