import { Keyboard, KeyboardAvoidingView as RNKeyboardAvoidingView, Platform } from 'react-native';

type Subscription = { remove: () => void };

/**
 * `KeyboardAvoidingView` của RN, sửa lỗi trên Android lúc bàn phím đóng.
 *
 * RN 0.81 trên Android gửi `keyboardDidHide` vào `_onKeyboardChange`, và hàm này tính lại khoảng
 * co từ `screenY` của sự kiện đóng. `screenY` đó là chiều cao vùng hiển thị (đã trừ thanh trạng thái
 * và thanh điều hướng), không phải đáy màn hình, nên ở chế độ edge-to-edge màn hình giữ lại một
 * khoảng hở 22–70dp dưới nút sau khi bàn phím đóng. iOS thì gửi sự kiện đóng vào `_onKeyboardHide`,
 * đưa khoảng co về 0. Component này cho Android làm giống iOS; phần xử lý lúc bàn phím mở giữ nguyên.
 *
 * Đừng đổi sang `behavior="padding"` hay tự chèn khoảng đệm trên Android: cách đó làm ô nhập mất
 * focus ngay khi bàn phím mở, bàn phím vẫn hiện nhưng gõ không vào.
 */
export default class KeyboardAvoidingView extends RNKeyboardAvoidingView {
  componentDidMount() {
    super.componentDidMount?.();
    if (Platform.OS !== 'android') return;

    // Các thành viên nội bộ của RN, không có trong type. Thiếu thì giữ nguyên hành vi gốc.
    const self = this as unknown as {
      _subscriptions?: Subscription[];
      _onKeyboardHide?: () => void;
      _onKeyboardChange?: () => void;
    };
    if (!self._subscriptions || !self._onKeyboardHide || !self._onKeyboardChange) return;

    self._subscriptions.forEach((s) => s.remove());
    self._subscriptions = [
      Keyboard.addListener('keyboardDidHide', self._onKeyboardHide),
      Keyboard.addListener('keyboardDidShow', self._onKeyboardChange),
    ];
  }
}
