import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import PressureCard from './PressureCard';



// Fonction utilitaire pour formater la date
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return "Date inconnue";
  }
};


export default function CardDetail() {
  const { cardId, cardTitle, lat, lon } = useLocalSearchParams();
  const router = useRouter();

  // Données détaillées pour chaque carte
  const cardDetails = {
    1: {
      title: "💨 Vent",
      description: "Informations détaillées sur le vent",
      details: [
        { label: "Vitesse actuelle", value: "12 km/h" },
        { label: "Direction", value: "Nord-Est (NE)" },
        { label: "Rafales maximales", value: "18 km/h" },
        { label: "Niveau", value: "Modéré" },
        { label: "Tendance", value: "Stable" }
      ]
    },
    2: {
      title: "💧 Humidité",
      description: "Informations détaillées sur l'humidité",
      details: [
        { label: "Humidité relative", value: "65%" },
        { label: "Point de rosée", value: "20°C" },
        { label: "Confort", value: "Confortable" },
        { label: "Tendance", value: "En baisse" }
      ]
    },
    3: {
      title: "📊 Pression",
      description: "Informations détaillées sur la pression",
     component:  <PressureCard
            pressure={1013} //pressure={pressureData.current}
            title="Pression Atmosphérique"
           location={'Inconnu'} //location={weatherData?.location || 'Inconnu'}
           trend={'Stable'} //trend={pressureData.trend}
          lastUpdated={formatDate('2024-01-15T10:30:00Z')}  //lastUpdated={formatDate(pressureData.lastUpdated)}
           unit={'hPa'} //unit={pressureData.unit}
          />,
      details: [
        { label: "Pression actuelle", value: "1013 hPa" },
        { label: "Tendance", value: "Stable" },
        { label: "Altitude", value: "150 m" },
        { label: "Niveau de la mer", value: "1015 hPa" },
        
      ]
    },
    4: {
      title: "☀️ UV",
      description: "Informations détaillées sur les UV",
      details: [
        { label: "Indice UV", value: "6 (Élevé)" },
        { label: "Protection nécessaire", value: "Crème solaire" },
        { label: "Heure max", value: "14h00" },
        { label: "Recommandation", value: "Éviter exposition" }
      ]
    },
    5: {
      title: "🧲 Géomagnétique",
      description: "Informations détaillées sur l'activité géomagnétique",
      details: [
        { label: "Niveau", value: "Calme" },
        { label: "Indice Kp", value: "2" },
        { label: "Aurores", value: "Peu probables" },
        { label: "Perturbation", value: "Faible" }
      ]
    },
    6: {
      title: "🌙 Lune",
      description: "Informations détaillées sur la lune",
      details: [
        { label: "Phase", value: "Premier quartier" },
        { label: "Illumination", value: "56%" },
        { label: "Lever", value: "14h30" },
        { label: "Coucher", value: "02h15" }
      ]
    },
    7: {
      title: "🌸 Pollen",
      description: "Informations détaillées sur le pollen",
      details: [
        { label: "Niveau", value: "Moyen" },
        { label: "Type dominant", value: "Graminées" },
        { label: "Risque allergies", value: "Modéré" },
        { label: "Recommandation", value: "Précaution" }
      ]
    },
    8: {
      title: "🌊 Eau",
      description: "Informations détaillées sur la température de l'eau",
      details: [
        { label: "Température", value: "22°C" },
        { label: "Confort", value: "Agréable" },
        { label: "Tendance", value: "En hausse" },
        { label: "Baignade", value: "Confortable" }
      ]
    }
  };

  const detailData = cardDetails[cardId] || cardDetails[1];

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Fond similaire à la page principale */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="grad1" cx="85%" cy="15%" rx="100%" ry="40%" fx="100%" fy="85%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="25%" stopColor="#e8f4ff" stopOpacity="0.18" />
            <Stop offset="50%" stopColor="#c8e4ff" stopOpacity="0.12" />
            <Stop offset="75%" stopColor="#9fd2ff" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="grad2" cx="15%" cy="85%" rx="100%" ry="45%" fx="15%" fy="85%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.50" />
            <Stop offset="30%" stopColor="#e3f2ff" stopOpacity="0.14" />
            <Stop offset="60%" stopColor="#b8dcff" stopOpacity="0.08" />
            <Stop offset="90%" stopColor="#8ac8ff" stopOpacity="0.02" />
            <Stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="grad3" cx="35%" cy="50%" rx="100%" ry="40%" fx="35%" fy="50%">
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

      {/* En-tête avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{detailData.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Contenu détaillé */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardDetailContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{detailData.title}</Text>
            <Text style={styles.cardDescription}>{detailData.description}</Text>
          </View>

           {/* Affichage du composant spécifique si disponible */}
          {detailData.component && (
            <View style={styles.componentContainer}>
              {detailData.component}
            </View>
          )}

          {  !detailData.component && detailData.details && detailData.details.length > 0 &&
            (<View style={styles.detailsContainer}>
            {detailData.details.map((item, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
          )
            }


            

          {/* Pour la pression, afficher des informations supplémentaires */}
          {cardId === "3" &&  (<View style={styles.detailsContainer}>
            {detailData.details.map((item, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
          )
            }

          

          {/* Informations de localisation */}
          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>📍 Localisation</Text>
            <Text style={styles.locationText}>
              {Number(lat).toFixed(2)}, {Number(lon).toFixed(2)}
            </Text>
          </View>

          {/* Bouton retour en bas */}
          <TouchableOpacity style={styles.bottomBackButton} onPress={handleGoBack}>
            <Text style={styles.bottomBackButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4facfe",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  backButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSpacer: {
    width: 80,
  },
  content: {
    flex: 1,
  },
  cardDetailContainer: {
    padding: 20,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 30,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 22,
  },
  detailsContainer: {
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  detailLabel: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  locationContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  locationText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  bottomBackButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    marginBottom: 30,
  },
  bottomBackButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  componentContainer: {
    marginBottom: 25,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});