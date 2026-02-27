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

import styles from "@/app/App.styles";
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");

export default function App() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [showPermission, setShowPermission] = useState(false);

  useEffect(() => {
    checkPermissionAndRedirect();

    // Animation du panneau après 2 secondes
    setTimeout(() => {
      setShowPermission(true);
      Animated.timing(slideAnim, {
        toValue: height / 2 - 120,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }, 2000);
  }, []);

  // 🔎 Vérifie si permission déjà accordée
  const checkPermissionAndRedirect = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === "granted") {
      console.log("📍 Permission déjà accordée → Redirection");
      router.replace("/home");
    }
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