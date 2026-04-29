import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type SegmentedControlProps = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  darkMode?: boolean;
};

export default function SegmentedControl({
  options,
  selected,
  onSelect,
  darkMode = false,
}: SegmentedControlProps) {
  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#2c2c2e" : "#e9e9eb" }]}>
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.segment,
              isActive && { backgroundColor: darkMode ? "#444" : "#ffffff" },
            ]}
            onPress={() => onSelect(option)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.label,
                { color: darkMode ? "#fff" : "#000" },
                isActive && styles.labelActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 2,
    marginTop: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  labelActive: {
    fontWeight: "700",
  },
});
