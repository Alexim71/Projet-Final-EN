import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";


export default function AboutScreen() {
  const { t } = useTranslation();
  const [adsDisabled, setAdsDisabled] = useState(false);

 const router = useRouter();

const openLicense = () => {
  router.push("/licence");
};

const openPrivacy = () => {
  router.push("/privacy");
};

  return (
    <>
      <Stack.Screen options={{ title: t("about.title") }} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/logo.png")} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>URGmetEO</Text>
          <Text style={styles.version}>
            {t("about.version")} {Constants.expoConfig?.version ?? "1.0"}
          </Text>
        </View>

        {/* Section Links */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={openLicense}>
            <Text style={styles.label}>{t("about.license")}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={openPrivacy}>
            <Text style={styles.label}>{t("about.privacy")}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.label}>{t("about.disableAds")}</Text>
            <Switch
              value={adsDisabled}
              onValueChange={setAdsDisabled}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
  flexGrow: 1,
  justifyContent: "flex-start",
  paddingTop: 250,
  backgroundColor: "#fff",
},
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#00BFA5",
  },
  version: {
    color: "#999",
    marginTop: 5,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    fontSize: 16,
  },
});