import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function PrivacyScreen() {
  const { t } = useTranslation();

  const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <>
      <Stack.Screen options={{ title: t("privacy.title") }} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdate}>
          {t("privacy.lastUpdate")}
        </Text>

        {sections.map((num) => (
          <View key={num} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t(`privacy.section${num}Title`)}
            </Text>
            <Text style={styles.sectionContent}>
              {t(`privacy.section${num}Content`)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  lastUpdate: {
    fontSize: 12,
    color: "#888",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
  },
});