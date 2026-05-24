# Share Money 💸 - Project History & Context Summary

Tài liệu này lưu trữ toàn bộ lịch sử phát triển, các quyết định kiến trúc và cấu trúc mã nguồn hiện tại của ứng dụng **Share Money** để làm ngữ cảnh (context) cho các phiên chat AI tiếp theo nhằm tiết kiệm tối đa token.

---

## 📅 Cập Nhật Gần Nhất
* **Thời gian:** 24-05-2026 (Quản lý Thành viên, Tất toán Tập trung & Chia sẻ Ảnh)
* **Trạng thái:** Hoàn thiện luồng tạo chuyến đi nhanh, hệ thống quản lý thành viên nâng cao, đa dạng hóa chiến lược tất toán và tích hợp tính năng xuất ảnh JPEG. Đã chuyển đổi sang `Animated` chuẩn để ổn định hệ thống.

---

## 🎯 Tổng Quan Dự Án & Các Tính Năng Đã Triển Khai

1. **Kiến trúc & Lưu trữ**:
   - Chạy offline bằng `expo-sqlite`.
   - Quản lý state bằng `Zustand` ([useTripStore.ts](../hooks/useTripStore.ts)).
   - Hỗ trợ **New Architecture** (đã cấu hình `GestureHandlerRootView` và các plugin cần thiết).

2. **Hệ thống Quản lý Thành viên & Tạo Chuyến đi (Mới)**:
   - **Tạo nhanh**: Cho phép tạo chuyến đi bằng cách nhập số lượng người. Tên tự động là "User 1", "User 2"...
   - **MemberDetailModal**: Popup quản lý chi tiết từng người (Đổi tên, chỉ định Thủ quỹ, đóng quỹ nhanh).
   - **Cập nhật Database**: Bổ sung hàm `updateMemberName` và logic đồng bộ hóa state khi thay đổi thông tin thành viên.

3. **Thuật toán Tất toán Nâng cao (Mới)**:
   - **Chiến lược Tối ưu (Optimal)**: Sử dụng Greedy + Subset Sum để giảm thiểu số lượng giao dịch.
   - **Chiến lược Tập trung (Centralized)**: Dồn toàn bộ nợ về một **Người trung gian** (mặc định là Thủ quỹ) để gom tiền và chia lại.
   - **Tính minh bạch**: Hiển thị chi tiết từng khoản "Tiền tự chi trả" (Advanced Items) kèm mô tả trong bảng tổng kết cá nhân.

4. **Tính năng Chia sẻ & Xuất bản (Mới)**:
   - **JPEG Export**: Sử dụng `react-native-view-shot` để chụp lại bảng gợi ý tất toán.
   - **Native Sharing**: Tích hợp `expo-sharing` để gửi ảnh qua các ứng dụng chat (Zalo, Messenger...).

5. **Hoàn thiện UI/UX & Hiệu ứng**:
   - **Standard Animated API**: Đã thay thế `react-native-reanimated` bằng bộ thư viện `Animated` chuẩn của React Native để khắc phục lỗi TurboModule (`installTurboModule`) và đảm bảo tính ổn định tuyệt đối trên RN 0.81.
   - **Spring & Fade**: Hiệu ứng popup trượt dưới lên (Spring) và mờ nền (Fade) mượt mà, chuyên nghiệp.
   - **Cải tiến Định tuyến**: Xử lý lỗi `Unmatched Route` bằng cách chuẩn hóa lệnh `router.replace` và `router.dismissAll()`.

6. **Cấu hình Hệ thống & Môi trường**:
   - Chuyển `.npmrc` thành `.pnpmrc` để loại bỏ cảnh báo của npm đối với cấu hình `node-linker`.
   - Chuẩn hóa các plugin trong `app.json` và `babel.config.js`.

---

## 🛠️ Cấu Trúc File & Mã Nguồn Quan Trọng

- **[calculator.ts](../utils/calculator.ts)**: Chứa logic tính toán tất toán tối ưu và tập trung.
- **[MemberDetailModal.tsx](../components/MemberDetailModal.tsx)**: Trung tâm điều khiển thông tin thành viên.
- **[summary.tsx](../app/trip/[id]/summary.tsx)**: Trang tổng kết với bộ chọn chiến lược tất toán và tính năng chia sẻ ảnh.
- **[create.tsx](../app/trip/create.tsx)**: Luồng tạo chuyến đi tối giản.
- **[database.ts](../services/database.ts)**: Quản lý SQLite và các thao tác CRUD thành viên/chi tiêu.

---

## ⚠️ Cách Tiếp Tục Session (Dành cho User)

Để tiếp tục dự án trong một phiên chat mới, bạn chỉ cần gửi yêu cầu:
> "Đọc file history/project_context.md để tiếp tục dự án"

AI sẽ ngay lập tức nắm bắt được toàn bộ các logic tài chính, thành viên, và các tính năng xuất bản đã cài đặt mà không cần giải thích lại.
