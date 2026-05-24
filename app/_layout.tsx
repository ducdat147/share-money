import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/hooks/useThemeStore';
import { DialogProvider } from '@/components/DialogProvider';
import '@/utils/i18n';

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();
  const loadTheme = useThemeStore((s) => s.loadTheme);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <DialogProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: '700',
            },
            contentStyle: {
              backgroundColor: colors.background,
            },
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="trip/create"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="trip/[id]/index"
            options={{}}
          />
          <Stack.Screen
            name="trip/[id]/add-expense"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="trip/[id]/add-payment"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="trip/[id]/summary"
            options={{}}
          />
          <Stack.Screen
            name="settings"
            options={{}}
          />
        </Stack>
        </DialogProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
