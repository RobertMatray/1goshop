# CLAUDE.md

## Project Overview

**1GoShop** is a shopping list mobile app built with React Native / Expo SDK 54. Supports multiple lists with Firebase Realtime Database sharing (anonymous auth). Local storage via AsyncStorage, Firebase sync for shared lists. Deployed to TestFlight via EAS Build.

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
- **AsyncStorage** for local persistence
- **Firebase JS SDK v12+** for real-time sync (Realtime Database + Anonymous Auth)
- **i18next** for i18n (12 languages: SK, EN, DE, HU, UK, CS, ZH, ES, FR, IT, PL, PT)
- **React Navigation** (native stack, 7 screens)
- **@expo/vector-icons** (Ionicons) for icons
- **expo-file-system** + **expo-sharing** for file-based backup export
- **expo-file-system** (`File.pickFileAsync`) for backup import from file picker

### File Structure

```
src/
  index.ts                    # Entry point (imports unistyles, registers App)
  App.tsx                     # Root component with providers (migration + Firebase init)
  unistyles.ts                # Theme config (light + dark)
  navigation/
    AppNavigator.tsx           # Stack navigator (7 screens)
  screens/
    ShoppingListScreen/
      ShoppingListScreen.tsx   # Main screen - DraggableFlatList with footer + list picker modal
      components/
        ShoppingListItem.tsx   # Swipeable item (pan, tap, drag handle)
        AddItemInput.tsx       # Text input + add button
        EmptyListPlaceholder.tsx
        TutorialOverlay/       # 11-step interactive tutorial (16 files)
    ActiveShoppingScreen/
      ActiveShoppingScreen.tsx # Active shopping mode (checked = bought)
      components/
        ActiveShoppingItem.tsx # Item in active shopping
    ShoppingHistoryScreen/
      ShoppingHistoryScreen.tsx # Shopping history and statistics
    SettingsScreen/
      SettingsScreen.tsx       # Language, theme, history, backup/restore
    ColorPickerScreen/
      ColorPickerScreen.tsx    # Accent color picker
    ShareListScreen/
      ShareListScreen.tsx      # Share list (generate code, manage sharing, auto-unlink)
    JoinListScreen/
      JoinListScreen.tsx       # Join shared list (enter 6-char code)
  stores/
    ShoppingListStore.ts       # Items CRUD + per-item Firebase sync + AsyncStorage
    ActiveShoppingStore.ts     # Active shopping session + Firebase session sync
    ListsMetaStore.ts          # Multi-list management (create, rename, delete, share/unlink)
    ThemeStore.ts              # Theme preference (auto/light/dark)
    AccentColorStore.ts        # Custom accent color
  services/
    FirebaseSyncService.ts     # Firebase auth, CRUD, real-time listeners, sharing codes
    firebaseConfig.ts          # Firebase project config (onegoshop)
    BackupService.ts           # Export/import via Share sheet
    MigrationService.ts        # Single-list → multi-list migration (idempotent)
    debouncedPersist.ts        # Debounced AsyncStorage writes
    ListClipboardService.ts    # Clipboard import/export
  i18n/
    i18n.ts                    # i18next setup (12 languages)
    locales/
      sk.json, en.json, de.json, hu.json, uk.json, cs.json, zh.json
      es.json, fr.json, it.json, pl.json, pt.json
  types/
    shopping.ts                # ShoppingItem, ShoppingListMeta, ListsMetaData interfaces
    expo-vector-icons.d.ts     # Type declarations for @expo/vector-icons
```

### Data Model

```typescript
interface ShoppingItem {
  id: string; name: string; quantity: number; isChecked: boolean; order: number; createdAt: string
}

interface ActiveShoppingItem {
  id: string; name: string; quantity: number; isBought: boolean; order: number; purchasedAt: string | null
}

interface ShoppingSession {
  id: string; items: ActiveShoppingItem[]; startedAt: string; finishedAt: string | null
}

interface ShoppingListMeta {
  id: string; name: string; createdAt: string
  isShared: boolean; shareCode: string | null; firebaseListId: string | null; ownerDeviceId: string | null
}

interface ListsMetaData {
  version: 1; lists: ShoppingListMeta[]; selectedListId: string; deviceId: string
}
```

