import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

type CardProps = {
  children: ReactNode;
  darkMode?: boolean;
};

export default function Card({ children, darkMode = false }: CardProps) {
  return (
    <View style={[styles.card, { backgroundColor: darkMode ? "#1c1c1e" : "#ffffff" }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
