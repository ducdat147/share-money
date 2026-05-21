# Share Money 💸 - Project History & Context Summary

Tài liệu này lưu trữ toàn bộ lịch sử phát triển, các quyết định kiến trúc và cấu trúc mã nguồn hiện tại của ứng dụng **Share Money** để làm ngữ cảnh (context) cho các phiên chat AI tiếp theo nhằm tiết kiệm tối đa token.

---

## 📅 Cập Nhật Gần Nhất
* **Thời gian:** 21-05-2026 (Tích hợp Đa tiền tệ & Sửa lỗi hiển thị UI)
* **Trạng thái:** Hoàn tất hệ thống quản lý đa tiền tệ (VND/USD) theo từng chuyến đi, làm tròn đối xứng chính xác (Symmetric Rounding), sửa lỗi tràn chữ tiêu đề và các lỗi cảnh báo stylesheet React Native.

---

## 🎯 Tổng Quan Dự Án & Các Tính Năng Đã Triển Khai

1. **Kiến trúc & Lưu trữ**:
   - Chạy offline bằng `expo-sqlite`.
   - Quản lý state bằng `Zustand` ([useTripStore.ts](../hooks/useTripStore.ts)).
   - Thêm cột `currency` (TEXT DEFAULT 'VND') trong bảng `trips` để lưu cấu hình tiền tệ riêng biệt cho từng chuyến đi.

2. **Hệ thống Đa tiền tệ & Thuật toán Làm tròn (Mới)**:
   - Cấu hình tiền tệ tập trung tại [currency.ts](../utils/currency.ts) (hỗ trợ VND - 0 decimal, USD - 2 decimals, dễ dàng mở rộng thêm loại tiền mới).
   - Áp dụng cơ chế **Làm tròn đối xứng** (Symmetric Rounding half away from zero) sử dụng `Math.sign` kết hợp `Number.EPSILON` để loại bỏ sai số dấu phẩy động của JavaScript.
   - Quy tắc tính toán: Toàn bộ quá trình tính toán trung gian được giữ nguyên độ chính xác cao (Decimal-like precision), việc làm tròn chỉ thực hiện ở ranh giới hiển thị (Presentation boundary) và lưu trữ tổng kết.

3. **Hệ thống Màu sắc & Design System**:
   - Sử dụng **Semantic Colors** (`onPrimary`, `onSurface`, `onBackground`...) đảm bảo độ tương phản (contrast) chuẩn WCAG.
   - Quản lý màu tập trung tại [theme.ts](../constants/theme.ts).
   - Hỗ trợ Dark/Light mode đồng bộ trên toàn bộ component (SubmitButton, FAB, Tabs...).

4. **Thuật toán Tất toán & Tài chính**:
   - Áp dụng **Net Balance Approach**: `Balance = (Đã chi) - (Phải trả) - (Quỹ đang cầm)`. Tổng Balance nhóm luôn = 0.
   - Thuật toán Greedy kết hợp Subset Sum (tối ưu hóa số giao dịch cho nhóm <= 15 người) trong [calculator.ts](../utils/calculator.ts) gợi ý "Ai chuyển cho ai" tối ưu nhất, xử lý tiền tệ tương ứng cho từng chuyến đi.
   - Tách bạch rõ ràng: **Tiền đóng quỹ** (vào ví thủ quỹ) và **Tiền tự chi trả** (trả trực tiếp cho nhóm).

5. **Giao diện Người dùng (UI/UX) & Vá lỗi**:
   - Cho phép chọn loại tiền tệ khi tạo chuyến đi mới và chuyển đổi linh hoạt trong trang chi tiết chuyến đi (Header).
   - Sửa lỗi layout: Đơn vị tiền tệ hiển thị trên Header (ví dụ "VND", "USD") bị xuống dòng từng chữ cái bằng cách chuyển `width: 32` thành `minWidth: 32` (hoặc tự co giãn) trên container nút bên phải của [CustomHeader.tsx](../components/CustomHeader.tsx).
   - Chuẩn hóa CSS React Native: Loại bỏ các thuộc tính không hợp lệ như `borderTopStyle` (thay bằng `borderStyle` & `borderTopWidth`) và di chuyển các style dạng text (như `color`, `fontSize`, `textAlign`) từ `<View>` sang đúng thẻ `<Text>` trong [SummaryTable.tsx](../components/SummaryTable.tsx).
   - **UserAvatar**: Hiển thị chữ cái đầu của tên với màu nền ngẫu nhiên (hash cố định theo tên).

6. **Cấu hình Hệ thống & Build APK**:
   - Sử dụng **New Architecture** (`newArchEnabled: true`) để tương thích 100% với React Native 0.81.
   - Nâng cấp `react-native-reanimated` v4 và cấu hình `metro.config.js` (`.wasm`) cho SQLite.
   - Tối ưu hóa file cấu hình `eas.json` và `.npmrc` (UTF-8) đảm bảo quá trình build cloud diễn ra trơn tru.

---

## 🛠️ Cấu Trúc File & Mã Nguồn Quan Trọng

- **[currency.ts](../utils/currency.ts)**: Định nghĩa cấu hình tiền tệ (decimals, symbol, locale, position) và hàm format/làm tròn đối xứng (`formatCurrency`, `roundCurrency`).
- **[theme.ts](../constants/theme.ts)**: Trái tim của hệ thống màu sắc.
- **[calculator.ts](../utils/calculator.ts)**: Chứa toàn bộ logic tính toán `calculateSummary` và `calculateSettlements` theo tiền tệ được cấu hình.
- **[database.ts](../services/database.ts)**: Quản lý SQLite, xử lý di trú database (migration) tự động thêm cột `currency` cho các chuyến đi cũ.
- **[useTripStore.ts](../hooks/useTripStore.ts)**: Quản lý Zustand store, thêm action `updateTripCurrency` giúp cập nhật loại tiền tệ của chuyến đi và lưu xuống DB.
- **[UserAvatar.tsx](../components/UserAvatar.tsx)**: Component hiển thị avatar động.
- **[summary.tsx](../app/trip/[id]/summary.tsx)**: Trang tổng kết và hiển thị tất toán.

---

## ⚠️ Cách Tiếp Tục Session (Dành cho User)

Để tiếp tục dự án trong một phiên chat mới, bạn chỉ cần gửi yêu cầu:
> "Đọc file history/project_context.md để tiếp tục dự án"

AI sẽ ngay lập tức nắm bắt được toàn bộ các logic tài chính, tiền tệ, cấu trúc màu sắc và các tính năng đã cài đặt mà không cần bạn phải giải thích lại từ đầu.
