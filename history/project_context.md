# Share Money 💸 - Project History & Context Summary

Tài liệu này lưu trữ toàn bộ lịch sử phát triển, các quyết định kiến trúc và cấu trúc mã nguồn hiện tại của ứng dụng **Share Money** để làm ngữ cảnh (context) cho các phiên chat AI tiếp theo nhằm tiết kiệm tối đa token.

* **Thời gian:** 05-08-2026 (Rà soát bảo mật/chất lượng & Sửa 3 lỗi tính tiền)
* **Trạng thái:** `npx tsc --noEmit` **sạch hoàn toàn** (trước đó 2 lỗi ở `constants/theme.ts`); đã chặn 2 đường làm lệch sổ tiền và sửa parser số tiền. Chưa chạy thử trên thiết bị thật — xem mục "Trạng thái kiểm thử" bên dưới.
* **Mốc cùng ngày:** 05-08-2026 (Sửa lỗi thao tác trên Home, Infinite Scroll & Cập nhật deps) — nút "+" ăn thao tác ổn định, Home phân trang keyset trên `TripSummary`, deps khớp SDK 54.
* **Mốc trước đó:** 25-05-2026 (Local Build Optimization & Path Length Fix) — đã cấu hình luồng build APK local (không phụ thuộc EAS), xử lý giới hạn đường dẫn Windows 260 ký tự và lỗi biên dịch Hermes với Private properties.

---

## 📅 Cập Nhật Gần Nhất (05-08-2026) — Rà soát bảo mật/chất lượng & Sửa 3 lỗi tính tiền

### A. Kết quả rà soát bảo mật

* **Không có lỗ hổng nghiêm trọng.** Toàn bộ query trong [database.ts](../services/database.ts) đều parameterized (`?`), kể cả đoạn dựng `WHERE`/`LIMIT` động của keyset pagination → **không có SQL injection**. `.gitignore` đã chặn `*.keystore`/`*.jks`/`*.p8`/`*.pem`/`.env`; `app.json`/`eas.json` chỉ chứa `projectId` (public). ID dùng `Crypto.randomUUID()` (CSPRNG), không phải `Math.random()`.
* **3 điểm nên siết, CHƯA làm** (mức thấp–trung bình):
  1. `"scheme": "myapp"` trong [app.json](../app.json) là scheme mặc định của `create-expo-app` — app khác cài cùng máy đăng ký `myapp://` sẽ tranh deep link. Nên đổi thành `sharemoney`.
  2. Chưa set `android:allowBackup="false"`. Mặc định Android backup file SQLite tài chính lên Google Drive và cho phép `adb backup` trích xuất. Do dùng CNG (`android/` gitignore) nên phải thêm qua `expo-build-properties`.
  3. `catch { console.error(...) }` nuốt lỗi im lặng ở [summary.tsx](../app/trip/[id]/summary.tsx) (`handleShare`) và [MemberDetailModal.tsx](../components/MemberDetailModal.tsx) (`handleSave`) — user bấm Share thất bại mà không thấy phản hồi.

### B. Sửa lỗi 1: `Palette.sun[400]` không tồn tại → dark mode mất màu

* `Palette.sun` chỉ có bậc `500`/`600` nhưng `DarkColors.accent` và `DarkColors.warning` đọc `Palette.sun[400]` → **trả `undefined` lúc runtime**, làm mất màu badge thủ quỹ (`UserAvatar`), màu tiền (`ExpenseItem`), icon stat card... trên toàn bộ dark mode. Đây cũng chính là 2 lỗi `tsc` tồn đọng từ mốc trước.
* **Đã sửa** bằng cách thêm bậc `400: '#FFD522'` vào [theme.ts](../constants/theme.ts) (bước sáng hơn `500`, giữ đúng delta của thang `coral`).
* **⚠️ Ràng buộc cho lần sau:** `LightColors` được annotate `: ThemeColors` nên sai key sẽ bị bắt ngay, còn `DarkColors` thì **không thể** annotate vì chính nó là nguồn của type (`export type ThemeColors = typeof DarkColors`). Hệ quả: gõ sai một key trong `DarkColors` chỉ lộ ra khi chạy `npx tsc --noEmit`, không lộ trong editor lúc dùng. **Luôn chạy `tsc` sau khi đụng vào `DarkColors`.**

### C. Sửa lỗi 2: `parseFloat` đọc sai số tiền kiểu Việt Nam

