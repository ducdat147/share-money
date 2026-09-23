import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, FontSize, FontWeight } from '@/constants/theme';

import ScalePressable from './ScalePressable';

interface Props {
  title: string;
  rightAction?: React.ReactNode;
  /** Có thì tiêu đề bấm được và hiện bút chì, ví dụ để đổi tên. */
  onTitlePress?: () => void;
}

export default function CustomHeader({ title, rightAction, onTitlePress }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={createStyles(colors).header}>
      <ScalePressable onPress={() => router.back()} style={createStyles(colors).backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </ScalePressable>
      {onTitlePress ? (
        <TouchableOpacity
          style={createStyles(colors).titleButton}
          onPress={onTitlePress}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[createStyles(colors).headerTitle, createStyles(colors).headerTitleShrink]} numberOfLines={1}>
            {title}
          </Text>
          <Ionicons name="pencil" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <Text style={createStyles(colors).headerTitle} numberOfLines={1}>
          {title}
        </Text>
      )}
      {rightAction ? (
        <View style={createStyles(colors).rightBtnContainer}>{rightAction}</View>
      ) : (
        <View style={createStyles(colors).backBtn} />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    titleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
    },
    headerTitleShrink: {
      flex: 0,
      flexShrink: 1,
    },
    backBtn: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    rightBtnContainer: {
      minWidth: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
  });
