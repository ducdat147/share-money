import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import type { PanGestureConfig } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, ThemeColors } from '@/constants/theme';
import AppText from './AppText';
import type { IoniconName } from './Button';

const ACTION_WIDTH = 88;
const SNAP_DURATION = 180;
// Thả tay khi đã kéo quá nửa dải nút, hoặc hất nhanh sang trái, thì giữ mở.
const OPEN_VELOCITY = -500;

// Chỉ một dòng mở tại một thời điểm: mở dòng mới thì đóng dòng cũ.
let openRow: { id: symbol; close: () => void } | null = null;

export type SwipeAction = {
  label: string;
  icon: IoniconName;
  /** danger: nền đỏ, cho thao tác xoá. primary: nền màu chủ đạo. */
  tone: 'primary' | 'danger';
  onPress: () => void;
};

export type SwipeableRowProps = {
  children: ReactNode;
  /** Xếp từ trái sang phải; nút cuối nằm sát mép phải. */
  actions: SwipeAction[];
  /** false thì dòng không vuốt được, ví dụ chuyến đi đã kết thúc. */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function SwipeableRow({
  children,
  actions,
  enabled = true,
  style,
}: SwipeableRowProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [translateX] = useState(() => new Animated.Value(0));
  const [isOpen, setIsOpen] = useState(false);
  const openRef = useRef(false);
  const openWidth = ACTION_WIDTH * actions.length;
  const [rowId] = useState(() => Symbol('row'));

  const snapTo = useCallback(
    (open: boolean) => {
      openRef.current = open;
      setIsOpen(open);
      Animated.timing(translateX, {
        toValue: open ? -openWidth : 0,
        duration: SNAP_DURATION,
        useNativeDriver: true,
      }).start();
    },
    [translateX, openWidth],
  );

  const close = useCallback(() => {
    if (openRow?.id === rowId) openRow = null;
    snapTo(false);
  }, [rowId, snapTo]);

  // Dòng bị gỡ khỏi danh sách (vừa xoá) khi đang mở thì bỏ tham chiếu tới nó.
  useEffect(() => () => {
    if (openRow?.id === rowId) openRow = null;
  }, [rowId]);

  // Hook giữ config theo tham chiếu, nên memo để không gửi lại config xuống native mỗi lần render.
  const panConfig = useMemo<PanGestureConfig>(
    () => ({
      // Dự án không dùng reanimated: callback chạy trên JS thread.
      disableReanimated: true,
      enabled,
      // Chỉ nhận cú kéo ngang, để FlatList vẫn cuộn dọc bình thường.
      activeOffsetX: [-10, 10],
      failOffsetY: [-10, 10],
      onActivate: () => {
        translateX.stopAnimation();
        if (openRow && openRow.id !== rowId) openRow.close();
      },
      onUpdate: (e) => {
        const base = openRef.current ? -openWidth : 0;
        translateX.setValue(Math.min(0, Math.max(-openWidth, base + e.translationX)));
      },
      onDeactivate: (e) => {
        const base = openRef.current ? -openWidth : 0;
        const x = base + e.translationX;
        const open = x < -openWidth / 2 || e.velocityX < OPEN_VELOCITY;
        if (open && !openRef.current) Haptics.selectionAsync();
        if (open) openRow = { id: rowId, close };
        snapTo(open);
      },
    }),
    [enabled, translateX, openWidth, rowId, close, snapTo],
  );
  const pan = usePanGesture(panConfig);

  const handleAction = (action: SwipeAction) => {
    close();
    action.onPress();
  };

  return (
    <View style={style}>
      <View style={styles.actionTrack}>
        {actions.map((action) => {
          const fg = action.tone === 'danger' ? colors.onDanger : colors.onPrimary;
          return (
            <Pressable
              key={action.label}
              style={[styles.action, action.tone === 'danger' ? styles.danger : styles.primary]}
              onPress={() => handleAction(action)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Ionicons name={action.icon} size={20} color={fg} />
              <AppText variant="caption" weight="semibold" color={fg} numberOfLines={1}>
                {action.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
          {children}
          {/* Đang mở thì chạm vào dòng chỉ đóng nó lại, không mở bảng sửa. */}
          {isOpen && <Pressable style={StyleSheet.absoluteFill} onPress={close} />}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    actionTrack: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    action: {
      width: ACTION_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.xs,
    },
    danger: {
      backgroundColor: colors.danger,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    content: {
      backgroundColor: colors.surface,
    },
  });