* **Triệu chứng:** `formatCurrency` với locale `vi-VN` **hiển thị** `1.000.000 đ`, nhưng code parse lại chỉ strip dấu phẩy (`text.replace(/,/g, '')`) → user gõ lại đúng định dạng vừa thấy thì `parseFloat('1.000.000')` = **1**. Mất tiền trực tiếp, không có validation nào chặn.
* **Quyết định:** thêm `parseAmountInput(text, currencyCode)` vào [currency.ts](../utils/currency.ts) (đặt ở đây vì cần `CURRENCIES[code].decimals`, không tách module mới). Quy tắc:
  - Currency 0 chữ số thập phân (VND) → **mọi** `.`/`,` đều là dấu ngăn nghìn, strip sạch.
  - Currency có thập phân (USD) → dấu **cuối cùng** chỉ được coi là dấu thập phân khi theo sau bởi 1–2 chữ số **và** không lặp lại ở chỗ khác (nếu lặp thì nó là dấu ngăn nghìn, như `1.000.000`). Nhờ vậy cả `1,000.50` (en-US) lẫn `1.000,50` (vi-VN) đều ra `1000.5`.
  - **Giữ nguyên dấu âm**: `-5` phải trả `-5` để guard `amount <= 0` ở màn hình chặn được; nếu strip `-` thì `-5` thành `5` và bị chấp nhận.
* Áp dụng ở **cả 3** chỗ nhập tiền: [add-expense.tsx](../app/trip/[id]/add-expense.tsx), [add-payment.tsx](../app/trip/[id]/add-payment.tsx), [MemberDetailModal.tsx](../components/MemberDetailModal.tsx).
* `MemberDetailModal` trước đây không biết currency của trip → **đã thêm prop `currencyCode`** (truyền `trip.currency` từ màn detail). Thiếu prop này thì trip USD sẽ bị nuốt phần thập phân.
* **⚠️ Ràng buộc cho lần sau:** mọi ô nhập tiền mới **phải** dùng `parseAmountInput`, tuyệt đối không gọi `parseFloat` trực tiếp trên input người dùng.

### D. Sửa lỗi 3: Xóa thành viên làm lệch sổ, tất toán im lặng trả rỗng

* **Nguyên nhân gốc:** `expense_participants` có `ON DELETE CASCADE` tới `members`, nhưng cột **`expenses.paid_by` không có FK** nên bị bỏ lại thành con trỏ mồ côi. Check cũ trong `handleRemoveMember` chỉ dò `participants`, **bỏ sót `paidBy`**, và dù có cảnh báo thì nút xác nhận vẫn xóa như thường.
* **Đã kiểm chứng** (compile thật `calculator.ts` rồi chạy): trip có thủ quỹ + Bob, Alice ứng trước 300.000 cho khoản chia 3 → sau khi xóa Alice, `sum(balances) = -300.000` (đáng lẽ 0) và `calculateSettlements` trả **mảng rỗng** — màn Summary báo "không có gì cần thanh toán" trong khi cả 2 người đang nợ.
* **Quyết định kiến trúc: chặn ở tầng UI, không sửa schema.** SQLite không `ALTER TABLE` thêm FK được, mà DB trên máy user **không bao giờ bị drop** → không có đường thêm FK cho `paid_by` trên thiết bị đã cài. Vì vậy [trip/[id]/index.tsx](../app/trip/[id]/index.tsx) `handleRemoveMember` giờ **chặn cứng** (dialog 1 nút, không cho xóa) khi thành viên:
  - là participant của bất kỳ khoản chi nào, **hoặc** là `paidBy` của khoản chi nào (điều kiện mới, chính là chỗ lọt lưới), **hoặc**
  - có bất kỳ khoản đóng quỹ nào, **hoặc**
  - đang là thủ quỹ **và** trip đã thu quỹ (xóa thủ quỹ đồng thời gỡ vai trò → phần quỹ đang giữ mất chủ; đã kiểm chứng `sum(balances)` nhảy `0 → 200.000`).
* **⚠️ Ràng buộc cho lần sau:** guard này đặt ở màn hình vì `removeMember` hiện **chỉ có đúng 1 call-site**. **Nếu thêm call-site thứ 2, phải chuyển guard xuống [useTripStore.ts](../hooks/useTripStore.ts)**, nếu không lỗ hổng mở lại.
* **Đổi hành vi người dùng:** trước đây xóa thành viên đang có phát sinh là *cảnh báo rồi vẫn cho xóa*; nay là **chặn hẳn**, phải xóa khoản chi/khoản đóng quỹ trước (chuẩn Splitwise). Luồng "tạo trip rồi bớt thành viên thừa" vẫn chạy bình thường vì lúc đó chưa có phát sinh.
* Kèm theo: [ExpenseItem.tsx](../components/ExpenseItem.tsx) guard `participants.length > 0` trước khi chia — khoản chi còn 0 người tham gia (hệ quả của cascade) trước đây render ra `∞ đ`.
* **i18n:** `err_member_in_expense` đổi từ câu hỏi ("...Tiếp tục?") thành thông báo chặn; thêm key mới `err_treasurer_holds_fund`. Cả 2 locale giữ parity **170/170 key**. Nhân tiện xóa 2 `defaultValue` tiếng Việt hardcode trong hàm này (key `alert_remove_treasurer_*` vốn đã có sẵn ở cả `en.json` lẫn `vi.json`).

### E. ⚠️ Phát hiện thêm, CHƯA sửa: `paid_by` NULL làm lệch sổ

> **Đã sửa ngày 22-09-2026** qua `getFundFlow`, xem mục "Tách tiền của nhóm và tiền của thủ quỹ". `totalFundExpenses` nhắc bên dưới không còn tồn tại.

