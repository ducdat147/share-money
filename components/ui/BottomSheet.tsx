import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import {
  GestureDetector,
  GestureHandlerRootView,
  PanGestureConfig,
  usePanGesture,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Spacing, ThemeColors } from '@/constants/theme';

// Giống MemberDetailModal: bản build bật edge-to-edge nên cửa sổ Dialog của Modal không co lại
// khi bàn phím mở, sheet nằm dưới bàn phím. Expo Go tắt edge-to-edge, cửa sổ tự co, nên chỉ tự
// đẩy sheet lên ở bản build.
const liftForKeyboard =
  Platform.OS === 'android' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** Kéo xuống quá tỉ lệ này của chiều cao sheet, hoặc thả đủ nhanh, thì đóng. */
const CLOSE_RATIO = 0.25;
const CLOSE_VELOCITY = 1000;
const OPEN_DURATION = 250;
const CLOSE_DURATION = 200;

export type BottomSheetProps = {
  /** Trong route transparentModal thì luôn true; trong màn thì theo state. */
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

export default function BottomSheet({ visible, onRequestClose, children }: BottomSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showModal, setShowModal] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [hiddenOffset] = useState(() => Dimensions.get('screen').height);
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(hiddenOffset));
  const [keyboardOffset] = useState(() => new Animated.Value(0));
  // Dùng transform để không đổi layout: đổi padding/height trên Android làm ô nhập mất focus.
  const [sheetTranslateY] = useState(() => Animated.add(translateY, keyboardOffset));

  // Mount Modal ngay khi mở; effect bên dưới chạy animation, đóng xong mới unmount.
  if (visible && !showModal) setShowModal(true);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: OPEN_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: OPEN_DURATION, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: CLOSE_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: hiddenOffset,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setShowModal(false));
    }
  }, [visible, overlayOpacity, translateY, hiddenOffset]);

  useEffect(() => {
    if (!liftForKeyboard) return;
    const subs = [
      // screenY là mép trên bàn phím tính từ đỉnh màn hình; xem MemberDetailModal để biết vì sao
      // không dùng endCoordinates.height.
      Keyboard.addListener('keyboardDidShow', (e) =>
        keyboardOffset.setValue(Math.min(0, e.endCoordinates.screenY - Dimensions.get('screen').height)),
      ),
      Keyboard.addListener('keyboardDidHide', () => keyboardOffset.setValue(0)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [keyboardOffset]);

  // Hook giữ config theo tham chiếu, nên memo để không gửi lại config xuống native mỗi lần render.
  const panConfig = useMemo<PanGestureConfig>(
    () => ({
      // Dự án không dùng reanimated: callback chạy trên JS thread.
      disableReanimated: true,
      // Chỉ nhận cú kéo xuống, để chạm phím và cuộn ngang trong sheet không bị bắt.
      activeOffsetY: 10,
      failOffsetX: [-20, 20],
      onActivate: () => translateY.stopAnimation(),
      onUpdate: (e) => translateY.setValue(Math.max(0, e.translationY)),
      onDeactivate: (e) => {
        if (e.translationY > sheetHeight * CLOSE_RATIO || e.velocityY > CLOSE_VELOCITY) {
          // Trượt hẳn xuống rồi mới báo, để route transparentModal (visible luôn true) cũng đóng mượt.
          Animated.timing(translateY, {
            toValue: hiddenOffset,
            duration: CLOSE_DURATION,
            useNativeDriver: true,
          }).start(() => onRequestClose());
        } else {
          Animated.timing(translateY, { toValue: 0, duration: CLOSE_DURATION, useNativeDriver: true }).start();
        }
      },
    }),
    [translateY, sheetHeight, hiddenOffset, onRequestClose],
  );
  const pan = usePanGesture(panConfig);

  if (!showModal) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      // Cửa sổ Modal mở ra với icon status bar màu trắng, kể cả ở light mode, nên đặt lại sau khi hiện.
      onShow={() => StatusBar.setStyle(isDark ? 'light' : 'dark')}
      animationType="none"
      onRequestClose={onRequestClose}
    >
      {/* Modal trên Android là cửa sổ riêng, cử chỉ RNGH bên trong cần root view của nó. */}
      <GestureHandlerRootView style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </Pressable>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.sheet,
                { paddingBottom: Spacing.xl + insets.bottom, transform: [{ translateY: sheetTranslateY }] },
              ]}
              onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
            >
              <View style={styles.handle} />
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlay,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.textMuted,
      marginBottom: Spacing.lg,
    },
  });
