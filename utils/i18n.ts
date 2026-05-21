import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import vi from '../locales/vi.json';

const ASYNC_LANGUAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

const SUPPORTED_LANGUAGES = Object.keys(resources);
const DEFAULT_LANGUAGE = 'en';

const getDeviceLanguage = () => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const languageCode = locales[0].languageCode;
    if (languageCode && SUPPORTED_LANGUAGES.includes(languageCode)) {
      return languageCode;
    }
  }
  return DEFAULT_LANGUAGE;
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const storedLanguage = await AsyncStorage.getItem(ASYNC_LANGUAGE_KEY);
      if (storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage)) {
        return callback(storedLanguage);
      }
      return callback(getDeviceLanguage());
    } catch (error) {
      console.warn('Error reading language from AsyncStorage', error);
      return callback(getDeviceLanguage());
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(ASYNC_LANGUAGE_KEY, language);
    } catch (error) {
      console.warn('Error saving language to AsyncStorage', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
