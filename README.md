# Share Money 💸 - Ứng dụng Chia tiền Chuyến đi & Quản lý Chi tiêu Nhóm

Ứng dụng di động được xây dựng bằng **React Native** & **Expo SDK 50+**, thiết kế để giúp các nhóm bạn bè dễ dàng ghi chép chi tiêu, đóng góp quỹ và tự động tính toán số tiền cần thanh toán/hoàn trả một cách minh bạch, nhanh chóng.

## 🚀 Các Tính Nổi Bật

- **Quản lý Chuyến đi**: Tạo mới chuyến đi với danh sách thành viên linh hoạt. Hỗ trợ chỉ định/thay đổi Thủ quỹ nhóm.
- **Thuật toán Tất toán Tối ưu**: Sử dụng phương pháp **Net Balance** (Tổng số dư nhóm luôn bằng 0) để đưa ra gợi ý "Ai chuyển tiền cho ai" một cách chính xác và tối giản nhất.
- **Tách bạch Dòng tiền**: Phân biệt rõ ràng giữa **Tiền đóng quỹ** (nộp cho Thủ quỹ) và **Tiền tự chi trả** (trả trực tiếp cho nhóm) để minh bạch hóa mọi khoản đóng góp.
- **Hệ thống Avatar Động**: Tự động tạo Avatar dựa trên chữ cái đầu của tên thành viên với màu sắc định danh riêng biệt (Hash-based).
- **Giao diện Trực quan (Semantic UI)**: Hệ thống màu sắc được thiết kế theo cấp độ ưu tiên (Primary/Secondary) với độ tương phản cao chuẩn WCAG.
- **Bản địa hóa (Localization)**: Hỗ trợ song ngữ đầy đủ Tiếng Việt & Tiếng Anh qua `react-i18next`.
- **Hỗ trợ Dark Mode / Light Mode**: Tự động chuyển đổi giao diện mượt mà theo cấu hình hệ thống hoặc lựa chọn người dùng.
- **Offline First**: Lưu trữ dữ liệu an toàn ngay trên thiết bị của bạn bằng SQLite.

---

## 🛠️ Công Nghệ Sử Dụng

- **Core**: React Native 0.81+, Expo SDK 54 (Expo Router v4). Kích hoạt **New Architecture** mặc định.
- **Database**: `expo-sqlite` (Offline First, hỗ trợ Web qua WebAssembly `.wasm`).
- **State Management**: `Zustand` (Gọn nhẹ, hiệu năng cực cao).
- **Localization**: `i18next` & `react-i18next` quản lý đa ngôn ngữ.
- **Giao diện & Animation**: Vanilla CSS/StyleSheet, `react-native-reanimated` v4 (tối ưu UI Thread).
- **Icons**: `@expo/vector-icons` (Ionicons).
- **Safe Area**: `react-native-safe-area-context` xử lý tối ưu tai thỏ (Notch) & thanh Home Indicator.

---

## 📦 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 📋 Yêu cầu hệ thống
- Đã cài đặt **Node.js** (Khuyên dùng v18 hoặc mới hơn).
- Đã cài đặt **Expo Go** trên điện thoại (để test nhanh) hoặc setup sẵn Android Studio / Xcode (để chạy giả lập).

### ⚙️ Các bước thực hiện

1. **Clone dự án về máy tính:**
   ```bash
   git clone <URL_REPOS_CUA_BAN>
   cd share_money
   ```

2. **Cài đặt các thư viện phụ thuộc (dependencies):**
   ```bash
   npm install
   ```

3. **Chạy server phát triển (Metro Bundler):**
   ```bash
   npx expo start -c
   ```

4. **Trải nghiệm ứng dụng:**
   - Quét mã QR hiển thị trên Terminal bằng camera điện thoại (iOS) hoặc ứng dụng **Expo Go** (Android).
   - Nhấn `a` để mở trên giả lập Android.
   - Nhấn `i` để mở trên giả lập iOS (Mac).

### 🛠️ Đóng gói ứng dụng (Build APK)
Dự án đã được cấu hình sẵn môi trường EAS (định dạng UTF-8, cấu hình Metro) để build APK dễ dàng. Bạn chỉ cần chạy lệnh sau và đợi nhận file APK:
```bash
npx eas build -p android --profile preview
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
share_money/
├── app/                  # Các màn hình chính (Expo Router)
│   ├── _layout.tsx       # Root layout & các Provider (i18n, Dialog, Theme...)
│   ├── index.tsx         # Màn hình danh sách chuyến đi (Home)
│   ├── settings.tsx      # Màn hình cấu hình (Ngôn ngữ, Giao diện)
│   └── trip/             # Các màn hình chi tiết & nghiệp vụ chuyến đi
│       ├── create.tsx    # Màn hình tạo mới chuyến đi & chọn Thủ quỹ
│       └── [id]/         # Chi tiết một chuyến đi cụ thể
│           ├── index.tsx # Màn hình quản lý Chi tiêu / Đóng quỹ / Thành viên
│           ├── add-expense.tsx  # Thêm/sửa khoản chi tiêu chung
│           ├── add-payment.tsx  # Thêm/sửa khoản đóng quỹ cho Thủ quỹ
│           └── summary.tsx      # Trang tổng kết dòng tiền & gợi ý trả nợ
├── components/           # Các Component dùng chung (TripCard, CustomHeader, MemberSelector...)
├── constants/            # Định nghĩa màu sắc (Theme), Spacing, Typography
├── hooks/                # Custom hooks & State stores (useTripStore, useAppTheme...)
├── locales/              # File bản dịch ngôn ngữ (vi.json, en.json)
└── utils/                # Các helper, kiểu dữ liệu (Types) & thuật toán chia tiền
```

---

## 🔒 Quy Tắc Hiệu Năng & Code Standard
Dự án tuân thủ nghiêm ngặt các tiêu chuẩn hiệu năng cao:
- **Design System**: Sử dụng **Semantic Colors** (`onPrimary`, `onSurface`...) để quản lý giao diện tập trung và dễ bảo trì.
- **Toán học Tài chính**: Thuật toán tính toán nợ dựa trên số dư ròng (**Net Balance**), đảm bảo tính chính xác tuyệt đối ngay cả trong các case phức tạp (Thủ quỹ cầm quỹ, Thủ quỹ tham gia chi tiêu do người khác trả...).
- **60fps UI**: Nhắm mục tiêu mượt mà ngay cả trên máy cấu hình thấp. Sử dụng tối đa `React.memo`, `useMemo`, và `useCallback`.
- **Offline First**: Đảm bảo trải nghiệm không gián đoạn với SQLite.

---

## 📝 Bản quyền & Giấy phép
Dự án được phân phối dưới giấy phép **MIT License**.
