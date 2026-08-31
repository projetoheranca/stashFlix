import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// Import translation files
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

// Define translations
const translations = {
  en,
  pt,
  es,
  fr,
  de,
  ja,
  ko,
  zh,
};

// Create i18n instance
export const i18n = new I18n(translations);

// Set default fallback to English
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Detect user's device language and apply it (e.g. 'pt-BR' -> 'pt')
const deviceLocales = getLocales();
if (deviceLocales && deviceLocales.length > 0) {
  const languageTag = deviceLocales[0].languageTag;
  const languageCode = deviceLocales[0].languageCode;
  
  if (translations[languageCode as keyof typeof translations]) {
    i18n.locale = languageCode;
  } else {
    // If we don't have the exact language, fallback to English
    i18n.locale = 'en';
  }
}

// Helper hook for functional components if needed
export const t = (key: string, options?: any) => i18n.t(key, options);
