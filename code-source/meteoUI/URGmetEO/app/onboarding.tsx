import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");
export const ONBOARDING_KEY = "onboarding_complete";

// ─── Étape 0 : Bienvenue ──────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={step.container}>
      <View style={step.top}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={step.logo}
        />
        <Text style={step.appName}>URGmetEO</Text>
        <Text style={step.version}>v1.0.0</Text>
      </View>

      <View style={step.middle}>
        <Text style={step.welcomeTitle}>{t("onboarding.welcome")}</Text>
        <Text style={step.welcomeDesc}>{t("onboarding.welcomeDesc")}</Text>

        <View style={step.featureList}>
          {[
            { icon: "🌡️", key: "onboarding.featTemp" },
            { icon: "🌧️", key: "onboarding.featRain" },
            { icon: "📅", key: "onboarding.featForecast" },
            { icon: "🔔", key: "onboarding.featNotif" },
          ].map((f, i) => (
            <View key={i} style={step.featureRow}>
              <Text style={step.featureIcon}>{f.icon}</Text>
              <Text style={step.featureText}>{t(f.key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={step.nextBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={step.nextBtnText}>{t("onboarding.next")}</Text>
        <Ionicons name="arrow-forward" size={18} color="#0A2540" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Étape 1 : Accord de licence ─────────────────────────────────────────────

function LicenceStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const sections = [1, 2, 3, 4, 5, 6, 7];

  return (
    <View style={step.container}>
      <View style={step.licenceHeader}>
        <Ionicons name="document-text-outline" size={28} color="#4facfe" />
        <Text style={step.licenceTitle}>{t("onboarding.licenceTitle")}</Text>
        <Text style={step.licenceSub}>{t("onboarding.licenceSub")}</Text>
      </View>

      <ScrollView
        style={step.licenceScroll}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={step.licenceDate}>{t("license.lastUpdate")}</Text>
        {sections.map(num => (
          <View key={num} style={step.licenceSection}>
            <Text style={step.licenceSectionTitle}>
              {t(`license.section${num}Title`)}
            </Text>
            <Text style={step.licenceSectionContent}>
              {t(`license.section${num}Content`)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={step.nextBtn} onPress={onNext} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#0A2540" style={{ marginRight: 8 }} />
        <Text style={step.nextBtnText}>{t("onboarding.accept")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Étape 2 : Localisation ───────────────────────────────────────────────────

function LocationStep({
  onRequest,
  onSkip,
}: {
  onRequest: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={step.container}>
      <View style={step.top}>
        <View style={step.locationIconWrap}>
          <Ionicons name="location" size={48} color="#4facfe" />
        </View>
        <Text style={step.welcomeTitle}>{t("onboarding.locationTitle")}</Text>
        <Text style={step.welcomeDesc}>{t("onboarding.locationDesc1")}</Text>
        <Text style={step.welcomeDesc}>{t("onboarding.locationDesc2")}</Text>
      </View>

      <View style={step.locationBtns}>
        <TouchableOpacity style={step.nextBtn} onPress={onRequest} activeOpacity={0.85}>
          <Ionicons name="location-outline" size={18} color="#0A2540" style={{ marginRight: 8 }} />
          <Text style={step.nextBtnText}>{t("onboarding.allowLocation")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={step.skipBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={step.skipBtnText}>{t("onboarding.skipLocation")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  // t is used by child step components via their own useTranslation calls
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const TOTAL_STEPS = 3;

  const goToStep = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/home");
  };

  const requestPermission = async () => {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

    if (status === "granted") {
      await finishOnboarding();
      return;
    }

    if (!canAskAgain) {
      Alert.alert(
        t("onboarding.permRequired"),
        t("onboarding.permDisabled"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("notif.openSettings"), onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await Location.requestForegroundPermissionsAsync();
    if (result.status === "granted") {
      await finishOnboarding();
    }
  };

  return (
    <View style={styles.container}>
      {/* Contenu de l'étape courante */}
      <Animated.View style={[styles.stepWrapper, { opacity: fadeAnim }]}>
        {currentStep === 0 && <WelcomeStep onNext={() => goToStep(1)} />}
        {currentStep === 1 && <LicenceStep onNext={() => goToStep(2)} />}
        {currentStep === 2 && (
          <LocationStep onRequest={requestPermission} onSkip={finishOnboarding} />
        )}
      </Animated.View>

      {/* Indicateurs d'étapes */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentStep && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Styles globaux ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A2540",
  },
  stepWrapper: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 36,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#4facfe",
  },
});

// ─── Styles des étapes ────────────────────────────────────────────────────────

const step = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 12,
  },

  // ── Bienvenue ──
  top: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: "contain",
    marginBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 2,
  },
  version: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
    letterSpacing: 1,
  },
  middle: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 14,
  },
  welcomeDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  featureList: {
    marginTop: 16,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  featureIcon: {
    fontSize: 22,
    width: 30,
    textAlign: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },

  // ── Licence ──
  licenceHeader: {
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  licenceTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  licenceSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 18,
  },
  licenceScroll: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },
  licenceDate: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 12,
    textAlign: "center",
  },
  licenceSection: {
    marginBottom: 16,
  },
  licenceSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4facfe",
    marginBottom: 4,
  },
  licenceSectionContent: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },

  // ── Localisation ──
  locationIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(79,172,254,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(79,172,254,0.3)",
  },
  locationBtns: {
    gap: 12,
    marginTop: "auto",
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  skipBtnText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
  },

  // ── Bouton commun ──
  nextBtn: {
    flexDirection: "row",
    backgroundColor: "#4facfe",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    color: "#0A2540",
    fontSize: 16,
    fontWeight: "700",
  },
});
