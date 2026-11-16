import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';
import AppText from './AppText';

export type SegmentedControlProps<T extends string> = {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

export default function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            key={item.value}
            style={[styles.segment, selected && styles.selected]}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(item.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            {/* textMuted trên surfaceElevated dưới 4.5:1, nên mục chưa chọn dùng textSecondary. */}
            <AppText
              variant="label"
              weight="semibold"
              color={selected ? colors.text : colors.textSecondary}
              numberOfLines={1}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.md,
      padding: Spacing.xs,
      gap: Spacing.xs,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
    },
    selected: {
      backgroundColor: colors.surface,
    },
  });
