# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Share Money — an offline-first Expo/React Native app (SDK 54, New Architecture, Expo Router v6) that splits trip expenses among a group and computes who-owes-whom settlements. All data lives in on-device SQLite; there is no backend.

## Commands

Package manager is **pnpm 11**, pinned via the `packageManager` field in `package.json` (Corepack enforces it; pnpm 11 needs Node 22+). All pnpm settings live in `pnpm-workspace.yaml` — pnpm 11 reads only auth/registry settings from `.npmrc`, so that file is gone. Two settings matter:

- `nodeLinker: hoisted` — required so native C++ builds don't hit the Windows 260-char path limit; do not switch to the default isolated linker.
- `allowBuilds` — pnpm blocks dependency build scripts by default and `strictDepBuilds` makes an unapproved one a hard install error, so any new dependency with a postinstall must be added here (`unrs-resolver` is the precedent).

```bash
pnpm install
npx expo start -c          # Metro with cleared cache (preferred over `pnpm start`)
pnpm lint                  # expo lint (eslint-config-expo flat config)
pnpm test                  # jest --watchAll, jest-expo preset
npx jest path/to/file.test.ts -t "case name"   # single test / single case
npx tsc --noEmit           # typecheck (strict mode is on)
```

There are currently **no test files**; `scratch/test.ts` is an ad-hoc script, not a Jest test.

Builds (`android/` and `ios/` are gitignored — Continuous Native Generation):

```bash
eas build -p android --profile preview      # APK
eas build -p ios --profile preview-simulator
npx expo prebuild --platform android && npx expo run:android   # local
```

Path alias `@/*` maps to the repo root; import with `@/utils/...`, `@/components/...`.

## Architecture

### Data flow: SQLite → Zustand → screens

`services/database.ts` is the only module that touches SQLite. It exports coarse-grained reads that **fully hydrate** a trip (members + expenses + payments in one `Trip` object) and thin CRUD writes. Column names are `snake_case` in SQL and mapped to `camelCase` domain types at this boundary — screens never see raw rows.

`hooks/useTripStore.ts` (Zustand) is the single store for trip data. Every mutation follows the same shape: write to the DB, then `await get().loadTrip(tripId)` to re-read and replace that trip in state. State is never patched optimistically (only `deleteTrip` filters locally). Follow this pattern for new mutations — screens rely on the store being the fresh mirror of the DB.

Screens read `trips` from the store and derive their trip with `useMemo(() => trips.find(t => t.id === id), [trips, id])`. The home screen refreshes with `useFocusEffect(loadTrips)`; detail screens call `loadTrip(id)` on mount.

### Schema migrations

`initTables()` runs `CREATE TABLE IF NOT EXISTS` plus per-column `ALTER TABLE ... ADD COLUMN` calls wrapped in `try/catch` (the catch swallows "column exists" on already-migrated devices). The database on a user's device is never dropped, so **any new column must be added both to the `CREATE TABLE` block and as a new try/catch `ALTER TABLE`** — see `paid_by` and `currency` for the precedent.

### The money model (`utils/calculator.ts`)

Three distinct money flows, and mixing them up is the main source of bugs:

- **Share** — an expense is split equally across `expense.participants`; each participant owes `amount / participants.length`.
- **Fund payment** — a `Payment` row: cash handed to the treasurer up front.
- **Advanced payment** — `expense.paidBy` is set: that member paid a vendor directly out of pocket.

`calculateSummary` produces `balance = totalPaid - totalShare`, except the treasurer, who additionally subtracts `fundHeld` (the whole pot they are holding). Positive balance = creditor, negative = debtor. Balances therefore sum to ~0 and are what settlement operates on. `debt` is a separate legacy field measured relative to the treasurer.

`calculateSettlements` has two strategies (`SettlementStrategy`):
- `optimal` — for ≤15 members, repeatedly extracts zero-sum subsets (`findZeroSumSubset` backtracking) and settles each internally, then a greedy largest-debtor/largest-creditor pass for the remainder. Minimizes transaction count.
- `centralized` — every debtor pays the middleman (defaults to the treasurer) and the middleman pays every creditor.

Comparisons use an `epsilon` of `0.01`, not `=== 0`.

### Currency and rounding (`utils/currency.ts`)

Currency is **per-trip** (`trip.currency`, `'VND' | 'USD'`), not global; VND has 0 decimals, USD 2. `roundCurrency` rounds half-away-from-zero symmetrically (`Math.sign` × rounded absolute value, plus `Number.EPSILON`) so a debt and its matching refund round to the same magnitude. Keep intermediate math unrounded and round only at the boundary where a value is stored on a summary or a settlement — rounding early makes balances stop summing to zero.

### Routing

File-based via Expo Router with `typedRoutes` enabled. `app/_layout.tsx` registers every screen with `headerShown: false`; screens render `components/CustomHeader` themselves. `trip/create`, `trip/[id]/add-expense`, and `trip/[id]/add-payment` are `presentation: 'modal'`. Providers (`GestureHandlerRootView` → navigation `ThemeProvider` → `DialogProvider`) and the `@/utils/i18n` side-effect import all live in the root layout.

## Conventions

- **Styling**: no hardcoded colors or spacing. Every component defines `createStyles(colors: ThemeColors)` returning `StyleSheet.create({...})` and calls it via `const styles = useMemo(() => createStyles(colors), [colors])` with `colors` from `useAppTheme()`. Tokens (`Spacing`, `BorderRadius`, `FontSize`, `FontWeight`, `LightColors`/`DarkColors`) come from [constants/theme.ts](constants/theme.ts). Theme mode is `system | light | dark`, persisted in AsyncStorage by `useThemeStore`.
- **Dialogs**: use `useDialog().showDialog(title, message, buttons)` from [components/DialogProvider.tsx](components/DialogProvider.tsx). React Native's `Alert` is deliberately unused — the custom dialog is themed and works consistently on both platforms.
- **Animations**: standard React Native `Animated` only. `react-native-reanimated` was removed after `installTurboModule` crashes on RN 0.81 + New Architecture; do not reintroduce it. (This overrides the "use reanimated" line in `.agents/rules/senior-react-native.md`.)
- **i18n**: all user-facing strings go through `useTranslation()`/`t()`. `locales/en.json` and `locales/vi.json` must be kept in sync — key namespaces mirror screens (`home`, `trip_detail`, `add_expense`, `summary`, `components`, `common`). Language is auto-detected from the device and persisted in AsyncStorage.
- **IDs**: `Crypto.randomUUID()` from `expo-crypto`, generated in the store, not in the DB layer.
- **Lists**: `FlatList` with `keyExtractor`, never `ScrollView` + `.map()`. Memoize derived values and callbacks (`useMemo`/`useCallback`) — screens re-render whenever the store's `trips` array changes.

## Repo-specific agent rules

`.agents/rules/` applies to all sessions:

- Plan before coding on multi-step work; state assumptions explicitly and ask rather than guessing between interpretations.
- Keep changes surgical: every changed line should trace to the request. Don't refactor or reformat adjacent code; match surrounding style. Remove only orphans your own change created — mention pre-existing dead code instead of deleting it.
- Prefer the minimum code that solves the problem; no speculative abstractions, configurability, or handling for impossible cases.
- Strict TypeScript for props, navigation params, and store signatures.

`history/project_context.md` is a running Vietnamese-language changelog of architectural decisions; skim it when the "why" behind a decision matters, and append to it after significant feature work.
