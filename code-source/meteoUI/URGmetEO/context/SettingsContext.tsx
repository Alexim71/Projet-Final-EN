import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "app_settings";

export type NotificationItem = {
  enabled: boolean;
  hour:    number;
  minute:  number;
};

export type NotificationPrefs = {
  forecastToday:    NotificationItem;
  forecastTomorrow: NotificationItem;
  forecastWeekend:  NotificationItem;
  forecastWeek:     NotificationItem;
  rainNearby:       NotificationItem;
  alerts:           NotificationItem;
};

type SettingsType = {
  useCelsius:      boolean;
  windUnit:        string;
  pressureUnit:    string;
  darkMode:        boolean;
  language:        string;
  allowLocation:   boolean;
  demoMode:        boolean;
  demoStationCode: string | null;
  notifications:   NotificationPrefs;
  updateSettings: (values: Partial<Omit<SettingsType, "updateSettings">>) => void;
};

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  forecastToday:    { enabled: true,  hour: 7,  minute: 0  },
  forecastTomorrow: { enabled: true,  hour: 20, minute: 0  },
  forecastWeekend:  { enabled: true,  hour: 18, minute: 0  },
  forecastWeek:     { enabled: false, hour: 7,  minute: 0  },
  rainNearby:       { enabled: true,  hour: 8,  minute: 30 },
  alerts:           { enabled: true,  hour: 12, minute: 0  },
};

/** Migration : l'ancien format stockait de simples booléens. */
function migrateNotifications(saved: any): NotificationPrefs {
  const result = { ...DEFAULT_NOTIFICATIONS };
  for (const key of Object.keys(DEFAULT_NOTIFICATIONS) as (keyof NotificationPrefs)[]) {
    const v = saved?.[key];
    if (v == null) continue;
    if (typeof v === "boolean") {
      result[key] = { ...DEFAULT_NOTIFICATIONS[key], enabled: v };
    } else if (typeof v === "object" && "enabled" in v) {
      result[key] = { ...DEFAULT_NOTIFICATIONS[key], ...v };
    }
  }
  return result;
}

const SettingsContext = createContext<SettingsType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Omit<SettingsType, "updateSettings">>({
    useCelsius:      true,
    windUnit:        "kmh",
    pressureUnit:    "hpa",
    darkMode:        false,
    allowLocation:   false,
    language:        "fr",
    demoMode:        false,
    demoStationCode: null,
    notifications:   DEFAULT_NOTIFICATIONS,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({
            ...prev,
            ...parsed,
            notifications: migrateNotifications(parsed.notifications),
          }));
        }
      } catch (e) {
        console.log("Erreur chargement settings", e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.log("Erreur sauvegarde settings", e);
      }
    };
    save();
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
