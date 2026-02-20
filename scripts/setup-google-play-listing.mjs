/**
 * Setup Google Play Store listing only (no release changes)
 * Works even with draft apps
 */

import { google } from 'googleapis';
import fs from 'fs';
import crypto from 'crypto';
import https from 'https';

const PACKAGE_NAME = 'com.robertmatray.onegoshop';
const SERVICE_ACCOUNT_PATH = './internals/google-play/service-account.json';

async function getAccessToken() {
  const keyFile = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

  // Create JWT
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: keyFile.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(keyFile.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

async function apiCall(token, method, path, body, contentType) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers['Content-Type'] = contentType;
  else if (body && typeof body === 'object' && !(body instanceof Buffer)) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (body) {
    if (typeof body === 'object' && !(body instanceof Buffer)) {
      options.body = JSON.stringify(body);
    } else {
      options.body = body;
    }
  }

  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function uploadImage(token, editId, language, imageType, filePath) {
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/${editId}/listings/${language}/${imageType}`;
  const fileData = fs.readFileSync(filePath);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png',
      'Content-Length': fileData.length.toString(),
    },
    body: fileData,
  });
  const text = await res.text();
  return { status: res.status, data: text };
}

async function main() {
  console.log('Setting up Google Play Store listing for 1GoShop...\n');

  const token = await getAccessToken();
  console.log('Got access token.');

  // Create edit
  console.log('\n1. Creating edit...');
  const editRes = await apiCall(token, 'POST', 'edits', {});
  if (editRes.status !== 200) {
    console.error('Failed to create edit:', editRes.data);
    process.exit(1);
  }
  const editId = editRes.data.id;
  console.log(`   Edit ID: ${editId}`);

  // SK listing
  console.log('\n2. Setting SK listing...');
  const skRes = await apiCall(token, 'PUT', `edits/${editId}/listings/sk`, {
    language: 'sk',
    title: '1GoShop',
    shortDescription: 'Jednoduchý nákupný zoznam s gestami a históriou nákupov.',
    fullDescription: '1GoShop je jednoduchý a intuitívny nákupný zoznam pre každodenné nakupovanie.\n\nFunkcie:\n• Pridávanie, úprava a mazanie položiek\n• Ovládanie gestami: potiahnutím doprava/doľava meníte množstvo, mažete alebo upravujete\n• Aktívny režim nákupu: označujte položky ako kúpené priamo v obchode\n• História nákupov so štatistikami\n• Prispôsobiteľná farba aplikácie\n• Záloha a obnova dát\n• Podpora 7 jazykov (SK, EN, DE, HU, UK, CS, ZH)\n• Svetlá a tmavá téma\n• Interaktívny tutoriál pre nových používateľov\n\nVšetky dáta zostávajú na vašom zariadení. Žiadna registrácia, žiadny server, žiadne reklamy.',
  });
  console.log(`   Status: ${skRes.status}`, skRes.status === 200 ? 'OK' : JSON.stringify(skRes.data));

  // EN listing
  console.log('\n3. Setting EN listing...');
  const enRes = await apiCall(token, 'PUT', `edits/${editId}/listings/en-US`, {
    language: 'en-US',
    title: '1GoShop',
    shortDescription: 'Simple shopping list with gesture controls and shopping history.',
    fullDescription: '1GoShop is a simple and intuitive shopping list for everyday shopping.\n\nFeatures:\n• Add, edit, and delete items\n• Gesture controls: swipe right/left to change quantity, delete, or edit\n• Active shopping mode: mark items as bought while in the store\n• Shopping history with statistics\n• Customizable accent color\n• Data backup and restore\n• 7 language support (SK, EN, DE, HU, UK, CS, ZH)\n• Light and dark theme\n• Interactive tutorial for new users\n\nAll data stays on your device. No registration, no server, no ads.',
  });
  console.log(`   Status: ${enRes.status}`, enRes.status === 200 ? 'OK' : JSON.stringify(enRes.data));

  // Upload SK screenshots
  console.log('\n4. Uploading SK screenshots...');
  try {
    await apiCall(token, 'DELETE', `edits/${editId}/listings/sk/phoneScreenshots`);
  } catch (e) { /* ignore */ }

  for (const file of ['01.png', '02.png', '03.png', '04.png']) {
    const filePath = `appstore-screenshots/SK/6.7/${file}`;
    if (fs.existsSync(filePath)) {
      const res = await uploadImage(token, editId, 'sk', 'phoneScreenshots', filePath);
      console.log(`   ${file}: ${res.status}`);
    }
  }

  // Upload EN screenshots
  console.log('\n5. Uploading EN screenshots...');
  try {
    await apiCall(token, 'DELETE', `edits/${editId}/listings/en-US/phoneScreenshots`);
  } catch (e) { /* ignore */ }

  for (const file of ['en_01.png', 'en_02.png', 'en_03.png', 'en_04.png']) {
    const filePath = `appstore-screenshots/EN/6.7/${file}`;
    if (fs.existsSync(filePath)) {
      const res = await uploadImage(token, editId, 'en-US', 'phoneScreenshots', filePath);
      console.log(`   ${file}: ${res.status}`);
    }
  }

  // Commit
  console.log('\n6. Committing...');
  const commitRes = await apiCall(token, 'POST', `edits/${editId}:commit`);
  console.log(`   Status: ${commitRes.status}`, commitRes.status === 200 ? 'OK' : JSON.stringify(commitRes.data));

  if (commitRes.status === 200) {
    console.log('\n✅ Store listing updated successfully!');
  } else {
    console.log('\n⚠️ Commit failed. The app may need manual setup in Play Console first.');
    console.log('Listings and screenshots were uploaded to the edit - go to Play Console to review.');
  }

  console.log('\nRemaining manual steps in Play Console:');
  console.log('  1. Content rating questionnaire');
  console.log('  2. Data safety form (no data collected)');
  console.log('  3. Privacy policy URL: https://robertmatray.github.io/1goshop/privacy-policy.html');
  console.log('  4. Feature graphic 1024x500 (optional)');
  console.log('  5. Target audience & category: Shopping');
  console.log('  6. Create production release');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
