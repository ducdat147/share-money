import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';
import ScalePressable from '@/components/ScalePressable';
import AppText from './AppText';

export type StepperProps = {
  value: number;
  min: number;
  max?: number;
  onChange: (n: number) => void;
};

export default function Stepper({ value, min, max, onChange }: StepperProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <View style={styles.container}>
      <ScalePressable
        style={[styles.button, !canDecrease && styles.disabled]}
        onPress={() => onChange(value - 1)}
        disabled={!canDecrease}
        accessibilityRole="button"
        accessibilityLabel={t('components.decrease')}
        accessibilityState={{ disabled: !canDecrease }}
      >
        <Ionicons name="remove" size={22} color={colors.text} />
      </ScalePressable>
      <AppText variant="title" weight="semibold" numeric style={styles.value}>
        {value}
      </AppText>
      <ScalePressable
        style={[styles.button, !canIncrease && styles.disabled]}
        onPress={() => onChange(value + 1)}
        disabled={!canIncrease}
        accessibilityRole="button"
        accessibilityLabel={t('components.increase')}
        accessibilityState={{ disabled: !canIncrease }}
      >
        <Ionicons name="add" size={22} color={colors.text} />
      </ScalePressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    button: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.4,
    },
    value: {
      minWidth: 32,
      textAlign: 'center',
    },
  });
