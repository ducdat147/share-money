import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, FontSize, FontWeight } from '@/constants/theme';

interface Props {
  title: string;
  rightAction?: React.ReactNode;
}

export default function CustomHeader({ title, rightAction }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={createStyles(colors).header}>
      <TouchableOpacity onPress={() => router.back()} style={createStyles(colors).backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={createStyles(colors).headerTitle} numberOfLines={1}>
        {title}
      </Text>
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
