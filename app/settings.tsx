import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import CustomHeader from '@/components/CustomHeader';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, ThemeMode, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode } = useAppTheme();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
  };

  const themeOptions: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
    { mode: 'system', icon: 'phone-portrait-outline', labelKey: 'settings.theme_system' },
    { mode: 'light', icon: 'sunny', labelKey: 'settings.theme_light' },
    { mode: 'dark', icon: 'moon', labelKey: 'settings.theme_dark' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={t('settings.title')} />
      <View style={styles.content}>
        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        {themeOptions.map((opt) => (
          <TouchableOpacity
            key={opt.mode}
            style={styles.optionRow}
            onPress={() => setThemeMode(opt.mode)}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <Ionicons name={opt.icon} size={20} color={colors.textSecondary} />
              <Text style={styles.optionText}>{t(opt.labelKey)}</Text>
            </View>
            {themeMode === opt.mode && (
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Language Section */}
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => changeLanguage('vi')}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Text style={styles.optionText}>{t('settings.language_vi')}</Text>
          </View>
          {currentLang === 'vi' && (
            <Ionicons name="checkmark" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => changeLanguage('en')}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Text style={styles.optionText}>{t('settings.language_en')}</Text>
          </View>
          {currentLang === 'en' && (
            <Ionicons name="checkmark" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
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
      padding: Spacing.lg,
    },
    sectionTitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.md,
      marginTop: Spacing.md,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    optionText: {
      fontSize: FontSize.md,
      color: colors.text,
      fontWeight: FontWeight.medium,
    },
  });
