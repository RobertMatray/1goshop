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
- **i18next** for i18n (SK + EN)
- **React Navigation** (native stack, 2 screens)

### File Structure

```
src/
  index.ts                    # Entry point (imports unistyles, registers App)
  App.tsx                     # Root component with providers
  unistyles.ts                # Theme config (light + dark)
  navigation/
    AppNavigator.tsx           # Stack navigator (2 screens)
  screens/
    ShoppingListScreen/
      ShoppingListScreen.tsx   # Main screen - DraggableFlatList with footer
      components/
        ShoppingListItem.tsx   # Swipeable item (pan, tap, drag handle)
        AddItemInput.tsx       # Text input + add button
        EmptyListPlaceholder.tsx
    SettingsScreen/
      SettingsScreen.tsx       # Language + theme toggle
  stores/
    ShoppingListStore.ts       # Items CRUD + AsyncStorage persistence
    ThemeStore.ts              # Theme preference (auto/light/dark)
  i18n/
    i18n.ts                    # i18next setup (SK + EN)
    locales/
      sk.json
      en.json
  types/
    shopping.ts                # ShoppingItem interface
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
```

### Gesture Design (v1.0.0)

The item row is divided into **left half** and **right half**. The gesture action depends on which half you start the swipe from.

| Gesture | Where | Action | Visual Feedback |
|---------|-------|--------|-----------------|
| Swipe RIGHT (>30px) | Left half | +1 quantity | Green bg with "+1" (aligned left) |
| Swipe LEFT (>30px) | Left half | -1 quantity | Orange bg with "-1" (aligned right) |
| Swipe LEFT (>30px) | Right half | Delete with confirmation | Red bg with trash (aligned right) |
| Tap | Anywhere | Toggle checked/unchecked | Strikethrough + checkmark |
| Long press ☰ icon | Drag handle | Reorder (drag up/down) | Item lifts, others shift |

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
  - CRUD: addItem, removeItem, toggleChecked, incrementQuantity, decrementQuantity
  - setItems (for drag reorder), reorderItems(fromIndex, toIndex)
  - clearChecked, clearAll
  - Persistence via `persist()` helper function (fire-and-forget)
  - On load: items sorted by order and reindexed (0,1,2...) to fix any gaps

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

**IMPORTANT**: `npx eas-cli submit --non-interactive` does NOT work for this project because EAS CLI cannot configure API keys non-interactively. Use `scripts/submit-via-api.mjs` instead - it calls Expo's GraphQL API directly with the API key embedded.

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

## Current Status (v1.0.0 - February 17, 2026)

### Implemented (all working on TestFlight)
- Shopping list CRUD (add, remove, toggle checked, quantity +1/-1, reorder)
- Gesture controls: left half swipe (+1/-1), right half swipe (delete with confirm), tap (toggle), long press drag handle (reorder)
- DraggableFlatList with auto-scroll during drag (both directions)
- Checked items stay in place (no auto-sorting)
- Footer with item count, clear checked button, gesture hints
- Safe area support (footer visible above home indicator)
- AsyncStorage persistence with order reindexing on load
- Light/dark theme with adaptive system theme
- SK + EN translations
- Settings screen (language + theme toggle)
- Haptic feedback on all gestures
- TypeScript strict mode passes
- Successfully deployed to TestFlight (Build #15) and running on iPhone

### Build & Deploy Status

**EAS Project**: `f6744446-31a1-40f5-abe9-77e7dc41a501`
**Bundle ID registered**: `com.robertmatray.onegoshop` (Apple Developer Portal ID: L6PPTCB3X6)
**Provisioning Profile**: f649b342-4c71-4d84-98c3-cc22a77085ba (ACTIVE, expires 2026-12-12)
**Distribution Certificate**: 28T88DA5Q5 (shared with moja4ka-zdravie)

**Latest successful build**: Build #15 (v1.0.0)
- EAS Build ID: `266bfbec-574e-4406-9947-87597ee3856d`
- Git tag: `v1.0.0`

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
| #15 | Feb 17 | Fix footer layout (listWrapper), reindex order on load |

### Scripts (for CI/CD automation)

- `scripts/submit-via-api.mjs` - Submit IPA to TestFlight via Expo GraphQL API (auto-detects latest build)
- `scripts/check-submission.mjs` - Check submission status via Expo GraphQL API
- `scripts/fetch-crashes.mjs` - Fetch crash reports from App Store Connect API
- `scripts/fetch-crash-log.mjs` - Fetch specific crash log details

### Not Yet Done
- No custom app icon (uses Expo default)
- No splash screen customization
- No Android build/deploy yet

### Known Limitations
- Apple API key has Developer access - cannot create App Store Connect apps via API (manual creation required)
- `npx eas-cli submit --non-interactive` does NOT work - must use `scripts/submit-via-api.mjs`