Lỗi có sẵn từ trước, **không phải do đợt sửa này tạo ra**. Đã kiểm chứng bằng code thật:

```text
Khoản chi trả từ quỹ, paid_by SET = thủ quỹ  -> sum(balances) = 0        ✓
Khoản chi trả từ quỹ, paid_by NULL           -> sum(balances) = -120.000 ✗
```

`calculateSummary` trừ thủ quỹ nguyên số quỹ đang giữ (`fundHeld`) nhưng **không ghi có** phần quỹ đã chi khi khoản chi không có `paidBy`. App hiện tại luôn ghi `paidBy` (mặc định là thủ quỹ, xem [add-expense.tsx](../app/trip/[id]/add-expense.tsx)) nên **chỉ ảnh hưởng các row cũ tạo trước khi migration thêm cột `paid_by`** — tức máy đã cài bản cũ. Fix gọn nhất: coi `!paidBy` như `paidBy === treasurerId` trong [calculator.ts](../utils/calculator.ts), đúng như [summary.tsx](../app/trip/[id]/summary.tsx) đã làm khi tính `totalFundExpenses`.

### F. Nợ kỹ thuật đã ghi nhận, CHƯA làm

* **Không có transaction:** `insertExpense`/`updateExpense`/`deleteExpense` chạy N+1 câu lệnh rời rạc → crash giữa chừng để lại khoản chi không có participant. Nên bọc `withTransactionAsync`.
* **N+1 query:** `getExpensesByTrip` chạy 1 query + 1 query/khoản chi. Trip 100 khoản = 101 round-trip.
* **Schema:** FK `trip_id` khai báo trùng 2 lần trong bảng `payments`.
* **i18n:** key `change_currency_title`/`change_currency_desc` **không tồn tại** ở cả 2 locale → user tiếng Anh thấy `defaultValue` tiếng Việt. (Key `err_remove_treasurer` là dead key có sẵn, chưa đụng tới.)
* **Hiệu năng:** [CustomHeader.tsx](../components/CustomHeader.tsx) gọi `createStyles(colors)` **5 lần mỗi render** (tạo mới 5 StyleSheet), mà component này có mặt trên mọi màn hình. `MemberDetailModal` thiếu `useMemo` cho styles.
* **11 dependency không dùng ở đâu cả** (chỉ nằm trong lockfile): `uuid`, `@types/uuid`, `react-native-webview`, `expo-web-browser`, `expo-blur`, `expo-symbols`, `expo-navigation-bar`, `@react-navigation/bottom-tabs`... `uuid` đặc biệt thừa vì code dùng `expo-crypto`.
* **Tách component:** [summary.tsx](../app/trip/[id]/summary.tsx) 688 dòng và [trip/[id]/index.tsx](../app/trip/[id]/index.tsx) 582 dòng. Ưu tiên tách: `MemberPickerSheet` (bottom-sheet chọn thành viên đang bị copy-paste gần như nguyên si giữa `add-expense` và `add-payment`) và `BottomSheet` (logic `Animated.parallel` + `showModal` giống hệt giữa `summary.tsx` và `MemberDetailModal.tsx`).
* **Chưa có test nào** cho `calculateSummary`/`calculateSettlements` — phần logic phức tạp nhất (có backtracking). Chỉ cần một assertion `sum(balances) ≈ 0` là tự bắt được cả mục D lẫn mục E ở trên.
* **Dead code:** `handleSetTreasurer` trong `trip/[id]/index.tsx` (không ai gọi), `getMemberColor` chỉ là alias của `getAvatarColor`, `scratch/test.ts` là script ad-hoc. `getAvatarColor`/`getInitials` nằm sai chỗ trong `calculator.ts` (module tính tiền không nên chứa logic UI).

### G. Trạng thái kiểm thử

* `npx tsc --noEmit`: **0 lỗi** (trước đợt này là 2). `pnpm lint`: 0 error / 22 warning — **giữ nguyên 22 cảnh báo có sẵn, không phát sinh cảnh báo mới**.
* Cách kiểm chứng logic tiền: copy `calculator.ts`/`currency.ts`/`types.ts` ra thư mục tạm, compile bằng `./node_modules/.bin/tsc` rồi chạy `node` — **chạy code thật, không mô phỏng lại**. Đã phủ: 19 case parser (gồm round trip qua chính `formatCurrency`), 4 nhánh guard xóa thành viên, và 3 kịch bản lệch sổ.
* **Chưa chạy trên thiết bị thật.** Cần kiểm: (1) gõ `1.000.000` vào ô số tiền của trip VND và `10.50` của trip USD; (2) thử xóa thành viên đã có khoản chi — phải hiện dialog chặn 1 nút; (3) bật dark mode xem badge thủ quỹ và màu tiền đã hiện đúng; (4) đổi currency của trip rồi nhập tiền xem parse đúng theo currency mới.

---

## 📅 Cập Nhật (22-09-2026) — Vuốt trái thẻ chuyến đi để xoá

