import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "app_settings";

type SettingsType = {
 useCelsius: boolean;
  windUnit: string;
  pressureUnit: string;
  darkMode: boolean;
  language: string;
  allowLocation: boolean;
  updateSettings: (values: Partial<Omit<SettingsType, "updateSettings">>) => void;
};

const SettingsContext = createContext<SettingsType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Omit<SettingsType, "updateSettings">>({
    useCelsius: true,
    windUnit: "kmh",
    pressureUnit: "hpa",
    darkMode: false,
    allowLocation: false, 
    language: "fr",
  });

  // Charger les paramètres au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setSettings(JSON.parse(saved));
      } catch (e) {
        console.log("Erreur chargement settings", e);
      }
    };
    loadSettings();
  }, []);

  // Sauvegarder automatiquement à chaque changement
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.log("Erreur sauvegarde settings", e);
      }
    };
    saveSettings();
  }, [settings]);

  const updateSettings = (values: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...values }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
};