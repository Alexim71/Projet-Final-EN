import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import styles from '@/app/App.styles';
import { useRouter } from "expo-router";


import { Alert, Linking } from "react-native";


const { height } = Dimensions.get("window");

export default function App() {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [showPermission, setShowPermission] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Affiche le panneau après le splash
    setTimeout(() => {
      setShowPermission(true);
      Animated.timing(slideAnim, {
        toValue: height / 2 - 120,
        duration: 800,
        useNativeDriver: false,
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
    //console.log("❌ Permission refusée");
    Alert.alert(
        "Permission refusée",
        "La météo locale nécessite la localisation."
      );
  }
};

const goToHome = async () => {
  try {
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
      return;
    }

    let location = null;

    await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 1000,
    distanceInterval: 1,
  },
  () => {}
);


    try {
      // 2️⃣ Tentative position actuelle
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
    } catch (e) {
      console.log("⚠️ getCurrentPositionAsync échoué");
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
    "Impossible d'obtenir la position GPS."
  );
 // isNavigating.current = false;
  return;
}


  if (!location) {
      Alert.alert(
        "Position indisponible",
        "Impossible d'obtenir la position GPS."
      );
      return;
    }

    console.log("📍 Coordonnées :", location.coords);

    // 4️⃣ Navigation
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
      "La localisation n'est pas disponible."
    );
  }
};

  return (
    <View style={styles.container}>
      {/* SPLASH */}
      <Text style={styles.title}>URGmetEO</Text>

      <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
      />

      {/* SLIDING PERMISSION PANEL */}
      {showPermission && (
        <Animated.View
          style={[
            styles.permissionBox,
            { top: slideAnim },
          ]}
        >
          <Text style={styles.permissionTitle}>
            Autoriser la localisation
          </Text>

          <Text style={styles.permissionText}>
            Nous avons besoin de votre position pour afficher la météo locale.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={requestLocationPermission}
          >
            <Text style={styles.buttonText}>Autoriser</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