Ở trang chủ, vuốt thẻ chuyến đi sang trái sẽ lộ nút Xoá màu đỏ bên phải. Đây là cách xoá duy nhất trên trang chủ, vì biểu tượng thùng rác trên thẻ đã bị bỏ. Nút gọi `onDelete`, nên vẫn qua hộp thoại xác nhận của `handleDeleteTrip`. Toàn bộ nằm trong [TripCard.tsx](../components/TripCard.tsx), chạy trên cả Android lẫn iOS.

* Tự viết bằng `Gesture.Pan()` của react-native-gesture-handler cộng `Animated` của RN. Không dùng `Swipeable`: bản cũ đã bị gỡ ở RNGH 3, còn `ReanimatedSwipeable` cần reanimated, mà dự án đã bỏ reanimated.
* Giữ RNGH `~2.28.0`, đúng bản Expo SDK 54 chốt và Expo Go 54 đóng gói sẵn phần native. Nâng lên 3.x thì Expo Go không chạy được nữa. Khi nâng Expo SDK mà bản đi kèm là 3.x, `Gesture.Pan()` vẫn còn nhưng thành API legacy, lúc đó nên chuyển sang `usePanGesture`. [SwipeBack.tsx](../components/SwipeBack.tsx) cũng cần chuyển theo.
* Mỗi lúc chỉ một thẻ được mở, nhờ biến cấp module `openedCard`. Bấm vào thẻ đang mở, hoặc vuốt nó sang phải, thì thẻ đóng lại. Kéo chưa quá nửa đường mà thả chậm thì thẻ bật về.
* Nút Xoá nằm dưới thẻ. Độ trong suốt của nút đi theo `translateX`, nên khi thẻ đóng, góc bo của thẻ không để lộ viền đỏ. `marginBottom` nằm ở khung bọc chứ không nằm ở thẻ, để nút cao đúng bằng thẻ.

---

## 📅 Cập Nhật (22-09-2026) — Vuốt từ mép trái để quay lại (Android)

Thanh điều hướng đã bị ẩn, nên Android cần một cách quay lại ngoài mũi tên trên header. [SwipeBack.tsx](../components/SwipeBack.tsx) bắt cú vuốt sang phải bắt đầu trong 32dp sát mép trái. Kéo quá 80dp, hoặc thả tay đủ nhanh, thì gọi `goBack`. Vuốt lệch lên xuống quá 20dp thì cử chỉ bị hủy, nên cuộn dọc vẫn bình thường.

* [_layout.tsx](../app/_layout.tsx) bọc mọi màn qua prop `screenLayout` của Stack. Màn nào `navigation.canGoBack()` là false, như trang chủ, thì cử chỉ tự tắt. Màn mới thêm vào Stack tự có cử chỉ này, không cần làm gì thêm.
* Chỉ chạy trên Android. iOS đã có sẵn vuốt mép (màn thường) và vuốt xuống (modal) từ native stack.
* Cử chỉ chỉ bắt ở mép chứ không phải toàn màn hình. Lý do là hàng chip cuộn ngang ở màn Tổng kết và thao tác kéo con trỏ trong ô nhập. Muốn nới vùng vuốt thì sửa `EDGE_WIDTH`.
* Không có hiệu ứng màn hình chạy theo ngón tay. Màn bên dưới của native stack không hiện ra lúc đang kéo, nên kéo theo tay chỉ để lộ nền trống. Khi đủ ngưỡng, hiệu ứng đóng màn của hệ thống sẽ chạy.

---

## 📅 Cập Nhật (22-09-2026) — Ẩn thanh điều hướng Android & sửa KeyboardAvoidingView

Thanh điều hướng của Android giờ bị ẩn trong toàn app. Bản build ẩn nó ngay lúc Activity khởi tạo, nhờ config plugin `expo-navigation-bar` với `visibility: hidden` trong [app.json](../app.json). [_layout.tsx](../app/_layout.tsx) ẩn lại mỗi khi hệ thống cho thanh hiện ra. Các trường hợp gồm vuốt cạnh dưới, bàn phím bật hoặc tắt, app quay lại foreground.

