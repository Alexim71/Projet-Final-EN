import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./locales"; // ← ton fichier unique

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: translations.fr },
      en: { translation: translations.en },
    },
    lng: "fr", // langue par défaut
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;