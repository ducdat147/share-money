import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MemberSummary } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';

interface SummaryTableProps {
  summaries: MemberSummary[];
  treasurerName?: string;
  onRowPress?: (summary: MemberSummary) => void;
  currencyCode?: import('@/utils/currency').CurrencyCode;
}

const SummaryTable: React.FC<SummaryTableProps> = React.memo(
  ({ summaries, treasurerName, onRowPress, currencyCode }) => {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.nameCol]}>{t('summary.col_member')}</Text>
          <Text style={[styles.headerCell, styles.numCol]}>{t('summary.col_to_pay')}</Text>
          <Text style={[styles.headerCell, styles.numCol]}>{t('summary.col_paid')}</Text>
          <Text style={[styles.headerCell, styles.numCol]}>{t('summary.col_remaining')}</Text>
        </View>

        {/* Rows */}
        {summaries.map((summary) => {
          const isPositiveDebt = summary.debt > 0;
          const isNegativeDebt = summary.debt < 0;
          const isTreasurer = summary.debt === 0 && summary.totalShare > 0;
          const hasItems = summary.items.length > 0;

          return (
            <TouchableOpacity
              key={summary.memberId}
              style={styles.row}
              onPress={() => hasItems && onRowPress?.(summary)}
              activeOpacity={hasItems && onRowPress ? 0.6 : 1}
            >
              <View style={[styles.nameCol, styles.nameContainer]}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {summary.name}
                </Text>
                {isTreasurer && (
                  <View style={styles.treasurerBadge}>
                    <Ionicons name="wallet" size={10} color={colors.accentLight} />
                  </View>
                )}
                {hasItems && onRowPress && (
                  <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
                )}
              </View>
              <Text style={[styles.cell, styles.numCol]}>
                {formatCurrency(summary.totalShare, currencyCode)}
              </Text>
              <Text style={[styles.cell, styles.numCol, { color: colors.success }]}>
                {formatCurrency(summary.totalPaid, currencyCode)}
              </Text>
              <View style={[{ flex: 1 }, styles.debtContainer]}>
                <Text
                  style={[
                    styles.cell,
                    styles.debtText,
                    isPositiveDebt && styles.debtPositive,
                    isNegativeDebt && styles.debtNegative,
                    isTreasurer && styles.debtZero,
                  ]}
                >
                  {formatCurrency(Math.abs(summary.debt), currencyCode)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Footer: total */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerCell, styles.nameCol]}>{t('summary.col_total')}</Text>
          <Text style={[styles.footerCell, styles.numCol]}>
            {formatCurrency(summaries.reduce((s, item) => s + item.totalShare, 0), currencyCode)}
          </Text>
          <Text style={[styles.footerCell, styles.numCol, { color: colors.success }]}>
            {formatCurrency(summaries.reduce((s, item) => s + item.totalPaid, 0), currencyCode)}
          </Text>
          <Text style={[styles.footerCell, styles.numCol]}>
            {formatCurrency(
              summaries
                .filter((s) => s.debt > 0)
                .reduce((sum, item) => sum + item.debt, 0),
              currencyCode,
            )}
          </Text>
        </View>

        {treasurerName && (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>{t('summary.legend_refunds', { name: treasurerName })}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>{t('summary.legend_owes', { name: treasurerName })}</Text>
            </View>
          </View>
        )}
      </View>
    );
  },
);

SummaryTable.displayName = 'SummaryTable';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: Spacing.sm,
    },
    headerCell: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    nameCol: { flex: 1.2 },
    numCol: { flex: 1, textAlign: 'right' },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    nameText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      flexShrink: 1,
    },
    treasurerBadge: {
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center', alignItems: 'center',
    },
    cell: { fontSize: FontSize.sm, color: colors.textSecondary },
    debtText: { fontWeight: FontWeight.bold },
    debtPositive: { color: colors.danger },
    debtNegative: { color: colors.success },
    debtZero: { color: colors.textMuted },
    debtContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    footerRow: {
      flexDirection: 'row',
      paddingTop: Spacing.sm,
      marginTop: Spacing.xs,
    },
    footerCell: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    legendRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
      marginTop: Spacing.md, paddingTop: Spacing.sm,
      borderTopWidth: 1, borderTopColor: colors.border,
      justifyContent: 'center',
    },
    legendItem: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    legendText: { fontSize: FontSize.xs, color: colors.textSecondary },
  });

export default SummaryTable;