### AsyncStorage Keys

- `@lists_meta` — ListsMetaData (all list metadata + selected list)
- `@list_{uuid}_items` — ShoppingItem[] per list
- `@list_{uuid}_session` — ShoppingSession per list
- `@list_{uuid}_history` — ShoppingSession[] per list
- `@accent_color`, `@app_theme`, `@saved_colors` — settings

### Firebase Structure (shared lists)

```
/lists/{firebaseListId}/
  meta/ { name, createdAt, createdBy, members/{uid}: { joinedAt, deviceName } }
  items/{itemId}: { id, name, quantity, isChecked, order, createdAt }
  session: ShoppingSession | null
  history/{sessionId}: ShoppingSession
/sharing-codes/{6-char-code}/
  { firebaseListId, listName, createdBy, createdAt, expiresAt }
```

### Firebase Sync Architecture

- **Per-item writes**: addItem → `firebaseAddItem`, toggleChecked → `firebaseUpdateItem`, etc. (no full overwrite)
- **Real-time listeners**: `subscribeToList` with `onItems`, `onSession`, `onMeta` callbacks
- **Local-first**: Always load from AsyncStorage first, Firebase overrides when data arrives
- **Local cache**: Firebase data cached to AsyncStorage via `debouncedPersist`
- **Session sync**: `onSession` → `ActiveShoppingStore.setSessionFromFirebase()`
- **Rename sync**: `onMeta` → `ListsMetaStore.renameList()` (with guard to prevent loop)
- **Auto-unlink**: When sharing code expires with no joiners, list reverts to local-only
- **Orphan cleanup**: `firebaseLeaveList` deletes entire Firebase list if no members remain
- **Sharing code**: 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no O/0/I/1/L), 15min expiry

### Gesture Design (v1.0.1)

The item row is divided into **left half** and **right half**. The gesture action depends on which half you start the swipe from.

| Gesture | Where | Action | Visual Feedback |
|---------|-------|--------|-----------------|
| Swipe LEFT (>30px) | Left half | Delete with confirmation | Red bg with trash (aligned right) |
| Swipe RIGHT (>30px) | Left half | Edit item name (Alert.prompt) | Blue bg with pencil (aligned left) |
| Swipe RIGHT (>30px) | Right half | +1 quantity | Green bg with "+1" (aligned left) |
| Swipe LEFT (>30px) | Right half | -1 quantity (if qty=1: delete confirmation) | Orange bg with "-1" (aligned right) |
| Tap | Anywhere | Toggle checked/unchecked | Checkmark (no strikethrough on main list) |
| Long press (500ms) | Anywhere on item | Edit item name (Alert.prompt) | Haptic feedback |
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

- **ListsMetaStore**: Multi-list management
  - `lists: ShoppingListMeta[]`, `selectedListId`, `deviceId`
  - CRUD: createList, renameList (+ Firebase sync), deleteList, selectList
  - Sharing: markListAsShared, unlinkList
  - Persisted to `@lists_meta`

- **ShoppingListStore**: Items CRUD with Firebase sync
  - `items: ShoppingItem[]`, `currentListId`
  - `switchToList(listId)`: loads from AsyncStorage first, subscribes to Firebase if shared
  - Per-item Firebase writes (addItem → firebaseAddItem, etc.)
  - Firebase listener callbacks: onItems, onSession (→ ActiveShoppingStore), onMeta (→ rename sync)

- **ActiveShoppingStore**: Shopping session + history
  - startShopping, toggleBought, finishShopping
  - `setSessionFromFirebase(session)` - receives real-time session updates from Firebase
  - `loadHistory()` - tries Firebase first, falls back to AsyncStorage
  - On finish: bought items unchecked in ShoppingListStore

- **ThemeStore**: auto/light/dark with AsyncStorage
- **AccentColorStore**: Custom accent color with HSL picker

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
- **Android**: `com.realise.onegoshop`
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

## Current Status (v1.2.1 - February 26, 2026)

