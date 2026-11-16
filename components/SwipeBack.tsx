import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector, PanGestureConfig, usePanGesture } from 'react-native-gesture-handler';

/** Vùng tính từ mép trái (dp) mà cú vuốt phải bắt đầu trong đó. */
const EDGE_WIDTH = 32;
/** Kéo quá khoảng này (dp), hoặc thả tay đủ nhanh, thì quay lại. */
const BACK_DISTANCE = 80;
const BACK_VELOCITY = 800;

interface Props {
  /** false khi không có trang trước, ví dụ trang chủ. */
  enabled: boolean;
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * Vuốt từ mép trái sang phải để quay lại trang trước, chỉ trên Android.
 * iOS đã có sẵn cử chỉ này từ native stack nên không bọc thêm.
 */
export default function SwipeBack({ enabled, onBack, children }: Props) {
  // Hook giữ config theo tham chiếu, nên memo để không gửi lại config xuống native mỗi lần render.
  const config = useMemo<PanGestureConfig>(
    () => ({
      enabled,
      // Dự án không dùng reanimated: callback chạy trên JS thread.
      disableReanimated: true,
      hitSlop: { left: 0, width: EDGE_WIDTH },
      activeOffsetX: 20,
      failOffsetY: [-20, 20],
      onDeactivate: (e) => {
        if (e.translationX > BACK_DISTANCE || e.velocityX > BACK_VELOCITY) onBack();
      },
    }),
    [enabled, onBack],
  );
  const gesture = usePanGesture(config);

  if (Platform.OS !== 'android') return <>{children}</>;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.flex} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
