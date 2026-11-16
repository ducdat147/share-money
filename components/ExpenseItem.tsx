import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense, Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';
import { CurrencyCode } from '@/utils/currency';
import { ListRow } from '@/components/ui';

interface ExpenseItemProps {
  expense: Expense;
  members: Member[];
  treasurerId?: string;
  /** Không truyền thì dòng không bấm được (chuyến đã xong). */
  onEdit?: () => void;
  currencyCode?: CurrencyCode;
}

const ExpenseItem: React.FC<ExpenseItemProps> = React.memo(
  ({ expense, members, treasurerId, onEdit, currencyCode }) => {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Khoản chi chưa có paidBy (dữ liệu trước migration) là khoản chi từ quỹ, nên ghi tên thủ quỹ.
    // Không tìm được tên (chuyến không có thủ quỹ) thì bỏ phần người trả.
    const payerName = members.find((m) => m.id === (expense.paidBy ?? treasurerId))?.name;
    const count = expense.participants.length;
    const subtitle = payerName
      ? t('trip_detail.expense_meta', { payer: payerName, count })
      : t('components.member_count', { count });

    return (
      <ListRow
        left={
          <View style={styles.icon}>
            <Ionicons name="cart-outline" size={18} color={colors.primary} />
          </View>
        }
        title={expense.description}
        subtitle={subtitle}
        amount={formatCurrency(expense.amount, currencyCode)}
        onPress={onEdit}
      />
    );
  },
);

ExpenseItem.displayName = 'ExpenseItem';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default ExpenseItem;
