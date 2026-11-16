import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
  /**
   * Mặc định sheet bọc children trong ScrollView để cuộn được khi cao quá giới hạn. Đặt false khi
   * children tự cuộn (ví dụ có FlatList), tránh lồng danh sách ảo trong ScrollView.
   */
  scrollable?: boolean;
};

export default function BottomSheet({
  visible,
  onRequestClose,
  children,
  scrollable = true,
}: BottomSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showModal, setShowModal] = useState(visible);
  // Đọc trong callback cử chỉ, nên để ở ref: config cử chỉ giữ nguyên tham chiếu khi sheet đổi
  // chiều cao hay cha truyền hàm đóng mới mỗi lần render (ví dụ `() => router.back()`).
  const sheetHeight = useRef(0);
  const closeRef = useRef(onRequestClose);
  useEffect(() => {
    closeRef.current = onRequestClose;
  });
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
      // Chỉ gắn vào dải tay nắm và chỉ nhận cú kéo xuống, nên nội dung bên dưới cuộn tự do.
      activeOffsetY: 10,
      failOffsetX: [-20, 20],
      onActivate: () => translateY.stopAnimation(),
      onUpdate: (e) => translateY.setValue(Math.max(0, e.translationY)),
      onDeactivate: (e) => {
        if (e.translationY > sheetHeight.current * CLOSE_RATIO || e.velocityY > CLOSE_VELOCITY) {
          // Trượt hẳn xuống rồi mới báo, để route transparentModal (visible luôn true) cũng đóng mượt.
          Animated.timing(translateY, {
            toValue: hiddenOffset,
            duration: CLOSE_DURATION,
            useNativeDriver: true,
          }).start(() => closeRef.current());
        } else {
          Animated.timing(translateY, { toValue: 0, duration: CLOSE_DURATION, useNativeDriver: true }).start();
        }
      },
    }),
    [translateY, hiddenOffset],
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
        {/* Khoảng đệm trên giới hạn chiều cao sheet, chừa tai thỏ và một dải nền để bấm đóng. Sheet
            co lại theo vùng này (kể cả khi iOS chèn chỗ cho bàn phím), phần thừa thì cuộn. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.avoider, { paddingTop: insets.top + Spacing.xxxl }]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Spacing.xl + insets.bottom,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
            onLayout={(e) => {
              sheetHeight.current = e.nativeEvent.layout.height;
            }}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.handleStrip}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            {scrollable ? (
              <ScrollView
                style={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.body}>{children}</View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    avoider: {
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
      flexShrink: 1,
    },
    handleStrip: {
      alignItems: 'center',
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    body: {
      flexShrink: 1,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.textMuted,
    },
  });
