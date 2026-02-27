import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  darkMode?: boolean;
};

export default function SegmentedControl({ options, selected, onSelect, darkMode = false }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: darkMode ? "#333" : "#e5e5ea",
        borderRadius: 20,
        padding: 4,
        marginTop: 10,
      }}
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={{
              flex: 1,
              backgroundColor: isSelected
                ? darkMode
                  ? "#fff"
                  : "#000"
                : "transparent",
              paddingVertical: 8,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: isSelected
                  ? darkMode
                    ? "#000"
                    : "#fff"
                  : darkMode
                  ? "#fff"
                  : "#000",
                fontWeight: "600",
              }}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}