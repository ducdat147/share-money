import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, ThemeColors } from '@/constants/theme';
import ScalePressable from '@/components/ScalePressable';
import AppText from './AppText';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  amount?: string;
  amountColor?: string;
  left?: ReactNode;
  onPress?: () => void;
  /** Làm mờ dòng, ví dụ khoản chi không có mình tham gia. */
  dimmed?: boolean;
};

export default function ListRow({
  title,
  subtitle,
  amount,
  amountColor,
  left,
  onPress,
  dimmed = false,
}: ListRowProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <>
      {left}
      <View style={styles.texts}>
        <AppText weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="label" color={colors.textSecondary} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {amount ? (
        <AppText weight="semibold" numeric color={amountColor}>
          {amount}
        </AppText>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, dimmed && styles.dimmed]}>{content}</View>;
  }

  return (
    <ScalePressable
      style={[styles.row, dimmed && styles.dimmed]}
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
    >
      {content}
    </ScalePressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: colors.surface,
    },
    texts: {
      flex: 1,
      gap: Spacing.xs,
    },
    dimmed: {
      opacity: 0.55,
    },
  });
