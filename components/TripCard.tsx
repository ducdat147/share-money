import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, PanGestureConfig, usePanGesture } from 'react-native-gesture-handler';
import { TripSummary } from '@/utils/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { ThemeColors, Spacing, BorderRadius } from '@/constants/theme';
import { AppText, Card } from '@/components/ui';
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

  const panConfig = useMemo<PanGestureConfig>(
    () => ({
      enabled: !!onDelete,
      // Callback đụng tới Animated.Value và openedCard nên phải chạy trên JS thread.
      disableReanimated: true,
      activeOffsetX: [-10, 10],
      failOffsetY: [-10, 10],
      onActivate: () => {
        if (openedCard && openedCard !== swipe) snap(openedCard, false);
        swipe.translateX.stopAnimation();
      },
      onUpdate: (e) => {
        const base = swipe.isOpen ? -OPEN_OFFSET : 0;
        swipe.translateX.setValue(Math.min(0, Math.max(-OPEN_OFFSET, base + e.translationX)));
      },
      onDeactivate: (e) => {
        const x = (swipe.isOpen ? -OPEN_OFFSET : 0) + e.translationX;
        const open =
          e.velocityX < -SWIPE_VELOCITY || (e.velocityX <= SWIPE_VELOCITY && x < -OPEN_OFFSET / 2);
        snap(swipe, open);
      },
    }),
    [onDelete, swipe],
  );
  const pan = usePanGesture(panConfig);

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
            <AppText variant="label" weight="semibold" color={colors.onDanger}>
              {t('common.delete')}
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={{ transform: [{ translateX: swipe.translateX }] }}>
          <ScalePressable
            onPress={handlePress}
            haptic={Haptics.ImpactFeedbackStyle.Medium}
          >
            <Card>
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
    swipeDelete: {
      width: DELETE_ACTION_WIDTH,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.xs,
    },
  });

export default TripCard;
