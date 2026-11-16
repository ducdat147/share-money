import React, { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';

export default function Card({ style, ...props }: ViewProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View {...props} style={[styles.card, style]} />;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
    },
  });
