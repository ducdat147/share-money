import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '@/constants/theme';

const ASYNC_THEME_KEY = 'user-theme';

interface ThemeStore {
  themeMode: ThemeMode;
  isLoaded: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeMode: 'system',
  isLoaded: false,

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    AsyncStorage.setItem(ASYNC_THEME_KEY, mode).catch(console.warn);
  },

  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_THEME_KEY);
      if (stored && ['system', 'light', 'dark'].includes(stored)) {
        set({ themeMode: stored as ThemeMode, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));
