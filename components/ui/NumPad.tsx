import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';
import { CURRENCIES, CurrencyCode } from '@/utils/currency';
import { applyNumPadKey, NumPadKey } from '@/utils/numpad';
import ScalePressable from '@/components/ScalePressable';
import AppText from './AppText';

export type NumPadProps = {
  value: string;
  currency: CurrencyCode;
  onChange: (next: string) => void;
};

const DIGIT_ROWS: NumPadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export default function NumPad({ value, currency, onChange }: NumPadProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Tiền không có phần lẻ (VND) thì phím trái dưới gõ nhanh ba số 0.
  const rows = useMemo<NumPadKey[][]>(
    () => [...DIGIT_ROWS, [CURRENCIES[currency].decimals === 0 ? '000' : '.', '0', 'back']],
    [currency],
  );

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.join()} style={styles.row}>
          {row.map((key) => (
            <ScalePressable
              key={key}
              style={styles.key}
              onPress={() => onChange(applyNumPadKey(value, key, currency))}
              accessibilityRole="button"
              accessibilityLabel={key === 'back' ? t('components.backspace') : key}
            >
              {key === 'back' ? (
                <Ionicons name="backspace-outline" size={26} color={colors.text} />
              ) : (
                <AppText variant="title" weight="semibold" numeric>
                  {key}
                </AppText>
              )}
            </ScalePressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    grid: {
      gap: Spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    key: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceElevated,
    },
  });
