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
      ShoppingListScreen.tsx   # Main screen - FlatList with sorted items
      components/
        ShoppingListItem.tsx   # Swipeable item (gestures: pan, tap)
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

### Gesture Design

| Gesture | Action | Visual Feedback |
|---------|--------|-----------------|
| Swipe RIGHT (>80px) | +1 quantity | Green bg with "+1" |
| Swipe LEFT (>80px) | Reveal delete button | Red bg with trash |
| Swipe LEFT (>160px) | Auto-delete | Item slides off |
| Tap | Toggle checked/unchecked | Strikethrough |

### State Management

- **ShoppingListStore**: Zustand store with manual AsyncStorage persistence
  - `items: ShoppingItem[]` - all items
  - CRUD: addItem, removeItem, toggleChecked, incrementQuantity, decrementQuantity
  - reorderItems(fromIndex, toIndex)
  - clearChecked, clearAll
  - Persistence via `persist()` helper function (fire-and-forget)

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

### Apple Credentials
- **Apple Team ID**: `U5Q2UN4QKJ`
- **Apple ID**: `robert.matray@gmail.com`
- **Apple API Key ID**: `79PJWGG49Z`
- **Apple API Key Issuer ID**: `69a6de87-7e92-47e3-e053-5b8c7c11a4d1`
- **Apple API Key**: Copy from `c:\Users\robert.matray\superapp-ai-poc\internals\appstore-api\AuthKey_79PJWGG49Z.p8`

### EAS Build

```bash
# EAS project needs to be initialized first:
# npx eas-cli init (sets projectId in app.config.ts)

# Build iOS for TestFlight
npx eas-cli build --platform ios --profile production --non-interactive

# Submit to TestFlight
npx eas-cli submit --platform ios --latest --non-interactive

# Build Android APK for preview
npx eas-cli build --platform android --profile preview
```

### EAS Configuration (eas.json)
- `appVersionSource: "remote"` - versions managed by EAS
- `autoIncrement: true` - build number auto-increments
- `cache.disabled: true` for production builds
- `credentialsSource: "remote"` for iOS

### Environment Variables for CI/CD
```bash
EXPO_ASC_API_KEY_PATH="./internals/appstore-api/AuthKey_79PJWGG49Z.p8"
EXPO_ASC_KEY_ID="79PJWGG49Z"
EXPO_ASC_ISSUER_ID="69a6de87-7e92-47e3-e053-5b8c7c11a4d1"
EXPO_APPLE_TEAM_ID="U5Q2UN4QKJ"
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
```

### First-time Deploy Steps

1. Copy Apple API key to `internals/appstore-api/AuthKey_79PJWGG49Z.p8`
2. Run `npx eas-cli init` (creates new project ID, updates app.config.ts)
3. First build must be INTERACTIVE to create provisioning profile:
   `npx eas-cli build --platform ios --profile production`
4. EAS will auto-create bundle ID in Apple Developer Portal
5. EAS will auto-create app in App Store Connect on first submit
6. Submit: `npx eas-cli submit --platform ios --latest`

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

## Current Status (February 2026)

### Implemented
- Shopping list CRUD (add, remove, toggle, quantity, reorder)
- Swipe gestures (right=+1, left=delete, tap=check)
- AsyncStorage persistence
- Light/dark theme with adaptive system theme
- SK + EN translations
- Settings screen (language + theme toggle)
- Haptic feedback on gestures
- TypeScript strict mode passes

### Build Status (February 16, 2026)

**EAS Project**: `f6744446-31a1-40f5-abe9-77e7dc41a501`
**Bundle ID registered**: `com.robertmatray.onegoshop` (Apple Developer Portal ID: L6PPTCB3X6)
**Provisioning Profile**: f649b342-4c71-4d84-98c3-cc22a77085ba (ACTIVE, expires 2026-12-12)
**Distribution Certificate**: 28T88DA5Q5 (shared with moja4ka-zdravie)

**Latest successful build**: Build #8
- EAS Build ID: `ec382662-ec35-4661-ad17-7ea6b376d15e`
- IPA: https://expo.dev/artifacts/eas/vaPLf6iKFg3ZPHfKDu2Xi1.ipa
- Build logs: https://expo.dev/accounts/robertmatray/projects/1goshop/builds/ec382662-ec35-4661-ad17-7ea6b376d15e

**TestFlight submission**: PENDING - requires App Store Connect app creation
- API key 79PJWGG49Z has Developer access (cannot create apps via API)
- App must be created manually in App Store Connect or via Admin API key
- Once created, add `ascAppId` to eas.json submit.production.ios section
- Then run: `npx eas-cli submit --platform ios --latest --non-interactive`

### Scripts (for CI/CD automation)

- `scripts/generate-provisioning-profile.mjs` - Generate iOS provisioning profile via Apple API
- `scripts/setup-credentials-api.mjs` - Setup EAS credentials via Expo GraphQL API
- `scripts/create-app-store-app.mjs` - Create app in App Store Connect (requires Admin API key)

### Not Yet Done
- App Store Connect app not created yet (needed for TestFlight)
- No custom app icon (uses Expo default)
- No drag-to-reorder (long press) - only swipe gestures implemented
- No splash screen customization

### Known Issues
- Long press + drag reorder is not implemented yet (only swipe right/left and tap)
- App icon is default Expo icon
- Apple API key has Developer access - need Admin key for creating App Store Connect apps
