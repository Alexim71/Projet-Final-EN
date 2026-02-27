import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function RateScreen() {
  const [rating, setRating] = useState(0);
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const { t } = useTranslation();

  const getMessage = () => {
    if (rating === 0) return t("rate.selectStars");
    if (rating <= 2) return t("rate.improve");
    if (rating === 3) return t("rate.thanksFeedback");
    if (rating >= 4) return t("rate.thanks");
  };

  const handleSubmit = () => {
    console.log("Note envoyée :", rating);
    setVisible(false);
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t("rate.title"),
        }}
      />

      <Modal transparent animationType="slide" visible={visible}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.title}>
              {t("rate.experience")}
            </Text>

            <Text style={styles.subtitle}>{getMessage()}</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={40}
                    color={star <= rating ? "#FFC107" : "#D3D3D3"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setVisible(false);
                  router.back();
                }}
              >
                <Text style={styles.cancelText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  rating === 0 && { opacity: 0.5 },
                ]}
                disabled={rating === 0}
                onPress={handleSubmit}
              >
                <Text style={styles.submitText}>
                  {t("common.send")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 25,
  },
  buttons: {
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#ff0000",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
  },
  cancelText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
  },
});