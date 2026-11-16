import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Payment, Member } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';
import { CurrencyCode } from '@/utils/currency';
import { ListRow } from '@/components/ui';

interface PaymentItemProps {
  payment: Payment;
  members: Member[];
  /** Không truyền thì dòng không bấm được (chuyến đã xong). */
  onEdit?: () => void;
  currencyCode?: CurrencyCode;
}

const PaymentItem: React.FC<PaymentItemProps> = React.memo(
  ({ payment, members, onEdit, currencyCode }) => {
    const member = members.find((m) => m.id === payment.memberId);
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <ListRow
        left={
          <View style={styles.icon}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
          </View>
        }
        title={member?.name ?? '?'}
        subtitle={payment.note || undefined}
        amount={`+${formatCurrency(payment.amount, currencyCode)}`}
        amountColor={colors.success}
        onPress={onEdit}
      />
    );
  },
);

PaymentItem.displayName = 'PaymentItem';

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

export default PaymentItem;
