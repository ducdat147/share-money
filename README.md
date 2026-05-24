# Share Money 💸 - Trip Expense Splitter & Group Expense Manager

A mobile application built with **React Native** & **Expo SDK 54**, designed to help groups of friends easily record expenses, contribute to a shared fund, and automatically calculate the most simplified settlements (who owes whom how much) in a transparent and quick manner.

---

## 🚀 Features

- **Trip Management**: Create trips quickly by entering the number of members. Names like "User 1", "User 2" are generated automatically.
- **Member Customization**: Update member names, assign a **Treasurer**, and add quick fund contributions through a dedicated **Member Detail Modal**.
- **Trip-specific Currency**: Configure currency (`VND` or `USD`) per trip with interactive switching in the trip header.
- **Advanced Settlement Strategies**:
  - **Optimal (Default)**: Minimizes the number of transactions using a Greedy + Subset Sum solver.
  - **Centralized**: Routes all debts through a designated **Middleman** (usually the Treasurer) for organized collection and redistribution.
- **Shareable Results**: Export the settlement transaction list as a high-quality **JPEG image** to share via Zalo, Messenger, or other apps.
- **Symmetric Rounding System**: 
  - Uses high-precision math during intermediate calculations to avoid division anomalies.
  - Implements symmetric rounding half away from zero to ensure correct presentation for both debts and refunds.
- **Detailed Breakdowns**: The summary screen provides a per-member list of "Directly Paid" (advanced) expenses for full transparency.
- **Dynamic Avatar System**: Generates unique initials-based avatars with deterministic colors based on member names.
- **Semantic UI & Dark Mode**: Modern color palette following WCAG contrast guidelines with automatic light/dark mode switching.
- **Offline First**: Stores data securely on your local device using SQLite.

---

## 🛠️ Technology Stack

- **Core**: React Native 0.81+, Expo SDK 54 (Expo Router v4). **New Architecture** is supported.
- **Database**: `expo-sqlite` (Offline First).
- **State Management**: `Zustand`.
- **Localization**: `i18next` & `react-i18next`.
- **Animations**: Standard React Native **Animated API** (optimized for stability and 60fps).
- **Utilities**: `react-native-view-shot` for image capture, `expo-sharing` for native sharing.
- **Icons**: `@expo/vector-icons` (Ionicons).

---

## 📦 Getting Started & Local Development

### 📋 Prerequisites
- **Node.js** (v18 or newer recommended).
- **pnpm** (preferred) or npm.
- **Expo Go** app installed on your physical device, or a set-up emulator.

### ⚙️ Installation & Running

1. **Clone the repository:**
   ```bash
   git clone git@github.com:ducdat147/share-money.git
   cd share_money
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the Metro Bundler:**
   ```bash
   npx expo start -c
   ```

---

## 🛠️ Android & iOS Build Guide

The project is pre-configured with **Expo Application Services (EAS)** configuration in `eas.json` for cloud builds. You can also build binaries locally.

### Prerequisites for EAS Build
1. Install EAS CLI globally: `npm install -g eas-cli`
2. Log in to your Expo account: `eas login`
3. Initialize project: `eas project:init` (if not configured)

### 🤖 Android Builds
- **Cloud Build (Recommended):**
  - APK for testing: `eas build -p android --profile preview`
  - AAB for Store: `eas build -p android --profile production`
- **Local Build:**
  1. `npx expo prebuild --platform android`
  2. `npx expo run:android`

### 🍎 iOS Builds
- **Cloud Build (Recommended):**
  - Simulator build: `eas build -p ios --profile preview-simulator`
  - Ad-Hoc build: `eas build -p ios --profile preview`
  - IPA for Store: `eas build -p ios --profile production`
- **Local Build:**
  1. `npx expo prebuild --platform ios`
  2. `npx expo run:ios`

---

## 📁 Project Structure

```text
share_money/
├── app/                  # Application screens & routing (Expo Router)
│   ├── _layout.tsx       # Root layout & providers
│   ├── index.tsx         # Home screen (Trip List)
│   └── trip/             # Trip workflow
│       ├── create.tsx    # Fast trip creation (Member count based)
│       └── [id]/         # Trip details & Summary
├── components/           # Reusable UI (Modals, Avatars, Cards)
├── constants/            # Design System (theme.ts)
├── hooks/                # Zustand stores & Theme hooks
├── locales/              # Translation files (vi.json, en.json)
└── utils/                # Calculator logic & Currency helpers
```

---

## 🔒 Code Standards & High Performance

- **Design Consistency**: Utilizes **Semantic Colors** from [theme.ts](./constants/theme.ts).
- **Symmetric Currency Accuracy**: Keeps calculation float errors in check using `roundCurrency` with symmetric zero-point rounding.
- **Targeting 60fps**: Prioritizes Functional Components with memoization (`React.memo`, `useMemo`, `useCallback`) to reduce rendering overhead.

---

## 📝 License

This project is open-source and distributed under the **MIT License**.
