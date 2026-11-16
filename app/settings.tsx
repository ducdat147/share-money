import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import CustomHeader from '@/components/CustomHeader';
import { useDialog } from '@/components/DialogProvider';
import { AppText, Card, ListRow } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, ThemeMode, Spacing } from '@/constants/theme';

const CHECK = '✓';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode } = useAppTheme();
  const { showDialog } = useDialog();
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

  const languageOptions = [
    { lang: 'vi', labelKey: 'settings.language_vi' },
    { lang: 'fr', labelKey: 'settings.language_fr' },
    { lang: 'en', labelKey: 'settings.language_en' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title={t('settings.title')} />
      <View style={styles.content}>
        <AppText variant="label" weight="semibold" color={colors.textMuted} style={styles.sectionTitle}>
          {t('settings.appearance')}
        </AppText>
        <Card style={styles.group}>
          {themeOptions.map((opt, i) => (
            <View key={opt.mode} style={i > 0 && styles.divided}>
              <ListRow
                title={t(opt.labelKey)}
                left={<Ionicons name={opt.icon} size={20} color={colors.textSecondary} />}
                amount={themeMode === opt.mode ? CHECK : undefined}
                amountColor={colors.primary}
                onPress={() => setThemeMode(opt.mode)}
              />
            </View>
          ))}
        </Card>

        <AppText variant="label" weight="semibold" color={colors.textMuted} style={styles.sectionTitle}>
          {t('settings.language')}
        </AppText>
        <Card style={styles.group}>
          {languageOptions.map((opt, i) => (
            <View key={opt.lang} style={i > 0 && styles.divided}>
              <ListRow
                title={t(opt.labelKey)}
                amount={currentLang === opt.lang ? CHECK : undefined}
                amountColor={colors.primary}
                onPress={() => changeLanguage(opt.lang)}
              />
            </View>
          ))}
        </Card>

        <Card style={[styles.group, styles.aboutGroup]}>
          <ListRow
            title={t('common.about')}
            left={<Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />}
            onPress={() => showDialog('Share Money', t('home.about_desc'))}
          />
        </Card>
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
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    group: {
      padding: 0,
      overflow: 'hidden',
    },
    aboutGroup: {
      marginTop: Spacing.xl,
    },
    divided: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
