import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';
import ScalePressable from '@/components/ScalePressable';
import AppText from './AppText';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  haptic?: Haptics.ImpactFeedbackStyle;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  haptic,
}: ButtonProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const inactive = disabled || loading;
  const textColor = {
    primary: colors.onPrimary,
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.onDanger,
  }[variant];

  return (
    <ScalePressable
      style={[styles.base, styles[variant], inactive && styles.inactive]}
      onPress={onPress}
      disabled={inactive}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={textColor} />}
          <AppText weight="semibold" color={textColor}>
            {title}
          </AppText>
        </>
      )}
    </ScalePressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.md,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    outline: {
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ghost: {},
    danger: {
      backgroundColor: colors.danger,
    },
    inactive: {
      opacity: 0.5,
    },
  });
