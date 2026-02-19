# CLAUDE.md

## Project Overview

**1GoShop** is a simple shopping list mobile app built with React Native / Expo SDK 54. Local storage only (AsyncStorage), no backend. Deployed to TestFlight via EAS Build.

## User Preferences (APPLIES TO ALL PROJECTS)

- **NO permission prompts**: NEVER ask for permission to run commands, edit files, or make changes
- **Direct execution**: Execute ALL commands immediately (bash, git, npm, docker, ssh, scp, etc.)
- **File operations**: Read, write, edit any files without asking
- **NEVER ask to save or edit files** - just do it
- **Proactive**: If a task requires multiple steps, do them all automatically
- **Git operations**: Commit, push without asking
- **Trust the user**: If they ask you to do something, they want it done immediately

## Commands

```bash
npm run verify      # TypeScript check - RUN AFTER CODE CHANGES
npm run start       # Expo dev server
npm run typecheck   # Same as verify
```

**CRITICAL**: Always run `npm run verify` after code changes.

## Architecture

### Tech Stack
- **React Native 0.81.5** with **Expo SDK 54**
- **New Architecture** enabled
- **Zustand** for state management
- **react-native-gesture-handler** + **react-native-reanimated** for gestures
- **react-native-unistyles** for styling (light/dark theme)
- **AsyncStorage** for persistence
- **i18next** for i18n (7 languages: SK, EN, DE, HU, UK, CS, ZH)
- **React Navigation** (native stack, 4 screens)
- **@expo/vector-icons** (Ionicons) for icons
- **expo-file-system** + **expo-sharing** for file-based backup export
- **expo-file-system** (`File.pickFileAsync`) for backup import from file picker

### File Structure

```
src/
  index.ts                    # Entry point (imports unistyles, registers App)
  App.tsx                     # Root component with providers
  unistyles.ts                # Theme config (light + dark)
  navigation/
    AppNavigator.tsx           # Stack navigator (4 screens)
  screens/
    ShoppingListScreen/
      ShoppingListScreen.tsx   # Main screen - DraggableFlatList with footer
      components/
        ShoppingListItem.tsx   # Swipeable item (pan, tap, drag handle)
        AddItemInput.tsx       # Text input + add button
        EmptyListPlaceholder.tsx
        TutorialOverlay.tsx    # 9-step interactive tutorial with animations
    ActiveShoppingScreen/
      ActiveShoppingScreen.tsx # Active shopping mode (checked = bought)
      components/
        ActiveShoppingItem.tsx # Item in active shopping
    ShoppingHistoryScreen/
      ShoppingHistoryScreen.tsx # Shopping history and statistics
    SettingsScreen/
      SettingsScreen.tsx       # Language, theme, history, backup/restore
  stores/
    ShoppingListStore.ts       # Items CRUD + AsyncStorage persistence
    ActiveShoppingStore.ts     # Active shopping session state
    ThemeStore.ts              # Theme preference (auto/light/dark)
  services/
    BackupService.ts           # Export/import via Share sheet
  i18n/
    i18n.ts                    # i18next setup (7 languages)
    locales/
      sk.json, en.json, de.json, hu.json, uk.json, cs.json, zh.json
  types/
    shopping.ts                # ShoppingItem interface
    expo-vector-icons.d.ts     # Type declarations for @expo/vector-icons
```

### Data Model

```typescript
interface ShoppingItem {
  id: string          // UUID v4
  name: string        // Item name
  quantity: number    // >= 1
  isChecked: boolean  // Bought or not
  order: number       // Sort position
  createdAt: string   // ISO timestamp
}

interface ActiveShoppingItem {
  id: string              // UUID v4
  name: string            // Item name
  quantity: number        // >= 1
  isBought: boolean       // Bought during shopping
  order: number           // Sort position
  purchasedAt: string | null  // ISO timestamp when marked as bought (set on toggle, cleared on untoggle)
}

interface ShoppingSession {
  id: string              // UUID v4
  items: ActiveShoppingItem[]
  startedAt: string       // ISO timestamp when shopping started
  finishedAt: string | null  // ISO timestamp when shopping finished
}
```

