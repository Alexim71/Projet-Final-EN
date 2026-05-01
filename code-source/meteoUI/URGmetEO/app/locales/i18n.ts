import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations } from "./locales";

const SETTINGS_KEY = "app_settings";

const getStoredLanguage = async (): Promise<string> => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.language) return parsed.language;
    }
  } catch (_) {}
  return "fr";
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: translations.fr },
      en: { translation: translations.en },
      ht: { translation: translations.ht },
    },
    lng: "fr",
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
  });

// Apply stored language after init (non-blocking)
getStoredLanguage().then(lang => {
  if (lang !== i18n.language) i18n.changeLanguage(lang);
});

export default i18n;