* Expo Go giữ chỗ 48dp cho thanh ở tầng cửa sổ, kể cả khi thanh đã ẩn. Bản build edge-to-edge thì không. Vì vậy `_layout.tsx` gọi thẳng `setPositionAsync('absolute')` của module native, và chỉ gọi trong Expo Go. API JS bỏ qua lệnh này vì Expo Go tự báo là đã edge-to-edge.
* `KeyboardAvoidingView` của RN 0.81 tính sai trên Android lúc bàn phím đóng. Nó lấy `screenY` của sự kiện đóng, mà giá trị này là chiều cao vùng hiển thị chứ không phải đáy màn hình. Kết quả là nút bị hở 22–70dp sau khi đóng bàn phím. [KeyboardAvoidingView.tsx](../components/KeyboardAvoidingView.tsx) cho sự kiện đóng đi theo đường của iOS, đưa khoảng co về 0. Ba màn `add-expense`, `add-payment`, `create` dùng component này thay cho bản của RN.
* ⚠️ Trên Android, đừng dùng `behavior="padding"`, cũng đừng tự chèn khoảng đệm theo chiều cao bàn phím. Cả hai đã thử trên Galaxy Note 20 chạy Android 13. Ô nhập mất focus ngay khi bàn phím mở: bàn phím vẫn hiện nhưng gõ không vào. Chỉ `behavior="height"` giữ được focus.
* Nút lúc disabled của [SubmitButton.tsx](../components/SubmitButton.tsx) đổi chữ sang `onSurfaceElevated`. Chữ trắng cũ gần như biến mất trên nền `surfaceElevated` ở chế độ sáng. Khoảng đệm đáy của nút này và của thanh nút ở màn chi tiết chuyến đi cũng giảm còn `Spacing.sm`.
* `SystemUI.setBackgroundColorAsync(colors.background)` chạy theo theme. Nó che màu cam `#FF5733` của `backgroundColor` trong app.json, màu từng lộ ra ở vùng thanh điều hướng.
* Profile `development` trong [eas.json](../eas.json) nhận cùng thiết lập `node`, `pnpm`, `env` với `preview`.
* Mọi phép thử đều chạy trong Expo Go qua `adb`. Chưa kiểm trên bản build thật.

---

## 📅 Cập Nhật (22-09-2026) — Tách tiền của nhóm và tiền của thủ quỹ

Màn Summary từng báo "Quỹ còn dư 150.113 đ" trong khi gợi ý tất toán bắt thủ quỹ chuyển 399.934 đ. Hai con số đều đúng nhưng không giải thích được cho nhau. Gốc rễ nằm ở khoản chi `paidBy = thủ quỹ`. Ô quỹ coi nó là chi từ quỹ, còn `calculateSummary` coi nó là thủ quỹ ứng tiền túi. Cột "Đã đóng" vì thế đếm cùng một khoản hai lần.

* **Quy ước mới:** thủ quỹ tiêu tiền của thành viên khác trước, hết mới dùng tiền túi. [calculator.ts](../utils/calculator.ts) có thêm `getFundFlow` trả về `received` (tiền thành viên khác đóng) và `spent` (khoản chi thủ quỹ trả, gồm cả `paidBy` NULL). Với thủ quỹ, `advancedPayments = max(0, spent − received)` là tiền túi đã ứng, `fundHeld = max(0, received − spent)` là tiền mặt của người khác còn giữ.
* `balance` của thủ quỹ **không đổi giá trị** vì `P − S − H` bằng đúng công thức cũ về mặt đại số. Tất toán chỉ đổi ở các row cũ có `paid_by` NULL, và đó chính là lỗi ở mục E, nay đã sửa.
* `debt` giờ là `totalShare − totalPaid` cho mọi thành viên, kể cả thủ quỹ. Trước đây nó bị gán cứng 0 cho thủ quỹ. Tổng cột "Còn lại" trong [SummaryTable.tsx](../components/SummaryTable.tsx) vì thế luôn bằng tiền mặt còn giữ trong quỹ.
* Thủ quỹ tự đóng quỹ cho mình (xảy ra khi đổi thủ quỹ sau khi đã thu) chỉ là chuyển tiền giữa hai túi của cùng một người. Khoản này bị loại khỏi `received` và khỏi `fundPayments` của thủ quỹ.
* Ô thủ quỹ ở [summary.tsx](../app/trip/[id]/summary.tsx) chia hai phần "Tiền của nhóm" và "Tiền của thủ quỹ". Dòng cuối là `−balance` nên luôn khớp gợi ý tất toán. Modal chi tiết của thủ quỹ cũng hiển thị `−balance` thay cho `debt`.
* **i18n:** bỏ `fund_collected`, `fund_spent`, `fund_surplus`, `fund_deficit`, `legend_owes`, `legend_refunds`. Thêm 11 key `fund_*`/`legend_*` mới. Cả 3 locale (vi/en/fr) giữ parity 179/179 key.
* **⚠️ Ràng buộc cho lần sau:** mọi chỗ cần biết "khoản chi nào là chi từ quỹ" phải gọi `getFundFlow`, đừng tự viết lại điều kiện `!paidBy || paidBy === treasurerId`.

---

## 📅 Cập Nhật (22-09-2026) — Khoá đơn vị tiền tệ sau khi tạo chuyến đi

Đơn vị tiền tệ chỉ chọn được ở [create.tsx](../app/trip/create.tsx). Sau đó không đổi được nữa. Lý do: đổi VND sang USD chỉ đổi cách hiển thị, các số đã nhập giữ nguyên nên `1.000.000` VND thành `1.000.000` USD và sổ sách sai hoàn toàn.

* Đã xoá `handleChangeCurrency` ở màn detail, `updateTripCurrency` trong [useTripStore.ts](../hooks/useTripStore.ts) và [database.ts](../services/database.ts).
* Nút đổi ở header nay là badge tĩnh hiển thị mã tiền tệ.
* Hai key i18n `change_currency_*` từng thiếu ở cả 2 locale nên không còn tồn tại nữa, mục nợ kỹ thuật tương ứng ở phần F bên dưới đã hết hiệu lực.