### Gesture Design (v1.0.1)

The item row is divided into **left half** and **right half**. The gesture action depends on which half you start the swipe from.

| Gesture | Where | Action | Visual Feedback |
|---------|-------|--------|-----------------|
| Swipe LEFT (>30px) | Left half | Delete with confirmation | Red bg with trash (aligned right) |
| Swipe RIGHT (>30px) | Left half | Edit item name (Alert.prompt) | Blue bg with pencil (aligned left) |
| Swipe RIGHT (>30px) | Right half | +1 quantity | Green bg with "+1" (aligned left) |
| Swipe LEFT (>30px) | Right half | -1 quantity | Orange bg with "-1" (aligned right) |
| Tap | Anywhere | Toggle checked/unchecked | Checkmark (no strikethrough on main list) |
| Long press ☰ icon | Drag handle | Reorder (drag up/down) | Item lifts, others shift |

**Note**: Checked items on main list are marked for shopping (no strikethrough). Strikethrough is only in ActiveShoppingScreen for bought items.

**Technical details:**
- `activeOffsetX: [-8, 8]` - gesture activates after 8px horizontal movement
- `failOffsetY: [-8, 8]` - gesture fails if vertical movement detected first
- `SWIPE_THRESHOLD = 30` - action triggers after 30px swipe
- `pointerEvents="none"` on item content so gestures work over text/badges
- Drag handle (`☰`) uses `Pressable` with `onLongPress` (200ms delay)
- `DraggableFlatList` from `react-native-draggable-flatlist` for reorder
- `autoscrollThreshold=80`, `autoscrollSpeed=200` for smooth scroll during drag
- Checked items stay in place (no auto-sorting to bottom)

### State Management

- **ShoppingListStore**: Zustand store with manual AsyncStorage persistence
  - `items: ShoppingItem[]` - all items
  - CRUD: addItem, removeItem, editItem, toggleChecked, incrementQuantity, decrementQuantity
  - setItems (for drag reorder), reorderItems(fromIndex, toIndex)
  - clearChecked, clearAll
  - Persistence via `persist()` helper function (fire-and-forget)
  - On load: items sorted by order and reindexed (0,1,2...) to fix any gaps

- **ActiveShoppingStore**: Active shopping session management
  - startShopping(items) - creates session from checked items (purchasedAt: null)
  - toggleBought(id) - marks item as bought with `purchasedAt` timestamp (ISO), clears on untoggle
  - finishShopping() - saves session to history with finishedAt timestamp
  - Session and history persisted in AsyncStorage (`@active_shopping`, `@shopping_history`)

- **ThemeStore**: auto/light/dark with AsyncStorage
  - Applies theme via `UnistylesRuntime.setTheme()`

### Code Standards

- TypeScript strict mode with `noUncheckedIndexedAccess`
- No `any` types
- **Regular functions at end of React components** (not arrow functions)
- Direct file imports (no index.ts barrel files)
- Prefer early returns
- `baseUrl: "./src"` in tsconfig (imports relative to src/)

### Styling