### Implemented (all working on TestFlight)
- Shopping list CRUD (add, remove, edit, toggle checked, quantity +1/-1, reorder)
- Gesture controls: left half swipe (left=delete, right=edit), right half swipe (right=+1, left=-1), tap (toggle), long press (edit), long press drag handle (reorder)
- Edit item via Alert.prompt (left half swipe right OR long press 500ms)
- Decrement on quantity=1 shows delete confirmation (same as swipe-left delete)
- DraggableFlatList with auto-scroll during drag (both directions)
- Checked items stay in place (no auto-sorting, no strikethrough on main list)
- Active shopping mode: start shopping with checked items, mark as bought (strikethrough only here), bought items unchecked on finish
- Shopping history with statistics
- Interactive 9-step tutorial overlay with pulsing touch indicator animations
- Footer with item count, marked-for-shopping count, "Start shopping" button, gesture hints
- Safe area support (footer visible above home indicator)
- AsyncStorage persistence with order reindexing on load
- Backup/restore via file sharing (export creates .json file shared via native share sheet, import picks .json file via system file picker)
- Light/dark theme with adaptive system theme
- 12 language translations (SK, EN, DE, HU, UK, CS, ZH, ES, FR, IT, PL, PT) with proper diacritics
- New items auto-marked for shopping (isChecked: true by default)
- Settings screen (language grid, theme toggle, history link, backup/restore)
- Settings gear icon (Ionicons settings-outline, 24px, white)
- Haptic feedback on all gestures
- purchasedAt timestamp tracked for each item during active shopping (for future analytics)
- TypeScript strict mode passes

**v1.1.0 features:**
- Accent color picker (ColorPickerScreen) with 20 preset colors and custom color selection via HSL wheel
- Clipboard import/export in footer (supports Apple Notes checklists, Google Sheets, Excel, numbered/bulleted lists)
- iCloud backup enabled (RCTAsyncStorageExcludeFromBackup: false)
- Search/filter in shopping list (filter text in AddItemInput component)
- Bold text for checked items on main list