---

## 📅 Cập Nhật (05-08-2026) — Home, Infinite Scroll & Deps

### A. Sửa lỗi "nhấn + tạo chuyến đi nhiều lần không được"

Triệu chứng do nhiều nguyên nhân cộng dồn, đã xử lý cả 4:

1. **Chống double-tap** ([app/index.tsx](../app/index.tsx)): `router.push('/trip/create')` không dedupe, nhấn nhanh 2 lần sẽ chồng 2 modal `create`; sau khi `router.replace` sang trip detail thì bấm back lại rơi vào form create rỗng. Đã khoá bằng `isNavigatingRef`, mở lại trong `useFocusEffect`. `TripCard` dùng chung khoá này qua `handleOpenTrip`.
2. **Giữ FAB luôn mount**: `if (isLoading)` return spinner toàn màn hình + `loadTrips()` chạy mỗi lần focus → FAB bị unmount và nuốt thao tác chạm sau mỗi lần quay về Home. Nay chỉ chiếm màn hình ở lần load đầu (`isLoadingSummaries && !hasLoadedOnce`).
3. **`ScalePressable`** ([components/ScalePressable.tsx](../components/ScalePressable.tsx)): `style` được áp lên `Animated.View` con nên `Pressable` bọc ngoài co về cao 0px với style `position: 'absolute'` (FAB) — vùng chạm chỉ còn sống nhờ `overflowInset` của Fabric. Đã đổi sang `Animated.createAnimatedComponent(Pressable)` để style + transform nằm chung một view. **Lưu ý khi thêm nút mới**: style layout phải nằm trên chính `Pressable`, đừng bọc thêm view con.
4. **`getDatabase()`** ([services/database.ts](../services/database.ts)): cache promise thay vì instance, tránh mở 2 connection và chạy `initTables` song song lúc khởi động (nguy cơ "database is locked"). Lỗi mở DB sẽ reset cache để lần gọi sau thử lại được.

### B. Infinite scroll cho danh sách Home

* **Quyết định kiến trúc:** Home **không còn hydrate full `Trip`**. Danh sách chạy trên `TripSummary` ([utils/types.ts](../utils/types.ts) — `memberCount`, `expenseCount`, `totalExpense`, `treasurerName`...) do SQL aggregate trả về, phân trang keyset 20 dòng/trang.
* **[services/database.ts](../services/database.ts)**:
  - `getTripSummaries({ limit, cursor })`: subquery COUNT/SUM/tên thủ quỹ ngay trong SQL, không kéo members/expenses/payments vào RAM. Bỏ `limit` = lấy toàn bộ.
  - Phân trang **keyset** `WHERE (created_at < ? OR (created_at = ? AND id < ?))` + `ORDER BY created_at DESC, id DESC`. Dùng keyset thay OFFSET vì OFFSET sẽ nhảy cóc mất dòng khi user xoá chuyến đi giữa 2 trang; `id` làm tie-break vì `created_at = Date.now()` không unique.
  - `getTripCounts()`: tổng/đang hoạt động cho phần thống kê trong menu (danh sách chỉ nạp 1 phần nên không đếm từ mảng được nữa).
  - **Đã xoá `getAllTrips`** (và helper `groupBy` gom N+1 làm trong cùng ngày) vì không còn ai gọi. `getTripById` + các `get*ByTrip` giữ nguyên cho màn detail.
* **[hooks/useTripStore.ts](../hooks/useTripStore.ts)**:
  - State mới: `tripSummaries`, `tripCounts`, `hasMoreSummaries`, `isLoadingSummaries`, `isLoadingMoreSummaries`. Đã bỏ `loadTrips`/`isLoading`.
  - `loadTripSummaries(limit | 'all')` nạp lại từ đầu, `loadMoreSummaries()` nối thêm 1 trang (`SUMMARY_PAGE_SIZE = 20`). Guard chống `onEndReached` bắn liên tục, và chống race khi focus-refresh thay danh sách giữa lúc đang nạp trang (so khớp phần tử cuối trước khi nối).
  - **`loadTrip` đổi thành upsert**: trước đây dùng `.map()` nên chỉ thay entry đã có; khi Home thôi nạp full trip thì `trips` rỗng và màn detail sẽ trắng. **Mọi thay đổi sau này khiến Home không nạp full `Trip` đều phải giữ ràng buộc này.**
  - `createTrip` thôi gọi `loadTrips()` — màn detail tự hydrate qua `loadTrip`, Home tự refresh summary khi focus.