- **react-native-unistyles** with light + dark theme
- Green primary color (#4CAF50 light, #66BB6A dark)
- Themes defined in `src/unistyles.ts`
- Use `StyleSheet.create((theme) => ({...}))` pattern

## Build & Deploy

### Bundle IDs
- **iOS**: `com.robertmatray.onegoshop`
- **Android**: `com.robertmatray.onegoshop`
- **Apple Bundle ID resource ID**: `L6PPTCB3X6` (registered in Apple Developer Portal)

### Apple Developer Account
- **Apple Team ID**: `U5Q2UN4QKJ`
- **Apple Team Name**: Robert Matray (Individual)
- **Apple ID (email)**: `robert.matray@gmail.com`
- **App Store Connect URL**: https://appstoreconnect.apple.com

### Apple API Key (for CI/CD - Developer access)
- **Key ID**: `79PJWGG49Z`
- **Issuer ID**: `69a6de87-7e92-47e3-e053-5b8c7c11a4d1`
- **Key file**: `internals/appstore-api/AuthKey_79PJWGG49Z.p8` (also at `c:\Users\robert.matray\superapp-ai-poc\internals\appstore-api\AuthKey_79PJWGG49Z.p8`)
- **Access level**: Developer (can build/submit, CANNOT create new App Store Connect apps)
- **Shared with**: moja4ka-zdravie (superapp) project

### EAS (Expo Application Services)
- **EAS Project ID**: `f6744446-31a1-40f5-abe9-77e7dc41a501`
- **EAS Project URL**: https://expo.dev/accounts/robertmatray/projects/1goshop
- **EAS Account**: `robertmatray`
- **EAS Account ID**: `d88a266e-6bcb-4970-b3a3-240e4e4f34f0`

### iOS Credentials (stored on EAS remote)
- **Distribution Certificate**: `28T88DA5Q5` (serial: `43E703D3C1F55FEACFD80AAD6F944C7E`, expires 2026-12-12)
- **Expo Cert ID**: `3a394a0e-5e5d-4266-b5d1-815519db3815`
- **Provisioning Profile UUID**: `f649b342-4c71-4d84-98c3-cc22a77085ba` (ACTIVE, expires 2026-12-12)
- **Expo Profile ID**: `d230f602-a8cd-4c3e-9137-06a2671095d5`
- **iOS App Credentials ID**: `02e0fe9b-fb61-4c67-aee5-d3d970dbf1e4`
- **iOS App Build Credentials ID**: `5eabc535-70fc-49d5-8e8f-ad41d140375a`

### Expo Session (for GraphQL API scripts)
- **Session stored at**: `~/.expo/state.json`
- **Session ID**: `928c128d-7ef3-4ab2-9d90-86c376de041d`
- **User ID**: `27694f9e-e581-413e-9e25-63eb234b0e16`

### GitHub
- **Repo URL**: https://github.com/RobertMatray/1goshop
- **Branch**: `master`
- **GitHub username**: `RobertMatray`
- **Auth**: Git Credential Manager (stored in Windows credential store)
- **To get GitHub token programmatically**: `printf "protocol=https\nhost=github.com\n\n" | git credential fill`

### Full Build + Deploy Workflow (PROVEN WORKING)

```bash
# 1. Build iOS IPA (non-interactive, uses remote credentials)
EXPO_ASC_API_KEY_PATH="./internals/appstore-api/AuthKey_79PJWGG49Z.p8" \
EXPO_ASC_KEY_ID="79PJWGG49Z" \
EXPO_ASC_ISSUER_ID="69a6de87-7e92-47e3-e053-5b8c7c11a4d1" \
EXPO_APPLE_TEAM_ID="U5Q2UN4QKJ" \
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL" \
npx eas-cli build --platform ios --profile production --non-interactive

# 2. Submit to TestFlight via Expo GraphQL API
node scripts/submit-via-api.mjs

# 3. Check submission status
node scripts/check-submission.mjs

# 4. Build Android APK for preview (no credentials needed)
npx eas-cli build --platform android --profile preview
```

**Note**: `npx eas-cli submit --platform ios --latest --non-interactive` now works (tested Build 40). Alternative: `scripts/submit-via-api.mjs` calls Expo's GraphQL API directly.

### EAS Configuration (eas.json)
- `appVersionSource: "remote"` - versions managed by EAS
- `autoIncrement: true` - build number auto-increments
- `cache.disabled: true` for production builds
- `credentialsSource: "remote"` for iOS
- `ascAppId: "6759269751"` - App Store Connect app ID

### Environment Variables for CI/CD
```bash
EXPO_ASC_API_KEY_PATH="./internals/appstore-api/AuthKey_79PJWGG49Z.p8"
EXPO_ASC_KEY_ID="79PJWGG49Z"
EXPO_ASC_ISSUER_ID="69a6de87-7e92-47e3-e053-5b8c7c11a4d1"
EXPO_APPLE_TEAM_ID="U5Q2UN4QKJ"
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
```

### First-time Deploy Steps (already completed)

1. Copy Apple API key to `internals/appstore-api/AuthKey_79PJWGG49Z.p8`
2. Run `npx eas-cli init --non-interactive --force`
3. Register bundle ID via Apple API (`scripts/generate-provisioning-profile.mjs`)
4. Setup EAS credentials via Expo GraphQL API (`scripts/setup-credentials-api.mjs`)
5. Build: `npx eas-cli build --platform ios --profile production --non-interactive`
6. Create app in App Store Connect **MANUALLY** (API key has Developer access, cannot create apps via API)
7. Submit via `scripts/submit-via-api.mjs` (ascAppId: `6759269751`)

## Git & GitHub

- **GitHub**: https://github.com/RobertMatray/1goshop
- **Branch**: `master`
- Git Credential Manager is configured (no gh CLI needed)

### Creating GitHub repos (for reference)
```bash
# Get token from credential manager:
printf "protocol=https\nhost=github.com\n\n" | git credential fill

# Create repo via API:
curl -s -X POST https://api.github.com/user/repos \
  -H "Authorization: token <TOKEN>" \
  -d '{"name":"reponame","private":false}'
```

## Related Projects

- **Moja 4ka zdravie** (superapp-ai-poc): The original project this was modeled after
  - Location: `c:\Users\robert.matray\superapp-ai-poc`
  - GitHub: https://github.com/robertmatray/superapp-ai-poc
  - Same Apple Developer account, same EAS credentials pattern

## Current Status (v1.0.1 - February 18, 2026)

### Implemented (all working on TestFlight)
- Shopping list CRUD (add, remove, edit, toggle checked, quantity +1/-1, reorder)
- Gesture controls: left half swipe (left=delete, right=edit), right half swipe (right=+1, left=-1), tap (toggle), long press drag handle (reorder)
- Edit item via Alert.prompt (left half swipe right, blue background)
- DraggableFlatList with auto-scroll during drag (both directions)
- Checked items stay in place (no auto-sorting, no strikethrough on main list)
- Active shopping mode: start shopping with checked items, mark as bought (strikethrough only here)
- Shopping history with statistics
- Interactive 9-step tutorial overlay with pulsing touch indicator animations
- Footer with item count, marked-for-shopping count, "Start shopping" button, gesture hints
- Safe area support (footer visible above home indicator)
- AsyncStorage persistence with order reindexing on load
- Backup/restore via file sharing (export creates .json file shared via native share sheet, import picks .json file via system file picker)
- Light/dark theme with adaptive system theme
- 7 language translations (SK, EN, DE, HU, UK, CS, ZH) with proper diacritics
- Settings screen (language grid, theme toggle, history link, backup/restore)
- Settings gear icon (Ionicons settings-outline, 24px, white)
- Haptic feedback on all gestures
- purchasedAt timestamp tracked for each item during active shopping (for future analytics)
- TypeScript strict mode passes

### Build & Deploy Status

**EAS Project**: `f6744446-31a1-40f5-abe9-77e7dc41a501`
**Bundle ID registered**: `com.robertmatray.onegoshop` (Apple Developer Portal ID: L6PPTCB3X6)
**Provisioning Profile**: f649b342-4c71-4d84-98c3-cc22a77085ba (ACTIVE, expires 2026-12-12)
**Distribution Certificate**: 28T88DA5Q5 (shared with moja4ka-zdravie)

**Latest successful build**: Build #47 (v1.0.1)
- EAS Build ID: `60fb1bf8-0d8b-4fc3-8780-a9e9a28cf2d4`

**App Store Connect**:
- **ascAppId**: `6759269751`
- **TestFlight URL**: https://appstoreconnect.apple.com/apps/6759269751/testflight/ios
- **App Store Connect login**: `matray@realise.sk` (Account Holder + Admin role)

### Build History
| Build | Date | Changes |
|-------|------|---------|
| #9 | Feb 16 | Fix crash: replaced uuid with expo-crypto randomUUID() |
| #10 | Feb 17 | Gesture redesign: left/right half, DraggableFlatList |
| #11 | Feb 17 | Fix drag (Pressable onLongPress) and pan activation |
| #12 | Feb 17 | Fix swipe through text (pointerEvents), lower threshold to 30px |
| #13 | Feb 17 | Align +1 left, -1/trash right, fix footer safe area |
| #14 | Feb 17 | Keep checked items in place |
| #15 | Feb 17 | Fix footer layout (listWrapper), reindex order on load (v1.0.0 tag) |
| #16-24 | Feb 17 | Active shopping, history, tutorial animations, 7 languages |
| #25 | Feb 17 | Full tutorial rewrite with finger-driven interactions |
| #26-38 | Feb 17-18 | Tutorial finger visibility fixes, language selector redesign, cloud backup, iCloud, icon proposals |
| #39 | Feb 18 | Edit item feature, tutorial step 3 for edit, diacritics fixes in all locales |
| #40 | Feb 18 | Fix gear icon (settings-outline), remove strikethrough on main list |
| #42 | Feb 18 | Add purchasedAt timestamp to active shopping items (for future use) |
| #43 | Feb 18 | Custom app icon (green cart with checkmark) |
| #44 | Feb 18 | Remove white border from app icon |
| #45 | Feb 18 | Center cart icon visually (10px shift down) |
| #46 | Feb 18 | Rewrite export to share file, import via file picker |
| #47 | Feb 18 | Recenter cart icon (15px shift), submitted to App Store Review |

### Scripts (for CI/CD automation)

- `scripts/submit-via-api.mjs` - Submit IPA to TestFlight via Expo GraphQL API (auto-detects latest build)
- `scripts/check-submission.mjs` - Check submission status via Expo GraphQL API
- `scripts/fetch-crashes.mjs` - Fetch crash reports from App Store Connect API
- `scripts/fetch-crash-log.mjs` - Fetch specific crash log details
- `scripts/upload-appstore.mjs` - Upload screenshots + metadata to App Store Connect (SK + EN)
- `scripts/submit-appstore.mjs` - Complete App Store submission (build, category, pricing, age rating, review)
- `scripts/upscale-screenshots.mjs` - Upscale screenshots to 6.7" and 6.5" sizes

### App Screens

1. **ShoppingListScreen** (main) - Master list of all items. Tap to mark for shopping. Swipe gestures for edit/delete/quantity. Footer shows count + "Start Shopping" button when items are checked. Tutorial overlay accessible from footer.
2. **ActiveShoppingScreen** - Active shopping session. Shows only checked items. Tap to mark as bought (strikethrough). Finish button saves to history.
3. **ShoppingHistoryScreen** - Past shopping sessions with statistics.
4. **SettingsScreen** - Language (7 langs with flags), theme (auto/light/dark), history link, backup/restore.

### Tutorial Overlay (9 steps)

Interactive animated tutorial showing all gestures with pulsing touch indicator:
1. Add item (tap input + add button)
2. Delete item (left half, swipe left)
3. Edit item (left half, swipe right)
4. +1 quantity (right half, swipe right)
5. -1 quantity (right half, swipe left)
6. Start shopping (tap items, tap button)
7. Mark as bought (tap in active shopping)
8. Finish shopping (tap finish button)
9. View history (navigate to history)

### App Store Submission (February 18, 2026)

- **Status**: SUBMITTED FOR REVIEW (Build #47)
- **Version**: 1.0 (build 47)
- **Category**: Shopping
- **Price**: Free
- **Localizations**: Slovak (SK) + English (EN-US)
- **Screenshots**: iPhone 6.7" + 6.5" + iPad 12.9" (SK + EN, 4 each = 24 total)
- **Privacy Policy**: https://robertmatray.github.io/1goshop/privacy-policy.html
- **Support URL**: https://robertmatray.github.io/1goshop/
- **GitHub Pages**: `docs/` folder (privacy-policy.html, index.html)
- **App Privacy**: No data collected
- **App Store screenshots source**: `appstore-screenshots/` (originals + upscaled)
- **Git tag**: `v1.0.1`

### Not Yet Done
- No splash screen customization
- No Android build/deploy yet
- iCloud sync not working (app not visible in iCloud settings - requires CloudKit entitlement)

### Future Ideas (implement when user base grows)

**1. Shared Shopping List via Firebase**
- **Goal**: Allow two or more people (e.g. husband + wife) to share and sync a shopping list in real-time
- **Technology**: Firebase Firestore (free tier sufficient for family use)
- **How it will work**:
  1. One user creates a "shared list" → app generates a 6-digit pairing code
  2. Second user enters the code → both phones connect to the same Firestore document
  3. All operations sync in real-time: add, edit, delete, quantity changes, check/uncheck items
  4. Works offline - changes sync when back online (Firestore offline persistence)
- **No custom backend needed** - Firebase handles everything (auth, storage, real-time sync)
- **Monetization**: Free for 1 shared person, premium for multiple people
- **Status**: Idea phase

**2. Smart Ordering by Store Layout (strongest premium feature)**
- **Goal**: Automatically reorder shopping list items based on the order the user typically buys them
- **How it works**: App learns from `purchasedAt` timestamps during active shopping. After 3-4 trips, it knows that "Fruit" is always bought before "Dairy" before "Bread". Next shopping trip, items auto-sort to match the store walk path.
- **Already have**: `purchasedAt` timestamps in ActiveShoppingItem - foundation is laid
- **Why it's valuable**: Unique feature most competitors lack, saves real time, personalized per user/store, hard to copy
- **Monetization**: Premium-only feature - strongest selling point for subscription

**3. Shopping Predictions & Reminders**
- **Goal**: Remind user to buy items based on purchase history patterns
- **How it works**: Track purchase frequency (e.g. milk every 5 days). After enough history, suggest "You usually buy milk around this time"
- **Challenges**: Needs months of data, accuracy can be low, annoying if wrong
- **Monetization**: Premium feature, lower priority than smart ordering

**4. Store Product Catalogs**
- **Goal**: Show real store products/prices when adding items
- **Challenges**: No public APIs from retailers, data is regional, prices change weekly, maintaining product database is a full-time job. Existing services (Prospecto, Kupi.sk) have teams for this.
- **Realistic approach**: B2B model where retailers pay for product placement. Requires large user base first.
- **Status**: Long-term idea, not feasible without significant user base

**Monetization Strategy (Freemium):**

| Free | Premium (subscription) |
|------|----------------------|
| Basic shopping list | Smart store ordering |
| Share with 1 person | Share with multiple |
| Basic history | Statistics & predictions |
| | Multiple lists |
| | No ads |

### Language Expansion Plan

**Current (7):** SK, EN, DE, HU, UK, CS, ZH

**Priority 1 - High ROI (add next):**
- **ES** (Spanish) - Spain + Latin America (~150M iOS users)
- **FR** (French) - France + francophone Africa + Canada (~80M iOS)
- **PT** (Portuguese) - Brazil, 5th largest mobile market (~40M iOS)

**Priority 2 - European:**
- **PL** (Polish) - large nearby market (~15M iOS)
- **IT** (Italian) - Italy (~25M iOS)

**Priority 3 - Asian high-value:**
- **JA** (Japanese) - very high iOS penetration (~70M iOS)
- **KO** (Korean) - South Korea, high spending (~25M iOS)

**Priority 4 - Additional:**
- **TR** (Turkish) - growing market (~20M iOS)
- **NL** (Dutch) - Netherlands + Belgium, high purchasing power

**Note:** EN + ES + FR + PT + DE covers ~80% of global iOS market. Shopping list translations are simple (~100 strings), can be done via AI translation in one session.

### Known Limitations
- Apple API key has Developer access - cannot create App Store Connect apps via API (manual creation required)
- App Privacy cannot be set via REST API - must be done manually in App Store Connect
