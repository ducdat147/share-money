import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, getTotalExpenses } from '@/utils/calculator';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  onDelete?: () => void;
}

const TripCard: React.FC<TripCardProps> = React.memo(({ trip, onPress, onDelete }) => {
  const totalExpenses = getTotalExpenses(trip.expenses);
  const treasurer = trip.members.find((m) => m.id === trip.treasurerId);
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleDelete = useCallback(() => onDelete?.(), [onDelete]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: trip.isCompleted ? colors.textMuted : colors.success },
            ]}
          />
          <Text style={styles.title} numberOfLines={1}>
            {trip.name}
          </Text>
        </View>
        {trip.isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{t('components.badge_completed')}</Text>
          </View>
        )}
        {onDelete && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>{t('components.member_count', { count: trip.members.length })}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>{t('components.expense_count', { count: trip.expenses.length })}</Text>
        </View>
        {treasurer && (
          <View style={styles.infoItem}>
            <Ionicons name="wallet-outline" size={14} color={colors.primaryLight} />
            <Text style={[styles.infoText, { color: colors.primaryLight }]}>
              {treasurer.name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>{t('components.total_expense')}</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalExpenses, trip.currency)}</Text>
      </View>
    </TouchableOpacity>
  );
});

TripCard.displayName = 'TripCard';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: Spacing.sm,
    },
    title: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.onSurface,
      flex: 1,
    },
    deleteBtn: {
      padding: Spacing.xs,
    },
    info: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    infoText: {
      fontSize: FontSize.sm,
      color: colors.onSurfaceSecondary,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: FontSize.sm,
      color: colors.onSurfaceSecondary,
    },
    totalValue: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.secondary,
    },
    completedBadge: {
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      marginLeft: Spacing.sm,
    },
    completedText: {
      fontSize: FontSize.xs,
      color: colors.onSurfaceMuted,
      fontWeight: FontWeight.medium,
    },
  });

export default TripCard;
