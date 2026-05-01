import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import styles from "@/app/App.styles";
import { useRouter } from "expo-router";
import { ONBOARDING_KEY } from "./onboarding";

const { height } = Dimensions.get("window");

export default function App() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [showPermission, setShowPermission] = useState(false);

  useEffect(() => {
    checkAndRoute();
  }, []);

  // Vérifie l'onboarding et la permission, puis route en conséquence
  const checkAndRoute = async () => {
    const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);

    if (!onboardingDone) {
      // Premier lancement → onboarding après le splash
      setTimeout(() => router.replace("/onboarding"), 2000);
      return;
    }

    // Utilisateur existant : vérifier la permission GPS
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      console.log("📍 Permission déjà accordée → Redirection");
      router.replace("/home");
      return;
    }

    // Permission non accordée → afficher le panneau existant
    setTimeout(() => {
      setShowPermission(true);
      Animated.timing(slideAnim, {
        toValue: height / 2 - 120,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }, 2000);
  };

  // 📍 Demande permission
  const requestLocationPermission = async () => {
    const { status, canAskAgain } =
      await Location.getForegroundPermissionsAsync();

    // Si déjà accordée
    if (status === "granted") {
      console.log("📍 Permission déjà accordée");
      router.replace("/home");
      return;
    }

    // Si bloquée définitivement
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

    // Demande réelle
    const result =
      await Location.requestForegroundPermissionsAsync();

    if (result.status === "granted") {
      console.log("📍 Permission accordée → Redirection");
      router.replace("/home");
    } else {
      console.log("❌ Permission refusée");
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