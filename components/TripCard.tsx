import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TripSummary } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';

import ScalePressable from './ScalePressable';
import * as Haptics from 'expo-haptics';

const DELETE_ACTION_WIDTH = 88;
/** Thẻ trượt sang trái bấy nhiêu khi mở: bề rộng nút xoá cộng khoảng cách với thẻ. */
const OPEN_OFFSET = DELETE_ACTION_WIDTH + Spacing.sm;
/** Hất tay nhanh hơn ngưỡng này (dp/s) thì mở hoặc đóng ngay, không cần kéo quá nửa đường. */
const SWIPE_VELOCITY = 500;

type SwipeState = { translateX: Animated.Value; isOpen: boolean };

// Chỉ một thẻ được lộ nút xoá tại một thời điểm.
let openedCard: SwipeState | null = null;

function snap(card: SwipeState, open: boolean) {
  card.isOpen = open;
  if (open) {
    if (openedCard && openedCard !== card) snap(openedCard, false);
    openedCard = card;
  } else if (openedCard === card) {
    openedCard = null;
  }
  Animated.spring(card.translateX, {
    toValue: open ? -OPEN_OFFSET : 0,
    useNativeDriver: true,
    bounciness: 0,
  }).start();
}

interface TripCardProps {
  trip: TripSummary;
  onPress: () => void;
  onDelete?: () => void;
}

const TripCard: React.FC<TripCardProps> = React.memo(({ trip, onPress, onDelete }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [swipe] = useState<SwipeState>(() => ({ translateX: new Animated.Value(0), isOpen: false }));

  useEffect(
    () => () => {
      if (openedCard === swipe) openedCard = null;
    },
    [swipe],
  );

  // Nút xoá nằm dưới thẻ; ẩn nó khi thẻ đóng để góc bo của thẻ không để lộ viền đỏ.
  const actionOpacity = useMemo(
    () =>
      swipe.translateX.interpolate({
        inputRange: [-Spacing.lg, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [swipe],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!onDelete)
        .runOnJS(true)
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onStart(() => {
          if (openedCard && openedCard !== swipe) snap(openedCard, false);
          swipe.translateX.stopAnimation();
        })
        .onUpdate((e) => {
          const base = swipe.isOpen ? -OPEN_OFFSET : 0;
          swipe.translateX.setValue(Math.min(0, Math.max(-OPEN_OFFSET, base + e.translationX)));
        })
        .onEnd((e) => {
          const x = (swipe.isOpen ? -OPEN_OFFSET : 0) + e.translationX;
          const open =
            e.velocityX < -SWIPE_VELOCITY || (e.velocityX <= SWIPE_VELOCITY && x < -OPEN_OFFSET / 2);
          snap(swipe, open);
        }),
    [onDelete, swipe],
  );

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.();
  }, [onDelete]);

  // Thẻ đang lộ nút xoá thì bấm vào chỉ để đóng lại, không mở chuyến đi.
  const handlePress = useCallback(() => {
    if (swipe.isOpen) {
      snap(swipe, false);
      return;
    }
    onPress();
  }, [onPress, swipe]);

  const handleSwipeDelete = useCallback(() => {
    snap(swipe, false);
    handleDelete();
  }, [handleDelete, swipe]);

  return (
    <View style={styles.container}>
      {onDelete && (
        <Animated.View style={[styles.actions, { opacity: actionOpacity }]}>
          <TouchableOpacity style={styles.swipeDelete} onPress={handleSwipeDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={22} color={colors.onDanger} />
            <Text style={styles.swipeDeleteText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={{ transform: [{ translateX: swipe.translateX }] }}>
          <ScalePressable
            style={styles.card}
            onPress={handlePress}
            haptic={Haptics.ImpactFeedbackStyle.Medium}
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
            </View>

            <View style={styles.info}>
              <View style={styles.infoItem}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.infoText}>{t('components.member_count', { count: trip.memberCount })}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.infoText}>{t('components.expense_count', { count: trip.expenseCount })}</Text>
              </View>
              {trip.treasurerName && (
                <View style={styles.infoItem}>
                  <Ionicons name="wallet-outline" size={14} color={colors.primaryLight} />
                  <Text style={[styles.infoText, { color: colors.primaryLight }]}>
                    {trip.treasurerName}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.totalLabel}>{t('components.total_expense')}</Text>
              <Text style={styles.totalValue}>{formatCurrency(trip.totalExpense, trip.currency)}</Text>
            </View>
          </ScalePressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

TripCard.displayName = 'TripCard';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
      overflow: 'hidden',
    },
    actions: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
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
    swipeDelete: {
      width: DELETE_ACTION_WIDTH,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    swipeDeleteText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.onDanger,
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
