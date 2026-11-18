import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TripSummary } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius } from '@/constants/theme';
import { AppText, Card, SwipeAction, SwipeableRow } from '@/components/ui';
import { formatCurrency } from '@/utils/calculator';

import ScalePressable from './ScalePressable';
import * as Haptics from 'expo-haptics';

interface TripCardProps {
  trip: TripSummary;
  onPress: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

const TripCard: React.FC<TripCardProps> = React.memo(({ trip, onPress, onRename, onDelete }) => {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const subtitle = useMemo(
    () =>
      [
        t('components.member_count', { count: trip.memberCount }),
        formatCurrency(trip.totalExpense, trip.currency),
        new Date(trip.createdAt).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' }),
      ].join(' · '),
    [t, i18n.language, trip.memberCount, trip.totalExpense, trip.currency, trip.createdAt],
  );

  const actions = useMemo(() => {
    const list: SwipeAction[] = [];
    if (onRename) list.push({ label: t('home.rename'), icon: 'pencil-outline', tone: 'primary', onPress: onRename });
    if (onDelete) list.push({ label: t('common.delete'), icon: 'trash-outline', tone: 'danger', onPress: onDelete });
    return list;
  }, [onRename, onDelete, t]);

  return (
    <View style={styles.container}>
      <SwipeableRow actions={actions} enabled={actions.length > 0}>
        <ScalePressable
          onPress={onPress}
          haptic={Haptics.ImpactFeedbackStyle.Medium}
        >
          {/* Viền và bo góc nằm ở khung ngoài, để thẻ ghép phẳng với dải nút khi vuốt. */}
          <Card style={styles.card}>
            <View style={trip.isCompleted && styles.completed}>
              <View style={styles.header}>
                <AppText weight="semibold" numberOfLines={1} style={styles.title}>
                  {trip.name}
                </AppText>
                <AppText
                  variant="label"
                  weight="semibold"
                  color={trip.isCompleted ? colors.textSecondary : colors.success}
                >
                  {t(trip.isCompleted ? 'home.status_done' : 'home.status_active')}
                </AppText>
              </View>
              <AppText variant="label" numeric color={colors.textSecondary} numberOfLines={1}>
                {subtitle}
              </AppText>
            </View>
          </Card>
        </ScalePressable>
      </SwipeableRow>
      <View style={styles.border} pointerEvents="none" />
    </View>
  );
});

TripCard.displayName = 'TripCard';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
    },
    card: {
      borderWidth: 0,
      borderRadius: 0,
    },
    border: {
      ...StyleSheet.absoluteFill,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
    },
    completed: {
      opacity: 0.6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.xs,
    },
    title: {
      flex: 1,
    },
  });

export default TripCard;
