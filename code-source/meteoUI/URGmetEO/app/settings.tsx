import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView } from "react-native";
import { Stack } from "expo-router";

export default function SettingsScreen() {
  const [useCelsius, setUseCelsius] = useState(true);
  const [windUnit, setWindUnit] = useState<"kmh" | "ms">("kmh");
  const [pressureUnit, setPressureUnit] = useState<"hpa" | "mmhg">("hpa");
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  return (
    <ScrollView className="flex-1 bg-white px-4">
      <Stack.Screen options={{ title: "Paramètres" }} />

      {/* 🌡️ Température */}
      <Section title="Unité de température">
        <Option label="Celsius (°C)">
          <Switch value={useCelsius} onValueChange={setUseCelsius} />
        </Option>
        <Option label="Fahrenheit (°F)">
          <Switch value={!useCelsius} onValueChange={() => setUseCelsius(false)} />
        </Option>
      </Section>

      {/* 🌬️ Vent */}
      <Section title="Unité de vitesse du vent">
        <RadioOption
          label="km/h"
          selected={windUnit === "kmh"}
          onPress={() => setWindUnit("kmh")}
        />
        <RadioOption
          label="m/s"
          selected={windUnit === "ms"}
          onPress={() => setWindUnit("ms")}
        />
      </Section>

      {/* 🌪️ Pression */}
      <Section title="Unité de pression">
        <RadioOption
          label="hPa"
          selected={pressureUnit === "hpa"}
          onPress={() => setPressureUnit("hpa")}
        />
        <RadioOption
          label="mmHg"
          selected={pressureUnit === "mmhg"}
          onPress={() => setPressureUnit("mmhg")}
        />
      </Section>

      {/* 🎨 Thème */}
      <Section title="Thème">
        <Option label="Mode sombre">
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </Option>
      </Section>

      {/* 🌍 Langue */}
      <Section title="Langue">
        <RadioOption
          label="Français"
          selected={language === "fr"}
          onPress={() => setLanguage("fr")}
        />
        <RadioOption
          label="English"
          selected={language === "en"}
          onPress={() => setLanguage("en")}
        />
      </Section>

      {/* 📍 Autres */}
      <Section title="Autres options">
        <LinkOption label="Choisir emplacement" />
        <LinkOption label="Contacter les développeurs" />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: any) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold mb-2">{title}</Text>
      <View className="bg-gray-100 rounded-xl p-3">{children}</View>
    </View>
  );
}

function Option({ label, children }: any) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className="text-base">{label}</Text>
      {children}
    </View>
  );
}

function RadioOption({ label, selected, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row justify-between items-center py-2"
    >
      <Text className="text-base">{label}</Text>
      <Text className="text-xl">{selected ? "●" : "○"}</Text>
    </TouchableOpacity>
  );
}

function LinkOption({ label }: any) {
  return (
    <TouchableOpacity className="py-3">
      <Text className="text-base text-blue-600">{label}</Text>
    </TouchableOpacity>
  );
}
