import { Stack } from "expo-router";
import { SettingsProvider, useSettings } from "../context/SettingsContext";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import "./locales/i18n";

export default function RootLayout() {
  return (
    <SettingsProvider>
      <NavigationStackWrapper />
    </SettingsProvider>
  );
}

function NavigationStackWrapper() {
  const { darkMode } = useSettings(); // ok ici car enfant de SettingsProvider
  return (
    <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="App" />
        <Stack.Screen name="home" />
        <Stack.Screen name="login" />
        <Stack.Screen name="PressureCard" />
        <Stack.Screen name="cardDetail" />
        <Stack.Screen name="rainMap" />
      </Stack>
    </ThemeProvider>
  );
}