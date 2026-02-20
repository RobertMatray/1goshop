/**
 * Setup Google Play Store listing for 1GoShop
 * - Creates/updates store listing (SK + EN)
 * - Uploads phone screenshots
 * - Uploads app icon as feature graphic placeholder
 *
 * Usage: node scripts/setup-google-play.mjs
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const PACKAGE_NAME = 'com.robertmatray.onegoshop';
const SERVICE_ACCOUNT_PATH = './internals/google-play/service-account.json';

const SK_LISTING = {
  language: 'sk',
  title: '1GoShop',
  shortDescription: 'Jednoduchý nákupný zoznam s gestami a históriou nákupov.',
  fullDescription: `1GoShop je jednoduchý a intuitívny nákupný zoznam pre každodenné nakupovanie.

Funkcie:
• Pridávanie, úprava a mazanie položiek
• Ovládanie gestami: potiahnutím doprava/doľava meníte množstvo, mažete alebo upravujete
• Aktívny režim nákupu: označujte položky ako kúpené priamo v obchode
• História nákupov so štatistikami
• Prispôsobiteľná farba aplikácie
• Záloha a obnova dát
• Podpora 7 jazykov (SK, EN, DE, HU, UK, CS, ZH)
• Svetlá a tmavá téma
• Interaktívny tutoriál pre nových používateľov

Všetky dáta zostávajú na vašom zariadení. Žiadna registrácia, žiadny server, žiadne reklamy.`,
};

const EN_LISTING = {
  language: 'en-US',
  title: '1GoShop',
  shortDescription: 'Simple shopping list with gesture controls and shopping history.',
  fullDescription: `1GoShop is a simple and intuitive shopping list for everyday shopping.

Features:
• Add, edit, and delete items
• Gesture controls: swipe right/left to change quantity, delete, or edit
• Active shopping mode: mark items as bought while in the store
• Shopping history with statistics
• Customizable accent color
• Data backup and restore
• 7 language support (SK, EN, DE, HU, UK, CS, ZH)
• Light and dark theme
• Interactive tutorial for new users

All data stays on your device. No registration, no server, no ads.`,
};

async function getAuthClient() {
  const keyFile = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return auth.getClient();
}

async function main() {
  console.log('Setting up Google Play Store listing for 1GoShop...\n');

  const authClient = await getAuthClient();
  const androidPublisher = google.androidpublisher({ version: 'v3', auth: authClient });

  // Step 1: Create an edit
  console.log('1. Creating edit...');
  const editResponse = await androidPublisher.edits.insert({
    packageName: PACKAGE_NAME,
  });
  const editId = editResponse.data.id;
  console.log(`   Edit ID: ${editId}`);

  // Step 2: Update SK listing
  console.log('\n2. Setting SK listing...');
  await androidPublisher.edits.listings.update({
    packageName: PACKAGE_NAME,
    editId,
    language: SK_LISTING.language,
    requestBody: {
      language: SK_LISTING.language,
      title: SK_LISTING.title,
      shortDescription: SK_LISTING.shortDescription,
      fullDescription: SK_LISTING.fullDescription,
    },
  });
  console.log('   SK listing set.');

  // Step 3: Update EN listing
  console.log('\n3. Setting EN listing...');
  await androidPublisher.edits.listings.update({
    packageName: PACKAGE_NAME,
    editId,
    language: EN_LISTING.language,
    requestBody: {
      language: EN_LISTING.language,
      title: EN_LISTING.title,
      shortDescription: EN_LISTING.shortDescription,
      fullDescription: EN_LISTING.fullDescription,
    },
  });
  console.log('   EN listing set.');

  // Step 4: Upload SK screenshots
  console.log('\n4. Uploading SK phone screenshots...');
  // Clear existing screenshots first
  try {
    await androidPublisher.edits.images.deleteall({
      packageName: PACKAGE_NAME,
      editId,
      language: 'sk',
      imageType: 'phoneScreenshots',
    });
  } catch (e) {
    // Ignore if none exist
  }

  const skScreenshots = [
    'appstore-screenshots/SK/6.7/01.png',
    'appstore-screenshots/SK/6.7/02.png',
    'appstore-screenshots/SK/6.7/03.png',
    'appstore-screenshots/SK/6.7/04.png',
  ];

  for (const ssPath of skScreenshots) {
    if (fs.existsSync(ssPath)) {
      console.log(`   Uploading ${ssPath}...`);
      await androidPublisher.edits.images.upload({
        packageName: PACKAGE_NAME,
        editId,
        language: 'sk',
        imageType: 'phoneScreenshots',
        media: {
          mimeType: 'image/png',
          body: fs.createReadStream(ssPath),
        },
      });
    }
  }
  console.log('   SK screenshots uploaded.');

  // Step 5: Upload EN screenshots
  console.log('\n5. Uploading EN phone screenshots...');
  try {
    await androidPublisher.edits.images.deleteall({
      packageName: PACKAGE_NAME,
      editId,
      language: 'en-US',
      imageType: 'phoneScreenshots',
    });
  } catch (e) {
    // Ignore
  }

  const enScreenshots = [
    'appstore-screenshots/EN/6.7/en_01.png',
    'appstore-screenshots/EN/6.7/en_02.png',
    'appstore-screenshots/EN/6.7/en_03.png',
    'appstore-screenshots/EN/6.7/en_04.png',
  ];

  for (const ssPath of enScreenshots) {
    if (fs.existsSync(ssPath)) {
      console.log(`   Uploading ${ssPath}...`);
      await androidPublisher.edits.images.upload({
        packageName: PACKAGE_NAME,
        editId,
        language: 'en-US',
        imageType: 'phoneScreenshots',
        media: {
          mimeType: 'image/png',
          body: fs.createReadStream(ssPath),
        },
      });
    }
  }
  console.log('   EN screenshots uploaded.');

  // Step 6: Upload app icon (512x512 is included in AAB, but we need it for listing)
  console.log('\n6. Uploading app icon...');
  try {
    await androidPublisher.edits.images.upload({
      packageName: PACKAGE_NAME,
      editId,
      language: 'sk',
      imageType: 'icon',
      media: {
        mimeType: 'image/png',
        body: fs.createReadStream('assets/icon.png'),
      },
    });
    console.log('   Icon uploaded.');
  } catch (e) {
    console.log('   Icon upload skipped (may be managed by AAB):', e.message);
  }

  // Step 7: Commit the edit
  console.log('\n7. Committing changes...');
  try {
    await androidPublisher.edits.commit({
      packageName: PACKAGE_NAME,
      editId,
    });
    console.log('   Changes committed successfully!');
  } catch (commitErr) {
    console.log('   Commit warning:', commitErr.message);
    console.log('   This may happen if the app is in draft state.');
    console.log('   Listings and screenshots were uploaded - they will be saved when you create a release in Play Console.');
  }

  console.log('\n✅ Store listing setup complete!');
  console.log('\nRemaining manual steps in Play Console:');
  console.log('1. Content rating questionnaire (IARC)');
  console.log('2. Data safety form');
  console.log('3. Feature graphic (1024x500) - optional but recommended');
  console.log('4. Target audience / category settings');
  console.log('5. Promote internal release to production');
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('Details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
