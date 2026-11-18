import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import CustomHeader from '@/components/CustomHeader';
import { AppText, BottomSheet, Card, ListRow } from '@/components/ui';
import type { IoniconName } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, ThemeMode, Spacing } from '@/constants/theme';

const CHECK = '✓';

const LANGUAGE_OPTIONS = [
  { lang: 'vi', labelKey: 'settings.language_vi' },
  { lang: 'fr', labelKey: 'settings.language_fr' },
  { lang: 'en', labelKey: 'settings.language_en' },
];

const THEME_OPTIONS: { value: ThemeMode; labelKey: string; icon: IoniconName }[] = [
  { value: 'system', labelKey: 'settings.theme_system', icon: 'phone-portrait-outline' },
  { value: 'light', labelKey: 'settings.theme_light', icon: 'sunny-outline' },
  { value: 'dark', labelKey: 'settings.theme_dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode } = useAppTheme();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    setLanguageOpen(false);
  };

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeOpen(false);
  };

  const currentLanguageKey =
    LANGUAGE_OPTIONS.find((opt) => opt.lang === currentLang)?.labelKey ?? 'settings.language_en';
  const currentThemeKey =
    THEME_OPTIONS.find((opt) => opt.value === themeMode)?.labelKey ?? 'settings.theme_system';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={t('settings.title')} />
      <View style={styles.content}>
        <AppText variant="label" weight="semibold" color={colors.textMuted} style={styles.sectionTitle}>
          {t('settings.general')}
        </AppText>
        <Card style={styles.group}>
          <ListRow
            title={t('settings.appearance')}
            left={<Ionicons name="contrast-outline" size={20} color={colors.textSecondary} />}
            amount={`${t(currentThemeKey)}  ›`}
            amountColor={colors.textSecondary}
            onPress={() => setThemeOpen(true)}
          />
          <View style={styles.divided}>
            <ListRow
              title={t('settings.language')}
              left={<Ionicons name="globe-outline" size={20} color={colors.textSecondary} />}
              amount={`${t(currentLanguageKey)}  ›`}
              amountColor={colors.textSecondary}
              onPress={() => setLanguageOpen(true)}
            />
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <AppText variant="label" color={colors.textMuted}>
          {t('settings.tagline')}
        </AppText>
        <AppText variant="label" color={colors.textMuted}>
          {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
        </AppText>
      </View>

      <BottomSheet visible={themeOpen} onRequestClose={() => setThemeOpen(false)}>
        {THEME_OPTIONS.map((opt, i) => (
          <View key={opt.value} style={i > 0 && styles.divided}>
            <ListRow
              title={t(opt.labelKey)}
              left={<Ionicons name={opt.icon} size={20} color={colors.textSecondary} />}
              amount={themeMode === opt.value ? CHECK : undefined}
              amountColor={colors.primary}
              onPress={() => changeTheme(opt.value)}
            />
          </View>
        ))}
      </BottomSheet>

      <BottomSheet visible={languageOpen} onRequestClose={() => setLanguageOpen(false)}>
        {LANGUAGE_OPTIONS.map((opt, i) => (
          <View key={opt.lang} style={i > 0 && styles.divided}>
            <ListRow
              title={t(opt.labelKey)}
              amount={currentLang === opt.lang ? CHECK : undefined}
              amountColor={colors.primary}
              onPress={() => changeLanguage(opt.lang)}
            />
          </View>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: Spacing.lg,
    },
    sectionTitle: {
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    group: {
      padding: 0,
      overflow: 'hidden',
    },
    divided: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footer: {
      alignItems: 'center',
      gap: Spacing.xs,
      paddingBottom: Spacing.lg,
    },
  });
