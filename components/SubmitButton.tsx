import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
        {icon && <Ionicons name={icon} size={22} color={color === 'success' ? colors.onSuccess : colors.onPrimary} />}
        <Text style={[styles.submitText, { color: color === 'success' ? colors.onSuccess : colors.onPrimary }]}>{title}</Text>
      </ScalePressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footer: {
      padding: Spacing.lg,
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
