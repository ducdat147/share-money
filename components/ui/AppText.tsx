import React, { useMemo } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontFamily, FontSize, ThemeColors } from '@/constants/theme';

export type AppTextVariant = 'hero' | 'title' | 'body' | 'label' | 'caption';
export type AppTextWeight = keyof typeof FontFamily;

export type AppTextProps = {
  variant?: AppTextVariant;
  weight?: AppTextWeight;
  color?: string;
  /** Chữ số cùng bề rộng để cột tiền thẳng hàng. */
  numeric?: boolean;
} & TextProps;

const VARIANT_SIZE: Record<AppTextVariant, number> = {
  hero: FontSize.hero,
  title: FontSize.xl,
  body: FontSize.md,
  label: FontSize.sm,
  caption: FontSize.xs,
};

export default function AppText({
  variant = 'body',
  weight = 'regular',
  color,
  numeric,
  style,
  ...props
}: AppTextProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Text
      {...props}
      style={[
        styles.base,
        // Không dùng fontWeight: Android chỉ đổi độ đậm qua file font riêng.
        { fontSize: VARIANT_SIZE[variant], fontFamily: FontFamily[weight] },
        color !== undefined && { color },
        numeric && styles.numeric,
        style,
      ]}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      color: colors.text,
    },
    numeric: {
      fontVariant: ['tabular-nums'],
    },
  });
