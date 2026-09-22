import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

import ScalePressable from './ScalePressable';
import * as Haptics from 'expo-haptics';

interface Props {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  color?: 'primary' | 'success';
}

export default function SubmitButton({ title, icon, onPress, disabled, color = 'primary' }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Nền lúc disabled là surfaceElevated, rất nhạt ở chế độ sáng, nên chữ trắng không đọc được.
  const contentColor = disabled
    ? colors.onSurfaceElevated
    : color === 'success' ? colors.onSuccess : colors.onPrimary;

  return (
    <View style={styles.footer}>
      <ScalePressable
        style={[
          styles.submitBtn,
          color === 'success' && styles.submitBtnSuccess,
          disabled && styles.submitBtnDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        haptic={Haptics.ImpactFeedbackStyle.Medium}
      >
        {icon && <Ionicons name={icon} size={22} color={contentColor} />}
        <Text style={[styles.submitText, { color: contentColor }]}>{title}</Text>
      </ScalePressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
    },
    submitBtnSuccess: {
      backgroundColor: colors.success,
    },
    submitBtnDisabled: {
      backgroundColor: colors.surfaceElevated,
      opacity: 0.6,
    },
    submitText: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
    },
  });
