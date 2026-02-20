# Google Play Store Listing - 1GoShop

## Basic Information

**App name:** 1GoShop
**Package name:** com.robertmatray.onegoshop

**Short description (max 80 chars):**
SK: Jednoduchý nákupný zoznam s gestami a históriou nákupov.
EN: Simple shopping list with gesture controls and shopping history.

**Full description (max 4000 chars):**

### Slovak (SK) - Primary
1GoShop je jednoduchý a intuitívny nákupný zoznam pre každodenné nakupovanie.

Funkcie:
- Pridávanie, úprava a mazanie položiek
- Ovládanie gestami: potiahnutím doprava/doľava meníte množstvo, mažete alebo upravujete
- Aktívny režim nákupu: označujte položky ako kúpené priamo v obchode
- História nákupov so štatistikami
- Prispôsobiteľná farba aplikácie
- Záloha a obnova dát
- Podpora 7 jazykov (SK, EN, DE, HU, UK, CS, ZH)
- Svetlá a tmavá téma
- Interaktívny tutoriál pre nových používateľov

Všetky dáta zostávajú na vašom zariadení. Žiadna registrácia, žiadny server.

### English (EN)
1GoShop is a simple and intuitive shopping list for everyday shopping.

Features:
- Add, edit, and delete items
- Gesture controls: swipe right/left to change quantity, delete, or edit
- Active shopping mode: mark items as bought while in the store
- Shopping history with statistics
- Customizable accent color
- Data backup and restore
- 7 language support (SK, EN, DE, HU, UK, CS, ZH)
- Light and dark theme
- Interactive tutorial for new users

All data stays on your device. No registration, no server.

---

## Categorization

**Application type:** Application
**Category:** Shopping
**Tags:** shopping list, grocery list, shopping, list, nákupný zoznam

---

## Contact details

**Email:** robert.matray@gmail.com
**Privacy policy URL:** https://robertmatray.github.io/1goshop/privacy-policy.html
**Support URL:** https://robertmatray.github.io/1goshop/

---

## Content rating

Complete the content rating questionnaire in Google Play Console.
Expected rating: Everyone (PEGI 3 / ESRB E)
- No violence, no gambling, no user-generated content, no ads, no in-app purchases
- No personal data collected

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

## Internal Testing Setup Steps

1. Go to: https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: 1GoShop
   - Default language: Slovak - slovencina
   - App or game: App
   - Free or paid: Free
4. Accept declarations and create app

5. Go to "Internal testing" under "Testing"
6. Click "Create new release"
7. Upload the AAB file (or use EAS auto-submit)
8. Add release notes:
   ```
   SK: Prvá verzia 1GoShop - nákupný zoznam s gestami, históriou a 7 jazykmi.
   EN: First version of 1GoShop - shopping list with gestures, history, and 7 languages.
   ```
9. Review and start rollout

10. Go to "Testers" tab
11. Create email list with tester emails
12. Share the opt-in URL with testers

---

## Service Account (for automatic uploads via EAS)

Using shared service account from 4ka Zdravie project:
- **File:** `internals/google-play/service-account.json`
- **Email:** play-store-upload@my-project-1541273915859.iam.gserviceaccount.com

**IMPORTANT:** In Google Play Console, you must:
1. Go to Settings > API access
2. Find the service account
3. Grant access to 1GoShop app
4. Permissions: "Release to production, exclude devices, and use Play App Signing"

---

## EAS Commands

```bash
# Build production Android AAB
npx eas-cli build --platform android --profile production --non-interactive

# Submit to Google Play (internal testing track)
npx eas-cli submit --platform android --latest --non-interactive

# Build + auto-submit in one step
npx eas-cli build --platform android --profile production --non-interactive --auto-submit
```
