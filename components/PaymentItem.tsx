import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Payment, Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';

interface PaymentItemProps {
  payment: Payment;
  members: Member[];
  onDelete?: () => void;
  onEdit?: () => void;
  currencyCode?: import('@/utils/currency').CurrencyCode;
}

const PaymentItem: React.FC<PaymentItemProps> = React.memo(
  ({ payment, members, onDelete, onEdit, currencyCode }) => {
    const member = members.find((m) => m.id === payment.memberId);
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
            <Ionicons name="cash-outline" size={18} color={colors.success} />
          </View>
          <View style={styles.details}>
            <Text style={styles.name}>{member?.name ?? '?'}</Text>
            {payment.note ? (
              <Text style={styles.note} numberOfLines={1}>
                {payment.note}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>+{formatCurrency(payment.amount, currencyCode)}</Text>
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

PaymentItem.displayName = 'PaymentItem';

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
    name: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    note: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    right: {
      alignItems: 'flex-end',
      marginLeft: Spacing.sm,
    },
    amount: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.success,
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

export default PaymentItem;
