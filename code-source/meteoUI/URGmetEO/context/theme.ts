// context/theme.ts
import { useSettings } from "./SettingsContext";

export const useTheme = () => {
  const { darkMode } = useSettings();
  return {
    background: darkMode ? "#000" : "#f2f2f7",
    text: darkMode ? "#fff" : "#000",
    card: darkMode ? "#222" : "#fff",
    accent: "#4da6ff",
  };
};