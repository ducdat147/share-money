import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';
import ScalePressable from '@/components/ScalePressable';
import AppText from './AppText';
import type { IoniconName } from './Button';

export type FABProps = {
  label: string;
  icon?: IoniconName;
  onPress: () => void;
};

export default function FAB({ label, icon = 'add', onPress }: FABProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScalePressable
      style={[styles.fab, { bottom: Spacing.xxl + insets.bottom }]}
      onPress={onPress}
      haptic={Haptics.ImpactFeedbackStyle.Medium}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={colors.onPrimary} />
      <AppText weight="semibold" color={colors.onPrimary}>
        {label}
      </AppText>
    </ScalePressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: Spacing.xl,
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primary,
      elevation: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
  });
