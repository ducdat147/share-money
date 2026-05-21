# Share Money 💸 - Trip Expense Splitter & Group Expense Manager

A mobile application built with **React Native** & **Expo SDK 50+**, designed to help groups of friends easily record expenses, contribute to a shared fund, and automatically calculate the most simplified settlements (who owes whom how much) in a transparent and quick manner.

---

## 🚀 Features

- **Trip Management**: Create trips with custom member lists. Easily set or unset the group Treasurer.
- **Trip-specific Currency**: Configure currency (`VND` or `USD`) per trip with interactive switching in the trip header.
- **Symmetric Rounding System**: 
  - Uses high-precision math during intermediate calculations to avoid division anomalies.
  - Formats and rounds amounts only at presentation boundaries.
  - Implements symmetric rounding half away from zero (using `Math.sign` and `Number.EPSILON`) to ensure correct presentation for negative amounts (debts) and positive amounts (refunds).
- **Optimized Settlement Algorithm**: Uses the **Net Balance Approach** (where the sum of all member balances is always 0) combined with a greedy/subset-sum transaction solver in [calculator.ts](../utils/calculator.ts) to minimize the number of transactions needed to settle up.
- **Split Fund and Direct Payments**: Clearly distinguishes between **Fund Contributions** (deposits made to the Treasurer) and **Advanced Payments** (expenses paid directly for the group) to maintain transparency.
- **Dynamic Avatar System**: Generates unique initials-based avatars with deterministic colors based on member names (hash-based).
- **Semantic UI & Dark Mode**:
  - Color palette organized by priorities (Primary/Secondary) following WCAG contrast guidelines.
  - Supports automatic light/dark mode switching based on system preferences or manual selections.
- **Offline First**: Stores data securely on your local device using SQLite database.
- **Localization**: Supports English and Vietnamese out of the box using `react-i18next`.

---

## 🛠️ Technology Stack

- **Core**: React Native 0.81+, Expo SDK 54 (Expo Router v4). **New Architecture** is enabled by default.
- **Database**: `expo-sqlite` (Offline First, supports Web via WebAssembly `.wasm`).
- **State Management**: `Zustand` (lightweight, high-performance).
- **Localization**: `i18next` & `react-i18next` for translation management.
- **UI & Animations**: Vanilla React Native StyleSheet, `react-native-reanimated` v4 (running calculations on UI Thread).
- **Icons**: `@expo/vector-icons` (Ionicons).
- **Safe Area**: `react-native-safe-area-context` for notch & home indicator padding handling.

---

## 📦 Getting Started & Local Development

### 📋 Prerequisites
- **Node.js** (v18 or newer recommended).
- **Expo Go** app installed on your physical device, or a set-up emulator (Android Studio / Xcode).

### ⚙️ Installation & Running

1. **Clone the repository:**
   ```bash
   git clone git@github.com:ducdat147/share-money.git
   cd share_money
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Metro Bundler development server:**
   ```bash
   npx expo start -c
   ```

4. **Run on devices/emulators:**
   - Scan the QR code in the terminal using the Expo Go app (Android) or default Camera app (iOS).
   - Press `a` to run on Android Emulator.
   - Press `i` to run on iOS Simulator (macOS only).

---

## 🛠️ Android & iOS Build Guide

The project is pre-configured with **Expo Application Services (EAS)** configuration in `eas.json` for cloud builds. You can also build binaries locally.

### Prerequisites for EAS Build
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Initialize the project with EAS (if not configured):
   ```bash
   eas project:init
   ```

---

### 🤖 Android Builds

#### Option 1: Cloud Build with EAS (Recommended)
- **Generate APK for testing (Preview profile):**
  ```bash
  eas build -p android --profile preview
  ```
  *This builds an `.apk` file that can be side-loaded and installed on any Android device.*
  
- **Generate AAB for Google Play Store (Production profile):**
  ```bash
  eas build -p android --profile production
  ```
  *This produces an `.aab` file ready for submission to the Google Play Console.*

#### Option 2: Local Native Build
1. Generate native `android/` directory:
   ```bash
   npx expo prebuild --platform android
   ```
2. Build and run the app locally using Android SDK:
   ```bash
   npx expo run:android
   ```
3. Assemble the release build manually:
   ```bash
   cd android && ./gradlew assembleRelease
   ```
   *The output APK will be located under `android/app/build/outputs/apk/release/app-release.apk`.*

---

### 🍎 iOS Builds

> [!NOTE]
> Building for iOS requires a macOS machine and an active Apple Developer account for App Store distribution.

#### Option 1: Cloud Build with EAS (Recommended)
- **Generate Simulator build (for testing on Mac simulators):**
  ```bash
  eas build -p ios --profile preview-simulator
  ```
  *Produces a `.tar.gz` bundle containing the `.app` package which can be dragged and dropped directly onto your iOS Simulator.*

- **Generate Ad-Hoc / Internal distribution build (for registered test devices):**
  ```bash
  eas build -p ios --profile preview
  ```
  *Requires registering test device UDIDs through Apple Developer portal.*

- **Generate IPA for App Store (Production profile):**
  ```bash
  eas build -p ios --profile production
  ```
  *Produces a signed `.ipa` file ready to submit to TestFlight / App Store.*

#### Option 2: Local Native Build
1. Generate native `ios/` directory & install Cocoapods:
   ```bash
   npx expo prebuild --platform ios
   ```
2. Build and run the app locally using Xcode:
   ```bash
   npx expo run:ios
   ```

---

## 📁 Project Structure

```text
share_money/
├── app/                  # Application screens & routing (Expo Router)
│   ├── _layout.tsx       # Root layout & providers (i18n, Dialog, Theme...)
│   ├── index.tsx         # Home screen (Trip List)
│   ├── settings.tsx      # Settings screen (Language, Theme)
│   └── trip/             # Trip workflow sub-screens
│       ├── create.tsx    # Create a trip & assign Treasurer
│       └── [id]/         # Trip details workspace
│           ├── index.tsx # Overview dashboard (Expenses, Payments, Members)
│           ├── add-expense.tsx  # Add or edit group shared expenses
│           ├── add-payment.tsx  # Add or edit treasurer fund payments
│           └── summary.tsx      # Settle-up screen & transaction recommendations
├── components/           # Reusable UI components (CustomHeader, MemberSelector, TripCard...)
├── constants/            # Style variables (theme.ts, colors, spacing, typography)
├── hooks/                # Custom hooks & stores (useTripStore, useAppTheme...)
├── locales/              # i18n localization translation JSON files (vi.json, en.json)
└── utils/                # Helper functions, type definitions, and calculators
```

---

## 🔒 Code Standards & High Performance

- **Design Consistency**: Utilizes **Semantic Colors** (`onPrimary`, `onSurface`...) in [theme.ts](../constants/theme.ts) to provide centralized palette configurations.
- **Symmetric Currency Accuracy**: Formats amounts correctly per trip's currency. Keeps calculation float errors in check using `roundCurrency` with symmetric zero-point rounding.
- **Targeting 60fps**: Prioritizes Functional Components with memoization (`React.memo`, `useMemo`, `useCallback`) to reduce rendering overhead.
- **Optimized Lists**: Replaces standard scroll maps with virtualized listings where appropriate to prevent memory footprint bloat.

---

## 📝 License

This project is open-source and distributed under the **MIT License**.
