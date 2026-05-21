import { useMemo, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { DarkColors, LightColors, ThemeColors, ThemeMode } from '@/constants/theme';
import { useThemeStore } from './useThemeStore';

export function useAppTheme() {
  const { themeMode, setThemeMode } = useThemeStore();
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'light') return false;
    if (themeMode === 'dark') return true;
    return systemScheme !== 'light'; // system mode: default dark if unknown
  }, [themeMode, systemScheme]);

  const colors: ThemeColors = useMemo(
    () => (isDark ? DarkColors : LightColors),
    [isDark],
  );

  return { colors, isDark, themeMode, setThemeMode };
}
