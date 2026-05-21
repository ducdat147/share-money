import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense, Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, roundCurrency } from '@/utils/calculator';

interface ExpenseItemProps {
  expense: Expense;
  members: Member[];
  onDelete?: () => void;
  onEdit?: () => void;
  currencyCode?: import('@/utils/currency').CurrencyCode;
}

const ExpenseItem: React.FC<ExpenseItemProps> = React.memo(
  ({ expense, members, onDelete, onEdit, currencyCode }) => {
    const { t } = useTranslation();
    const participantNames = expense.participants
      .map((pid: string) => members.find((m: Member) => m.id === pid)?.name ?? '?')
      .join(', ');
      
    const paidByName = expense.paidBy
      ? members.find((m: Member) => m.id === expense.paidBy)?.name ?? t('summary.treasurer')
      : t('summary.treasurer');

    const perPerson = expense.amount / expense.participants.length;
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleDelete = useCallback(() => onDelete?.(), [onDelete]);
    const handleEdit = useCallback(() => onEdit?.(), [onEdit]);

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={handleEdit}
        activeOpacity={onEdit ? 0.7 : 1}
      >
        <View style={styles.left}>
          <View style={styles.iconContainer}>
            <Ionicons name="cart-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.details}>
            <Text style={styles.description} numberOfLines={1}>
              {expense.description}
            </Text>
            <Text style={styles.payer} numberOfLines={1}>
              {t('components.payer_prefix')}<Text style={styles.payerName}>{paidByName}</Text>
            </Text>
            <Text style={styles.participants} numberOfLines={1}>
              {participantNames}
            </Text>
            <Text style={styles.perPerson}>
              {t('add_expense.per_person', { amount: formatCurrency(roundCurrency(perPerson, currencyCode), currencyCode) })}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatCurrency(expense.amount, currencyCode)}</Text>
          <View style={styles.actions}>
            {onDelete && (
              <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

ExpenseItem.displayName = 'ExpenseItem';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    details: {
      flex: 1,
    },
    description: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    payer: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    payerName: {
      fontWeight: FontWeight.bold,
      color: colors.primary,
    },
    participants: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    perPerson: {
      fontSize: FontSize.xs,
      color: colors.primaryLight,
      marginTop: 2,
    },
    right: {
      alignItems: 'flex-end',
      marginLeft: Spacing.sm,
    },
    amount: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.accent,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.xs,
      gap: Spacing.sm,
    },
    actionBtn: {
      padding: 2,
    },
  });

export default ExpenseItem;
