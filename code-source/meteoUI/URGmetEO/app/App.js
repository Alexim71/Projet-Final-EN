import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image, ScrollView, Text,
  TouchableOpacity,
  View
} from 'react-native';

import styles from '@/app/App.styles';
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { ActivityIndicator, Alert, Linking } from "react-native";

const { height } = Dimensions.get("window");

export default function App() {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [showPermission, setShowPermission] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const fadePermission = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    // Affiche le panneau après le splash
    setTimeout(() => {
      setShowPermission(true);
      Animated.timing(slideAnim, {
        toValue: height / 2 - 120,
        duration: 800,
        useNativeDriver: false, // CHANGÉ: false pour 'top'
      }).start();
    }, 2000);
  }, []);

  const requestLocationPermission = async () => {
    const { status, canAskAgain } =
      await Location.getForegroundPermissionsAsync();

    if (status === "granted") {
      console.log("📍 Permission déjà accordée");
      goToHome();
      return;
    }

    if (!canAskAgain) {
      Alert.alert(
        "Autorisation requise",
        "La localisation est désactivée. Activez-la manuellement dans les paramètres.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Ouvrir les paramètres",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    const result =
      await Location.requestForegroundPermissionsAsync();

    if (result.status === "granted") {
      console.log("📍 Permission accordée");
      goToHome();
    } else {
      console.log("❌ Permission refusée");
      Alert.alert(
        "Permission refusée",
        "La météo locale nécessite la localisation.",
        [
          {
            text: "OK",
            onPress: () => {
              // Réinitialiser l'état sans animation native pour 'top'
              Animated.timing(fadePermission, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false, // CHANGÉ: false
              }).start();
              setLoadingLocation(false);
            }
          }
        ]
      );
      return;
    }

    Animated.timing(fadePermission, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false, // CHANGÉ: false
    }).start(() => {
      setLoadingLocation(true);
    });
  };

  const goToHome = async () => {
    try {
      setLoadingLocation(true);

      // 1️⃣ Vérifier GPS
      const servicesEnabled =
        await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          "GPS désactivé",
          "Activez la localisation pour continuer.",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Paramètres",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        setLoadingLocation(false);
        return;
      }

      let location = null;

      try {
        // 2️⃣ Tentative position actuelle
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
      } catch (e) {
        console.log("⚠️ getCurrentPositionAsync échoué:", e);
      }

      // 3️⃣ Fallback Android Emulator
      if (!location) {
        location = await Location.getLastKnownPositionAsync();

        if (location) {
          console.log("📍 Last known location utilisée");
          console.log("📍 Coordonnées last known :", location.coords);
        } else {
          console.log("❌ Aucune last known location disponible");
        }
      }

      // 4️⃣ Vérification finale AVANT navigation
      if (!location || !location.coords) {
        Alert.alert(
          "Position indisponible",
          "Impossible d'obtenir la position GPS.",
          [
            {
              text: "Réessayer",
              onPress: () => {
                setLoadingLocation(false);
                setTimeout(() => goToHome(), 500);
              }
            },
            {
              text: "Utiliser une ville par défaut",
              onPress: () => {
                // Naviguer avec des coordonnées par défaut (ex: Paris)
                router.replace({
                  pathname: "/home",
                  params: {
                    lat: 	18.533333,
                    lon: -72.333333,
                    defaultCity: "Port-au-Prince"
                  },
                });
              }
            }
          ]
        );
        return;
      }

      // 5️⃣ Navigation avec position réelle
      router.replace({
        pathname: "/home",
        params: {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        },
      });

    } catch (error) {
      console.error("❌ Erreur localisation :", error);
      Alert.alert(
        "Erreur GPS",
        "La localisation n'est pas disponible.",
        [
          {
            text: "OK",
            onPress: () => {
              setLoadingLocation(false);
              // Réafficher le panneau de permission
              Animated.timing(fadePermission, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false, // CHANGÉ: false
              }).start();
            }
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* SPLASH */}
      <Text style={styles.title}>URGmetEO</Text>

    

    {showPermission && !loadingLocation &&( <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
      />)}
      
{/* BOTTOM SHEET PERMISSION PANEL */}
{showPermission && !loadingLocation && (
  <Animated.View
    style={[
      styles.bottomSheetContainer,
      {
        maxHeight: height * 0.80, // 👈 limite la hauteur
        transform: [{ translateY: slideAnim }],
        opacity: fadePermission,
      },
    ]}
  >
    {/* HEADER FIXE */}
<View style={styles.bottomSheetHeader}>
  <View style={styles.dragHandle} />
  
  {/* Conteneur pour les boutons */}
  <View style={styles.buttonContainer}>
    <TouchableOpacity
      style={styles.cancelButton}
      onPress={() => {
        router.replace({
                pathname: "/home",
                params: {
                  lat: 18.533333,
                  lon: -72.333333,
                  defaultCity: "Port-au-Prince"
                },
              });
      }}
      activeOpacity={0.8}
    >
      <Text style={styles.cancelButtonText}>Plus tard</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.allowButton}
      onPress={requestLocationPermission}
      activeOpacity={0.8}
    >
      <Text style={styles.allowButtonText}>Autoriser</Text>
    </TouchableOpacity>
  </View>
</View>
    {/* CONTENU SCROLLABLE */}
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >

       
      <Text style={styles.bottomSheetTitle}>
        Restez informé en temps réel
      </Text>

      <Text style={styles.bottomSheetSubtitle}>
        Pour vous fournir des prévisions météo précises pour votre position
        actuelle, l'application a besoin d'accéder à votre emplacement.
      </Text>

      <View style={styles.featuresContainer}>
        {[
          { icon: "⏰", text: "Prévisions locales heure par heure" },
          { icon: "⚠️", text: "Alertes météo en temps réel" },
          { icon: "✔️", text: "Données fiables basées sur votre position" },
            { icon: "🌡️", text: "Températures précises" },
            { icon: "☔", text: "Précipitations détaillées" },
            { icon: "💨", text: "Conditions de vent" },
            { icon: "☀️", text: "Lever et coucher du soleil" },
            { icon: "🔔", text: "Notifications personnalisées" },
          
          
           
        ].map((item, index) => (
          <View style={styles.featureItem} key={index}>
            <View style={styles.featureIcon}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
            <Text style={styles.featureTitle}>{item.text}</Text>
          </View>
        ))}
      </View>

     

      
    </ScrollView>
  </Animated.View>
)}
      {loadingLocation && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#4da6ff" />
        </View>
      )}

      {loadingLocation && (
        <>
          <LottieView
            source={require("../assets/lottie/gps-loading.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.loadingText}>
            Récupération de votre position…
          </Text>
        </>
      )}

    </View>
  );
}