**v1.2.1 multi-list + Firebase features (Build #75-#80):**
- Multiple shopping lists (create, rename, delete, switch via header dropdown)
- Firebase Realtime Database sharing with anonymous auth
- 6-character sharing codes (15min expiry, auto-unlink if nobody joins)
- Join shared list by entering code
- Per-item Firebase sync (prevents data loss on simultaneous edits)
- Real-time session sync (both users see active shopping)
- Real-time list rename sync (bidirectional)
- Orphaned Firebase data cleanup (auto-delete when last member leaves)
- Migration from single-list to multi-list format (idempotent, with orphan recovery)
- Tutorial steps 10+11 (share list, join shared list animations)
- Local-first architecture: always loads from AsyncStorage, Firebase overrides when available

### Build & Deploy Status

**EAS Project**: `f6744446-31a1-40f5-abe9-77e7dc41a501`
**Bundle ID registered**: `com.robertmatray.onegoshop` (Apple Developer Portal ID: L6PPTCB3X6)
**Provisioning Profile**: f649b342-4c71-4d84-98c3-cc22a77085ba (ACTIVE, expires 2026-12-12)
**Distribution Certificate**: 28T88DA5Q5 (shared with moja4ka-zdravie)

**Latest successful iOS build**: Build #80 (v1.2.1) - all sharing edge cases fixed
- Git tag: `v1.2.1-b80`

**Latest successful Android build**: Build (v1.2.0, versionCode 6)
- AAB: `internals/google-play/app.aab` (not in git, 58MB)

**App Store Connect**:
- **ascAppId**: `6759269751`
- **TestFlight URL**: https://appstoreconnect.apple.com/apps/6759269751/testflight/ios
- **App Store Connect login**: `matray@realise.sk` (Account Holder + Admin role)

### Code Review Iterative Process (February 25, 2026)

**Process**: Run code review → fix CRITICAL/HIGH/MEDIUM → repeat until 0 CRITICAL and 0 HIGH (max 5 iterations).

**Baseline tag**: `v1.2.0-pre-iterative-review` (commit `e2ff339`)

**Previous reviews completed**:
- v1-v3: Initial reviews with incremental fixes
- v4 (Build #72): 23 findings (4C/5H/7M/7L) - CRITICAL+HIGH+MEDIUM fixed in commit `a3f716a`
- v5 (Build #73): 22 findings (5C/5H/5M/7L) - documented only, severity inflation noted

**Severity calibration notes** (from v4→v5 comparison):
- UUID collision (randomUUID) is LOW, not CRITICAL (probability 2^-122)
- HTML sanitization in React Native is MEDIUM (RN escapes natively, only relevant for web port)
- Follow-up findings on already-fixed code should be downgraded vs original finding
- Shopping list app context: data loss = CRITICAL, theoretical attacks = LOW/MEDIUM

**Iterative review log**:
| Iteration | Tag | CRITICAL | HIGH | MEDIUM | Status |
|-----------|-----|----------|------|--------|--------|
| 0 (baseline) | v1.2.0-pre-iterative-review | - | - | - | Starting point |
| 1 | commit 29d6c3a | 3→0 | 3→0 | 5→0 | Fixed: ErrorBoundary, debounced persist, backup reload, try/finally, item name limit, backup validation |
| 2 | commit 445e8e2 | 0 | 2→0 | 7→0 | Fixed: hardcoded colors (settings icon, ColorPicker preview), backup JSON validation |
| 3 | commit 3bf1561 | 0 | 0 | 3→0 | Fixed: JSON parse validation in stores, flushPersist utility. **GOAL MET: 0 CRITICAL, 0 HIGH** |

**Final independent review (v6)**: 0 CRITICAL, 0 HIGH, 3 MEDIUM, 5 LOW. Score: **9.2/10 (A - Production Ready)**
- Report: `code-reviews/2026-02-25-code-review-v6-post-iterative-independent.docx`
- Generator: `scripts/generate-code-review-v6.mjs`

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
| #48-58 | Feb 19-20 | Color picker, accent color store, settings redesign, list search/filter |
| #59-61 | Feb 20 | Clipboard import/export, bold checked items, iCloud backup fix |
| #62-64 | Feb 21 | Debug clipboard button, fix Apple Notes import (- [x] format) |
| #65 | Feb 21 | Remove debug button, clean parser |
| #66 | Feb 21 | v1.1.0 - App Store release (color settings, import/export, iCloud backup, search) |
| #67 | Feb 22 | v1.1.0 build (submit failed - version already on App Store) |
| #68 | Feb 22 | v1.2.0 - iOS TestFlight (5 new languages, auto-check new items) |
| #69 | Feb 24 | Code review cleanup (remove unused deps, fix anti-patterns) |
| #70 | Feb 24 | UX improvements: uncheck bought items after shopping, decrement-to-delete, long press to edit |
| #71-73 | Feb 25 | Code review v4/v5 fixes, TutorialOverlay refactoring |
| #74 | Feb 25 | v1.2.1 - Post-iterative code review fixes (ErrorBoundary, debouncedPersist, backup validation, hardcoded colors, JSON parse validation, flushPersist) |
| #75 | Feb 25 | Phase 1: Multi-list support (local) — multiple shopping lists with per-list storage |
| #76 | Feb 25 | Phase 2+3: Firebase sharing + real-time sync |
| #77 | Feb 26 | Tutorial sharing steps (10+11) + migration recovery for orphaned history |
| #78 | Feb 26 | Debug AsyncStorage dump button (diagnostic) |
| #79 | Feb 26 | Fix shared list showing empty: load local data first, then Firebase |
| #80 | Feb 26 | Fix all sharing edge cases: per-item sync, session/rename sync, auto-unlink, history upload, orphan cleanup. Remove debug button. |
| Android | Feb 22 | v1.2.0 (versionCode 6) - Android AAB for Google Play |

### Scripts (for CI/CD automation)

- `scripts/submit-via-api.mjs` - Submit IPA to TestFlight via Expo GraphQL API (auto-detects latest build)
- `scripts/check-submission.mjs` - Check submission status via Expo GraphQL API
- `scripts/fetch-crashes.mjs` - Fetch crash reports from App Store Connect API
- `scripts/fetch-crash-log.mjs` - Fetch specific crash log details
- `scripts/upload-appstore.mjs` - Upload screenshots + metadata to App Store Connect (SK + EN)
- `scripts/submit-appstore.mjs` - Complete App Store submission (build, category, pricing, age rating, review)
- `scripts/upscale-screenshots.mjs` - Upscale screenshots to 6.7" and 6.5" sizes
- `scripts/publish-google-play.mjs` - Upload AAB, store listings (12 langs), screenshots to Google Play via API

### App Screens

1. **ShoppingListScreen** (main) - Master list with header list picker (dropdown). Swipe gestures, footer with count + "Start Shopping". Share icon in header. Tutorial overlay (11 steps).
2. **ActiveShoppingScreen** - Active shopping session. Tap to mark bought (strikethrough). Finish saves to history.
3. **ShoppingHistoryScreen** - Past shopping sessions with statistics.
4. **SettingsScreen** - Language (12 langs), theme (auto/light/dark), accent color, history link, backup/restore.
5. **ColorPickerScreen** - Accent color picker with 20 presets + custom HSL wheel.
6. **ShareListScreen** - Share list (generate 6-char code, show members count, stop sharing). Auto-unlinks if nobody joins.
7. **JoinListScreen** - Join shared list by entering 6-character code.

### Tutorial Overlay (11 steps)

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
10. Share list (tap share icon, show code)
11. Join shared list (enter code, connect)

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

### Google Play Store (Android)

- **Google Play Console**: Organization account (Realise)
- **Android package**: `com.realise.onegoshop`
- **Google Cloud Project**: `goshop-488315`
- **Service Account**: `play-publish@goshop-488315.iam.gserviceaccount.com`
- **Service Account Key**: `internals/google-play/service-account.json` (gitignored)
- **Publish Script**: `scripts/publish-google-play.mjs` (uploads AAB, store listings in 12 languages, screenshots)
- **Store Listing**: 12 languages (en-US, sk, de-DE, hu-HU, uk, cs-CZ, zh-CN, es-ES, fr-FR, it-IT, pl-PL, pt-PT)
- **Store Assets**: `internals/google-play/icon-512.png`, `internals/google-play/feature-graphic.png`
- **Privacy Policy**: https://robertmatray.github.io/1goshop/privacy-policy.html
- **Content Rating**: IARC - Everyone / PEGI 3 (no objectionable content)
- **Data Safety**: No data collected
- **Target Audience**: 13+
- **Countries**: 176 countries + rest of world
- **Production Status**: v1.2.0 (versionCode 6) submitted for Google review (February 23, 2026)
- **Git tag**: `v1.2.0`

### App Store (iOS)

- **App Store Connect**: https://appstoreconnect.apple.com/apps/6759269751
- **Status**: v1.1.0 on App Store, v1.2.1 on TestFlight (Build #80)
- **Git tag**: `v1.2.1-b80`

### Future Ideas (implement when user base grows)

**1. Shared Shopping List via Firebase** - IMPLEMENTED (Build #76-#80)
- Firebase Realtime Database (not Firestore) with anonymous auth
- 6-character sharing codes, per-item sync, real-time listeners
- Firebase Spark plan (free) — sufficient for family use
- Firebase project: "onegoshop" on matray@realise.sk Google account
- Firebase config: `src/services/firebaseConfig.ts`

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
| Multiple shopping lists | Smart store ordering |
| Share with unlimited people | Statistics & predictions |
| Full history | Purchase reminders |
| All 12 languages | No ads |

### Language Expansion Plan

**Current (12):** SK, EN, DE, HU, UK, CS, ZH, ES, FR, IT, PL, PT

**Pluralization rules:**
- SK, CS, PL: 3 forms (`_one`, `_few`, `_other`)
- All others: 2 forms (`_one`, `_other`)

**Added in v1.2.0:** ES, FR, IT, PL, PT

**Potential next:**
- **JA** (Japanese) - very high iOS penetration (~70M iOS)
- **KO** (Korean) - South Korea, high spending (~25M iOS)
- **TR** (Turkish) - growing market (~20M iOS)
- **NL** (Dutch) - Netherlands + Belgium, high purchasing power

### Regression Testing Strategy (February 25, 2026)

**Current state**: Zero automated tests (0% coverage). Only `npm run verify` (TypeScript typecheck + lint).

**Recommended approach**: Maestro E2E testing (YAML-based, declaratívne, funguje na iOS simulátore aj Android emulátore).

#### Why Maestro

- YAML syntax, žiadny test kód - jednoduché na údržbu
- Testuje reálne gestá (swipe, tap, long-press, scroll) - kritické pre 1GoShop
- Funguje na iOS aj Android s rovnakou syntaxou
- Open-source CLI zadarmo, voliteľný platený cloud

#### Cenová analýza

| Prístup | Mesačné náklady | Vhodnosť |
|---------|-----------------|----------|
| Maestro CLI lokálne | $0 | Spúšťať pred releaseom manuálne |
| Maestro Cloud Free | $0 | $10 kreditov mesačne (~5-10 runov) |
| GitHub Actions (Free plán) | $0-50 | Android zadarmo, iOS 10x multiplikátor |
| Maestro Cloud platený | $125/mes | Plná automatizácia s paralelnými testami |
| Self-hosted Mac Mini | ~$500 jednorazovo | Najlepší ROI dlhodobo |

**GitHub Actions macOS runner**: 10x minute multiplier (2,000 free min = 200 macOS min). Jeden iOS regression run ~30 min → max ~6-7 runov mesačne na Free pláne.

#### Odporúčaný implementačný plán

**Fáza 1 - Maestro CLI lokálne ($0)**:
- Napísať 10-15 YAML testov pre kritické flows
- Spúšťať pred každým releaseom

**Testy na napísanie (prioritizované)**:
1. Add item → verify visible in list
2. Toggle checked → verify visual state
3. Swipe left (left half) → delete confirmation → confirm
4. Swipe right (left half) → edit item name
5. Swipe right (right half) → +1 quantity
6. Swipe left (right half) → -1 quantity
7. Start shopping → mark bought → finish shopping → verify history
8. Backup export → verify file created
9. Language switch → verify UI text changes
10. Theme switch → verify visual change

**Fáza 2 - CI/CD integrácia (ak user base rastie)**:
- GitHub Actions pre Android (Linux runner, lacný)
- Maestro Cloud Free pre iOS (do 10 runov mesačne)
- Trigger: pred každým App Store/Google Play releaseom

**Fáza 3 - Plná automatizácia (ak monetizácia)**:
- Maestro Cloud platený ($125/mes) alebo self-hosted Mac Mini ($500 jednorazovo)
- Trigger: každý PR + nightly build

#### Technické poznámky

- Maestro nepotrebuje modifikáciu kódu aplikácie
- Vyžaduje development build (nie production) pre testovanie
- EAS build profile `development` už existuje v eas.json
- Maestro Studio (GUI) pomáha s tvorbou testov interaktívne
- Testy sa ukladajú do `.maestro/` adresára

#### Alternatívy (zvážené a zamietnuté)

| Nástroj | Dôvod zamietnutia |
|---------|-------------------|
| Detox (Wix) | Zložitejší setup, vyžaduje natívne build hooky, nestabilný v CI |
| Appium | Príliš ťažkopádny pre jednoduchú shopping list app |
| Jest + RNTL (unit testy) | Netestujú gestá - hlavný risk area 1GoShop |
| Percy/Chromatic (visual) | Len pre web, nie pre natívne mobile |

#### Zdroje

- Maestro: https://maestro.dev
- Maestro docs: https://docs.maestro.dev
- Maestro GitHub: https://github.com/mobile-dev-inc/Maestro
- GitHub Actions pricing: https://docs.github.com/en/billing/reference/actions-runner-pricing

### Known Limitations
- Apple API key has Developer access - cannot create App Store Connect apps via API (manual creation required)
- App Privacy cannot be set via REST API - must be done manually in App Store Connect
- iCloud sync not working (app not visible in iCloud settings - requires CloudKit entitlement, not worth the effort)
- Firebase Spark plan: 100 simultaneous connections, 1GB storage, 10GB/month transfer (sufficient for family app)

### Firebase Project Details
- **Project**: onegoshop
- **Google account**: matray@realise.sk
- **Region**: europe-west1
- **Auth**: Anonymous Authentication enabled
- **Database**: Realtime Database
- **Security Rules**: Members-only read/write, sharing codes readable by any authenticated user
- **Plan**: Spark (free)
