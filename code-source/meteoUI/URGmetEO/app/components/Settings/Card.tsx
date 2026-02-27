import React from "react";
import { View } from "react-native";

export default function Card({ children, darkMode = false }: any) {
  return (
    <View
      style={{
        backgroundColor: darkMode ? "#222" : "#fff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}