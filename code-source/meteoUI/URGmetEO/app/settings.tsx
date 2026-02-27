import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Switch,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
} from "react-native";
import { Stack } from "expo-router";
import { useSettings } from "../context/SettingsContext";
import Card from "./components/Settings/Card";
import SegmentedControl from "./components/Settings/SegmentedControl";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const [supportVisible, setSupportVisible] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [locationPopup, setLocationPopup] = useState<"current" | "manual" | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const router = useRouter();

  const {
    useCelsius,
    windUnit,
    pressureUnit,
    darkMode,
    language,
    allowLocation,
    updateSettings,
  } = useSettings();

  const { t, i18n } = useTranslation();

  const theme = {
    background: darkMode ? "#000" : "#f2f2f7",
    card: darkMode ? "#222" : "#fff",
    text: darkMode ? "#fff" : "#000",
    accent: "#007aff",
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
  };

  const sendEmail = async (subject: string) => {
    const email = "dev@urgmeteo.com";
    const body = `Bonjour,

Je vous contacte concernant : ${subject}

Détails :
- Version de l'application :
- Modèle du téléphone :
- Version du système (iOS / Android) :

Merci.
`;
    const mailUrl = `mailto:${email}?subject=${encodeURIComponent(
      `[URG METEO] ${subject}`
    )}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(mailUrl);
      if (supported) {
        await Linking.openURL(mailUrl);
      } else {
        Alert.alert("Erreur", "Aucune application email n'est disponible.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible d'ouvrir l'application email.");
    }
  };
  
  const getCurrentLocation = async () => {
  try {
    setLoadingLocation(true);

    if (!allowLocation) {
      setCurrentLocation(null);
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setCurrentLocation(null);
      return;
    }

    // ⚡ 1️⃣ Essayer la dernière position connue (rapide)
    const lastKnown = await Location.getLastKnownPositionAsync();

    if (lastKnown) {
      setCurrentLocation(lastKnown);
      return;
    }

    // ⚡ 2️⃣ Sinon récupérer une nouvelle position (plus rapide que High)
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setCurrentLocation(location);

  } catch (error) {
    console.log("Erreur localisation:", error);
    setCurrentLocation(null);
  } finally {
    setLoadingLocation(false);
  }
};


  return (
    <>
      <Stack.Screen
      options={{
          title: t("settings"),
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 15 }}>
              <TouchableOpacity onPress={() => router.push("/notifications")}>
                <Ionicons name="notifications-outline" size={22} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/rate")}>
                <Ionicons name="star-outline" size={22} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/about")}>
                <Ionicons name="information-circle-outline" size={22} />
              </TouchableOpacity>
            </View>
          ),
        }}
         />      
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        {/* 🌡 Température */}
        <Card darkMode={darkMode}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("temperature")}</Text>
          <SegmentedControl
            options={["C°", "F°"]}
            selected={useCelsius ? "C°" : "F°"}
            onSelect={(value: string) => updateSettings({ useCelsius: value === "C°" })}
            darkMode={darkMode}
          />
        </Card>

        {/* 🌬 Vent */}
        <Card darkMode={darkMode}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("windSpeed")}</Text>
          <SegmentedControl
            options={["km/h", "m/s"]}
            selected={windUnit}
            onSelect={(value: string) => updateSettings({ windUnit: value })}
            darkMode={darkMode}
          />
        </Card>

        {/* 🌪 Pression */}
        <Card darkMode={darkMode}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("pressure")}</Text>
          <SegmentedControl
            options={["hpa", "mmhg"]}
            selected={pressureUnit}
            onSelect={(value: string) => updateSettings({ pressureUnit: value })}
            darkMode={darkMode}
          />
        </Card>

        {/* 🎨 Dark Mode */}
        <Card darkMode={darkMode}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text, fontWeight: "bold" }]}>{t("darkMode")}</Text>
            <Switch value={darkMode} onValueChange={(value: boolean) => updateSettings({ darkMode: value })} />
          </View>
        </Card>

        {/* 🌍 Langue */}
        <Card darkMode={darkMode}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("language")}</Text>
          <SegmentedControl
            options={["fr", "en"]}
            selected={language}
            onSelect={changeLanguage}
            darkMode={darkMode}
          />
        </Card>

        {/* 📍 Emplacement */}
         <Card darkMode={darkMode}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("emplacement")}</Text>

          {/* Option Emplacement Actuel */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {setLocationPopup("current"); getCurrentLocation();}}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>{t("currentLocation")}</Text>
             <Text style={[styles.arrow, { color: theme.text }]}>›</Text>
          </TouchableOpacity>

          {/* Option Sélectionner un emplacement */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setLocationPopup("manual")}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>{t("selectLocation")}</Text>
             <Text style={[styles.arrow, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* 👨‍💻 Support */}
        <Card darkMode={darkMode}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("support")}</Text>
          <TouchableOpacity onPress={() => setSupportVisible(true)}>
            <Text style={[styles.label, { color: theme.accent, marginTop: 10 }]}>{t("contactDeveloper")}</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
       

      {/* Modal Support */}
      <Modal visible={supportVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t("contactDeveloper")}</Text>

            {[
              { label: t("precisionError"), subject: "Erreur de précision" },
              { label: t("appProblem"), subject: "Problème avec l'application" },
              { label: t("suggestion"), subject: "Proposition d'amélioration" },
              { label: t("otherQuestion"), subject: "Autres questions" },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalItemRow}
                activeOpacity={0.7}
                onPress={() => {
                  setSupportVisible(false);
                  sendEmail(item.subject);
                }}
              >
                <Text style={[styles.modalText, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.arrow, { color: theme.text }]}>›</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setSupportVisible(false)} style={styles.modalCancel}>
              <Text style={{ color: "#ff3b30" }}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        <Modal
        visible={locationPopup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationPopup(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            {locationPopup === "current" && (
              <>
              {loadingLocation ? (
               <Text style={{ color: theme.text, marginTop: 8 }}>
                Chargement...
               </Text>
              ) : currentLocation ? (
              <Text style={{ color: theme.text, marginTop: 8 }}>
                Latitude: {currentLocation.coords.latitude}{"\n"}
                Longitude: {currentLocation.coords.longitude}
              </Text>
            ) : (
              <Text style={{ color: theme.text, marginTop: 8 }}>
              {t("locationUnavailable")}
              </Text>
            )}
                <Button title={t("close")} onPress={() => setLocationPopup(null)} />
              </>
            )}

            {locationPopup === "manual" && (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t("selectLocation")}
                </Text>
                <TextInput
                  placeholder={t("enterLocation")}
                  value={manualLocation}
                  onChangeText={setManualLocation}
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    padding: 10,
                    borderRadius: 5,
                    color: theme.text,
                    marginBottom: 10,
                  }}
                />
                <Button
                  title={t("validate")}
                  onPress={() => {
                    if (!manualLocation.trim()) {
                      Alert.alert(t("error"), t("enterValidLocation"));
                      return;
                    }
                    Alert.alert(t("locationSelected"), manualLocation);
                    setLocationPopup(null);
                  }}
                />
                <Button title={t("close")} onPress={() => setLocationPopup(null)} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
  },

  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
},
modalContainer: {
  width: "85%",
  borderRadius: 16,
  padding: 20,
},
modalTitle: {
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 15,
  textAlign: "center",
},
modalItem: {
  paddingVertical: 12,
},
modalText: {
  fontSize: 16,
},
modalCancel: {
  marginTop: 15,
  alignItems: "center",
},
modalItemRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 14,
  borderBottomWidth: 0.5,
  borderBottomColor: "#ccc",
},
arrow: {
  fontSize: 20,
  opacity: 0.6,
},
optionText: { fontSize: 16 },

 optionRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 12,
  borderBottomWidth: 0.5,
  borderBottomColor: "#ccc",
},
 

});

