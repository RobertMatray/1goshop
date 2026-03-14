# Google Play Store Listing - 1GoShop

## Basic Information

**App name:** 1GoShop
**Package name:** com.realise.onegoshop

**Short description (max 80 chars):**
SK: Jednoduchý nákupný zoznam s gestami a zdieľaním v reálnom čase.
EN: Simple shopping list with gestures and real-time sharing.

**Full description (max 4000 chars):**

### Slovak (SK) - Primary
1GoShop je jednoduchý a intuitívny nákupný zoznam pre každodenné nakupovanie.

Funkcie:
- Viacero nákupných zoznamov pre rôzne obchody
- Zdieľanie zoznamov s rodinou a priateľmi v reálnom čase
- Aktívny režim nákupu: označujte položky ako kúpené priamo v obchode
- História nákupov so štatistikami
- Ovládanie gestami: potiahnutím doprava/doľava meníte množstvo, mažete alebo upravujete
- Import zo schránky (Apple Notes, Google Sheets...)
- Záloha a obnova dát
- Prispôsobiteľná farba aplikácie
- Svetlá a tmavá téma
- Podpora 12 jazykov (SK, EN, DE, HU, UK, CS, ZH, ES, FR, IT, PL, PT)
- Offline režim s automatickou synchronizáciou pri pripojení

Všetky dáta zostávajú na vašom zariadení. Žiadna registrácia, žiadny server (okrem voliteľného zdieľania cez Firebase).

### English (EN)
1GoShop is a simple and intuitive shopping list for everyday shopping.

Features:
- Multiple shopping lists for different stores
- Real-time list sharing with family and friends
- Active shopping mode: mark items as bought while in the store
- Shopping history with statistics
- Gesture controls: swipe right/left to change quantity, delete, or edit
- Import from clipboard (Apple Notes, Google Sheets...)
- Data backup and restore
- Customizable accent color
- Light and dark theme
- 12 language support (SK, EN, DE, HU, UK, CS, ZH, ES, FR, IT, PL, PT)
- Offline mode with automatic sync on reconnection

All data stays on your device. No registration, no server (except optional sharing via Firebase).

---

## Categorization

**Application type:** Application
**Category:** Shopping
**Tags:** shopping list, grocery list, shopping, list, nákupný zoznam, zdieľanie

---

## Contact details

**Email:** matray@realise.sk
**Privacy policy URL:** https://1goshop.realise.sk/privacy-policy.html
**Support URL:** https://1goshop.realise.sk/

---

## Content rating

Complete the content rating questionnaire in Google Play Console.
Expected rating: Everyone (PEGI 3 / ESRB E)
- No violence, no gambling, no user-generated content, no ads, no in-app purchases
- No personal data collected
- Firebase anonymous auth used for sharing (no accounts)

---

## Screenshots needed

For Google Play you need:
- Phone screenshots: 2-8 screenshots, 16:9 or 9:16 aspect ratio
- Recommended dimensions: 1080 x 1920 px (portrait)
- 7-inch tablet screenshots (optional)
- 10-inch tablet screenshots (optional)

Existing screenshots at: `appstore-screenshots/` (SK + EN, 4 each)
May need resizing for Google Play requirements.

---

## Feature graphic

Required: 1024 x 500 px PNG or JPEG
This appears at the top of your store listing.

---

## App icon

512 x 512 px PNG (32-bit with alpha)
Already in app assets: `assets/icon.png`

---

## Production Release Checklist

### App Store (iOS)
1. [ ] App Store Connect: Set Privacy Policy URL to https://1goshop.realise.sk/privacy-policy.html
2. [ ] App Store Connect: Set Support URL to https://1goshop.realise.sk/
3. [ ] App Store Connect: Set Marketing URL to https://1goshop.realise.sk/
4. [ ] Upload screenshots (SK + EN)
5. [ ] Fill App Store description (SK + EN)
6. [ ] Set age rating (4+)
7. [ ] App Review Information: contact email matray@realise.sk
8. [ ] Submit for review

### Google Play (Android)
1. [ ] Store listing: Fill short/full description (SK + EN)
2. [ ] Upload screenshots
3. [ ] Upload feature graphic (1024x500)
4. [ ] Privacy policy URL: https://1goshop.realise.sk/privacy-policy.html
5. [ ] Content rating questionnaire
6. [ ] Target audience and content: Not designed for children
7. [ ] Data safety: No personal data collected, Firebase anonymous auth
8. [ ] Change track from internal to production
9. [ ] Submit for review

---

## Service Account (for automatic uploads via EAS)

Using service account:
- **File:** `internals/google-play/service-account.json`
- **Email:** play-publish@goshop-488315.iam.gserviceaccount.com

**IMPORTANT:** In Google Play Console, you must:
1. Go to Settings > API access
2. Find the service account
3. Grant access to 1GoShop app
4. Permissions: "Release to production, exclude devices, and use Play App Signing"

---

## EAS Commands

```bash
# Build production
npx eas-cli build --platform android --profile production --non-interactive
npx eas-cli build --platform ios --profile production --non-interactive

# Submit to stores
npx eas-cli submit --platform android --latest --non-interactive
npx eas-cli submit --platform ios --latest --non-interactive
```