* **[app/index.tsx](../app/index.tsx)**: `onEndReached` + `ListFooterComponent` spinner; focus refresh nạp lại `Math.max(20, số dòng đang mở)` để không co về trang 1 (đọc số dòng bằng `useTripStore.getState()`, nếu đưa vào dependency thì effect tự kích hoạt bằng chính kết quả của nó); `AnimatedListItem` cap delay `Math.min(index, 5) * 100` (không cap thì dòng thứ 20 phải chờ 2 giây).
* **Tìm kiếm vẫn lọc in-memory:** SQLite `LIKE`/`LOWER` chỉ fold case ASCII, gõ "đà lạt" sẽ không khớp "Đà Lạt". Nên khi bật ô tìm kiếm, store nạp `'all'` summary một lần rồi lọc bằng `toLowerCase()` như cũ; xoá ô tìm kiếm thì quay lại 1 trang. **Đừng chuyển search xuống SQL** nếu chưa có cột name đã chuẩn hoá dấu.

### C. Cập nhật dependencies (trong SDK 54)

* Chạy `npx expo install --fix`, đưa 4 gói về đúng bản SDK 54 mong đợi: `expo` 54.0.34 → `~54.0.36`, `expo-font` → `~14.0.12`, `expo-localization` → `~17.0.9`, `expo-router` → `~6.0.24`. Sau đó `expo install --check` báo "Dependencies are up to date".
* Lệnh này tự thêm `"expo-font"` vào mảng `plugins` của [app.json](../app.json) (SDK 54.x yêu cầu config plugin cho gói này). Hiện **không file nguồn nào import `expo-font`** — gói đi kèm từ template Expo.
* **Chưa nâng lên SDK 57.** Cột "latest" của `pnpm outdated` đang trỏ về SDK 57 (react-native 0.86, gesture-handler 3.x, TypeScript 7.x, jest 30) — đó là một đợt migration riêng, không phải bump version thông thường. Đặc biệt lưu ý nếu làm: `react-native-gesture-handler` 2 → 3 là major, và dự án đã từng gỡ `react-native-reanimated` vì crash TurboModule trên RN 0.81.

### D. Trạng thái kiểm thử

* Đã chạy: `npx tsc --noEmit` (chỉ còn 2 lỗi có sẵn ở `constants/theme.ts`), `pnpm lint` (0 error / 22 warning — đều là cảnh báo có từ trước).
* Đã kiểm chứng riêng SQL phân trang trên `sqlite3` với schema thật, 25 chuyến đi trong đó 2 chuyến trùng `created_at`: 2 trang phủ đúng 25 dòng, không trùng không sót, aggregate và ca "chuyến đi chưa có chi tiêu" đều đúng.
* **Chưa chạy trên thiết bị thật.** Cần kiểm: (1) cuộn quá 20 chuyến đi; (2) tìm kiếm chữ thường có dấu; (3) sửa chi tiêu ở trang 2 rồi back về Home xem card cập nhật và số trang đang mở có giữ nguyên; (4) xoá chuyến đi xem thống kê trong menu giảm đúng.

---

## 📅 Cập Nhật (24-05-2026)
* **Thời gian:** 24-05-2026 (Quản lý Thành viên, Tất toán Tập trung & Chia sẻ Ảnh)
* **Trạng thái:** Hoàn thiện luồng tạo chuyến đi nhanh, hệ thống quản lý thành viên nâng cao, đa dạng hóa chiến lược tất toán và tích hợp tính năng xuất ảnh JPEG. Đã chuyển đổi sang `Animated` chuẩn để ổn định hệ thống.

---

## 🎯 Tổng Quan Dự Án & Các Tính Năng Đã Triển Khai

1. **Kiến trúc & Lưu trữ**:
   - Chạy offline bằng `expo-sqlite`.
   - Quản lý state bằng `Zustand` ([useTripStore.ts](../hooks/useTripStore.ts)).
   - Hỗ trợ **New Architecture** (đã cấu hình `GestureHandlerRootView` và các plugin cần thiết).

2. **Cấu hình Local Build**:
   - **Hoisted Node Linker**: `nodeLinker: hoisted` để làm phẳng thư mục `node_modules`, tránh lỗi "Path too long" (260 ký tự) trên Windows khi biên dịch C++ (CMake/Ninja). **Cấu hình này nay nằm ở [pnpm-workspace.yaml](../pnpm-workspace.yaml)**, xem mục 7.
   - **Babel Fix**: Đồng bộ `babel-preset-expo` về phiên bản tương thích với Expo SDK 54 để hỗ trợ biên dịch Hermes (xử lý Private Class Fields).
   - **Lệnh Build**: `cd android; .\gradlew assembleRelease` để tạo APK local.

3. **Hệ thống Quản lý Thành viên & Tạo Chuyến đi (Mới)**:
   - **Tạo nhanh**: Cho phép tạo chuyến đi bằng cách nhập số lượng người. Tên tự động là "User 1", "User 2"...
   - **MemberDetailModal**: Popup quản lý chi tiết từng người (Đổi tên, chỉ định Thủ quỹ, đóng quỹ nhanh).
   - **Cập nhật Database**: Bổ sung hàm `updateMemberName` và logic đồng bộ hóa state khi thay đổi thông tin thành viên.

