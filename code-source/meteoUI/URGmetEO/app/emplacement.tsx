import React, { useEffect, useState } from "react";
import { 
  View, Text, Switch, TextInput, Button, StyleSheet, Alert 
} from "react-native";
import * as Location from "expo-location";
import { useSettings } from "../context/SettingsContext"; // Assure-toi que SettingsContext existe

export default function Emplacement() {
  // 🔹 Corrigé: allowLocation avec L majuscule
  const { allowLocation, updateSettings } = useSettings();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [manualLocation, setManualLocation] = useState("");

  // Fonction pour récupérer la position GPS
  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Impossible d'accéder à la localisation.");
        updateSettings({ allowLocation: false });
        return;
      }

      updateSettings({ allowLocation: true });
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    } catch (error) {
      console.error("Erreur récupération location:", error);
      Alert.alert("Erreur", "Impossible d'obtenir votre position GPS.");
    }
  };

  // Récupérer automatiquement la position si la permission est activée
  useEffect(() => {
    if (allowLocation) {
      fetchCurrentLocation();
    }
  }, [allowLocation]);

  return (
    <View style={styles.container}>
      {/* SECTION 1 — Emplacement actuel */}
      <View style={styles.section}>
        <Text style={styles.title}>Emplacement actuel</Text>

        <Switch
          value={allowLocation}
          onValueChange={(value) => {
            if (value) {
              fetchCurrentLocation();
            } else {
              updateSettings({ allowLocation: false });
              setLocation(null);
            }
          }}
        />

        {allowLocation && location ? (
          <Text style={styles.coords}>
            Latitude: {location.coords.latitude}, Longitude: {location.coords.longitude}
          </Text>
        ) : (
          <Text style={styles.coords}>Emplacement non disponible</Text>
        )}
      </View>

      {/* SECTION 2 — Sélectionner un emplacement */}
      <View style={styles.section}>
        <Text style={styles.title}>Sélectionner un emplacement</Text>
        <TextInput
          placeholder="Entrez une ville ou un lieu"
          value={manualLocation}
          onChangeText={setManualLocation}
          style={styles.input}
        />
        <Button
          title="Valider"
          onPress={() => {
            if (!manualLocation.trim()) {
              Alert.alert("Erreur", "Veuillez entrer un emplacement valide.");
              return;
            }
            Alert.alert("Emplacement sélectionné", manualLocation);
            // Ici, tu peux stocker manualLocation dans le context ou AsyncStorage
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 10,
  },
  coords: {
    marginTop: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
});