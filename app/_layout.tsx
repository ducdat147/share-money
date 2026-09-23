import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { AppState, Keyboard, Platform } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/hooks/useThemeStore';
import { DialogProvider } from '@/components/DialogProvider';
import SwipeBack from '@/components/SwipeBack';
import '@/utils/i18n';

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();
  const loadTheme = useThemeStore((s) => s.loadTheme);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Bản build ẩn thanh từ lúc Activity khởi tạo nhờ config plugin; Expo Go thì không, nên ẩn
    // một lần ở đây. Sau đó ẩn lại mỗi khi hệ thống cho thanh hiện ra (vuốt cạnh dưới, bàn phím,
    // app quay lại foreground).
    const hide = () => NavigationBar.setVisibilityAsync('hidden');
    hide();
    const subs = [
      NavigationBar.addVisibilityListener(({ visibility }) => {
        if (visibility === 'visible') hide();
      }),
      Keyboard.addListener('keyboardDidShow', hide),
      Keyboard.addListener('keyboardDidHide', hide),
      AppState.addEventListener('change', (s) => s === 'active' && hide()),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

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
          screenLayout={({ navigation, children }) => (
            <SwipeBack enabled={navigation.canGoBack()} onBack={navigation.goBack}>
              {children}
            </SwipeBack>
          )}
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