4. **Thuật toán Tất toán Nâng cao (Mới)**:
   - **Chiến lược Tối ưu (Optimal)**: Sử dụng Greedy + Subset Sum để giảm thiểu số lượng giao dịch.
   - **Chiến lược Tập trung (Centralized)**: Dồn toàn bộ nợ về một **Người trung gian** (mặc định là Thủ quỹ) để gom tiền và chia lại.
   - **Tính minh bạch**: Hiển thị chi tiết từng khoản "Tiền tự chi trả" (Advanced Items) kèm mô tả trong bảng tổng kết cá nhân.

5. **Tính năng Chia sẻ & Xuất bản (Mới)**:
   - **JPEG Export**: Sử dụng `react-native-view-shot` để chụp lại bảng gợi ý tất toán.
   - **Native Sharing**: Tích hợp `expo-sharing` để gửi ảnh qua các ứng dụng chat (Zalo, Messenger...).

6. **Hoàn thiện UI/UX & Hiệu ứng**:
   - **Standard Animated API**: Đã thay thế `react-native-reanimated` bằng bộ thư viện `Animated` chuẩn của React Native để khắc phục lỗi TurboModule (`installTurboModule`) và đảm bảo tính ổn định tuyệt đối trên RN 0.81.
   - **Spring & Fade**: Hiệu ứng popup trượt dưới lên (Spring) và mờ nền (Fade) mượt mà, chuyên nghiệp.
   - **Cải tiến Định tuyến**: Xử lý lỗi `Unmatched Route` bằng cách chuẩn hóa lệnh `router.replace` và `router.dismissAll()`.

7. **Cấu hình Hệ thống & Môi trường**:
   - **Package manager: pnpm 11**, ghim bằng field `packageManager` trong `package.json` (Corepack cưỡng chế; pnpm 11 cần Node 22+).
   - **Toàn bộ cấu hình pnpm nằm ở [pnpm-workspace.yaml](../pnpm-workspace.yaml)** — pnpm 11 chỉ còn đọc auth/registry từ `.npmrc` nên file đó **đã bị xoá**. Lịch sử trước đây (`.pnpmrc` → `.npmrc` → hiện tại) không còn áp dụng.
   - `nodeLinker: hoisted`: bắt buộc, đừng đổi về isolated linker mặc định (vỡ build C++ trên Windows).
   - `allowBuilds`: pnpm chặn script build của dependency theo mặc định và `strictDepBuilds` biến script chưa duyệt thành lỗi cài đặt cứng — **mọi dependency mới có postinstall đều phải khai báo ở đây** (`unrs-resolver` là tiền lệ).
   - Chuẩn hóa các plugin trong `app.json` và `babel.config.js`.

---

## 🛠️ Cấu Trúc File & Mã Nguồn Quan Trọng

- **[calculator.ts](../utils/calculator.ts)**: Chứa logic tính toán tất toán tối ưu và tập trung.
- **[currency.ts](../utils/currency.ts)**: Nguồn duy nhất cho tiền tệ theo từng chuyến đi — `CURRENCIES`, `formatCurrency`, `roundCurrency` và **`parseAmountInput`** (bắt buộc dùng cho mọi ô nhập tiền, đừng `parseFloat` trực tiếp).
- **[MemberDetailModal.tsx](../components/MemberDetailModal.tsx)**: Trung tâm điều khiển thông tin thành viên. Cần prop `currencyCode` để parse số tiền đóng quỹ đúng theo currency của chuyến đi.
- **[summary.tsx](../app/trip/[id]/summary.tsx)**: Trang tổng kết với bộ chọn chiến lược tất toán và tính năng chia sẻ ảnh.
- **[create.tsx](../app/trip/create.tsx)**: Luồng tạo chuyến đi tối giản.
- **[database.ts](../services/database.ts)**: Quản lý SQLite và các thao tác CRUD thành viên/chi tiêu. Hai lối đọc tách biệt: `getTripSummaries`/`getTripCounts` (danh sách Home, phân trang, chỉ aggregate) và `getTripById` (hydrate đầy đủ 1 chuyến đi cho màn detail).
- **[useTripStore.ts](../hooks/useTripStore.ts)**: Zustand store. `trips` là các chuyến đi đã hydrate (detail), `tripSummaries` là trang đang hiển thị ở Home — hai nguồn khác nhau, đừng trộn.
- **[index.tsx](../app/index.tsx)**: Danh sách Home với infinite scroll, tìm kiếm in-memory và khoá chống double-tap điều hướng.
- **[ScalePressable.tsx](../components/ScalePressable.tsx)**: Nút bấm có hiệu ứng scale dùng chung; style layout phải nằm trên chính `Pressable`.

---

## ⚠️ Cách Tiếp Tục Session (Dành cho User)

Để tiếp tục dự án trong một phiên chat mới, bạn chỉ cần gửi yêu cầu:
> "Đọc file history/project_context.md để tiếp tục dự án"

AI sẽ ngay lập tức nắm bắt được toàn bộ các logic tài chính, thành viên, và các tính năng xuất bản đã cài đặt mà không cần giải thích lại.
