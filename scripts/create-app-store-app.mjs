/**
 * Create App in App Store Connect via Apple App Store Connect API v1
 *
 * This script uses the App Store Connect API to programmatically create
 * a new app record in App Store Connect.
 *
 * Prerequisites:
 *   - Bundle ID (com.robertmatray.onegoshop) already registered in Apple Developer Portal
 *   - Apple API key with "Admin" or "App Manager" access level
 *     (Developer-level keys CANNOT create apps, only read/update them)
 *
 * Usage:
 *   node scripts/create-app-store-app.mjs
 *   node scripts/create-app-store-app.mjs --key-id NEW_KEY_ID --key-path /path/to/AuthKey.p8
 *
 * To create an Admin-level API key:
 *   1. Go to https://appstoreconnect.apple.com/access/integrations/api
 *   2. Click "+" to create a new key
 *   3. Name: "Admin Key" (or anything)
 *   4. Access: Select "Admin" or "App Manager"
 *   5. Click "Generate"
 *   6. Download the .p8 file (only available once!)
 *   7. Note the Key ID shown in the table
 *   8. Run: node scripts/create-app-store-app.mjs --key-id YOUR_KEY_ID --key-path /path/to/AuthKey.p8
 */

import jwt from 'jsonwebtoken'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)

function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  keyId: getArg('key-id') || '79PJWGG49Z',
  issuerId: getArg('issuer-id') || '69a6de87-7e92-47e3-e053-5b8c7c11a4d1',
  privateKeyPath:
    getArg('key-path') ||
    path.join(PROJECT_ROOT, 'internals', 'appstore-api', 'AuthKey_79PJWGG49Z.p8'),
  apiHost: 'api.appstoreconnect.apple.com',

  // App details
  appName: getArg('name') || '1GoShop',
  primaryLocale: getArg('locale') || 'sk-SK',
  sku: getArg('sku') || 'onegoshop',
  bundleIdResourceId: getArg('bundle-id') || 'L6PPTCB3X6', // Resource ID for com.robertmatray.onegoshop
}

// ---------------------------------------------------------------------------
// JWT Token Generation
// ---------------------------------------------------------------------------

function createAppleJWT() {
  console.log('Step 1: Creating JWT token for Apple API authentication...')

  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: CONFIG.issuerId,
    iat: now,
    exp: now + 20 * 60, // 20 minutes (max allowed)
    aud: 'appstoreconnect-v1',
  }

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: CONFIG.keyId,
      typ: 'JWT',
    },
  })

  console.log('  JWT token created successfully')
  console.log(`  Issuer: ${CONFIG.issuerId}`)
  console.log(`  Key ID: ${CONFIG.keyId}`)
  console.log(`  Key file: ${CONFIG.privateKeyPath}`)
  console.log(`  Expires: ${new Date((now + 20 * 60) * 1000).toISOString()}`)

  return token
}

// ---------------------------------------------------------------------------
// HTTP Client for Apple API
// ---------------------------------------------------------------------------

function appleApiRequest(method, apiPath, token, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr)
    }

    const options = {
      hostname: CONFIG.apiHost,
      path: `/v1${apiPath}`,
      method: method,
      headers: headers,
    }

    console.log(`  >> ${method} https://${CONFIG.apiHost}/v1${apiPath}`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        console.log(`  << ${res.statusCode}`)
        try {
          if (res.statusCode === 204) {
            resolve({ statusCode: res.statusCode, data: null })
            return
          }

          const parsed = data ? JSON.parse(data) : null
          if (res.statusCode >= 400) {
            resolve({ statusCode: res.statusCode, data: parsed, raw: data })
          } else {
            resolve({ statusCode: res.statusCode, data: parsed })
          }
        } catch (e) {
          reject(
            new Error(
              `Failed to parse response (status ${res.statusCode}): ${data.substring(0, 1000)}`
            )
          )
        }
      })
    })

    req.on('error', reject)

    if (bodyStr) {
      req.write(bodyStr)
    }

    req.end()
  })
}

// ---------------------------------------------------------------------------
// Step 2: Verify JWT and list existing apps
// ---------------------------------------------------------------------------

async function verifyAndListApps(token) {
  console.log('\nStep 2: Verifying JWT by listing existing apps...')
  const result = await appleApiRequest('GET', '/apps?limit=10', token)

  if (result.statusCode >= 400) {
    const errors = result.data?.errors
      ?.map((e) => `${e.status} ${e.title}: ${e.detail}`)
      .join('\n  ')
    throw new Error(`JWT verification failed:\n  ${errors}`)
  }

  const apps = result.data?.data || []
  console.log(`  Found ${apps.length} existing app(s):`)
  for (const a of apps) {
    console.log(`    - ${a.attributes.name} (${a.attributes.bundleId}) [ID: ${a.id}]`)
  }

  // Check if app with this bundle ID already exists
  const existing = apps.find(
    (a) => a.attributes.bundleId === 'com.robertmatray.onegoshop'
  )
  if (existing) {
    console.log(
      `\n  App with bundle ID com.robertmatray.onegoshop already exists! ID: ${existing.id}`
    )
    return existing
  }

  return null
}

// ---------------------------------------------------------------------------
// Step 3: Create App in App Store Connect
// ---------------------------------------------------------------------------

async function createApp(token) {
  console.log('\nStep 3: Creating app in App Store Connect...')
  console.log(`  App Name:       ${CONFIG.appName}`)
  console.log(`  Primary Locale: ${CONFIG.primaryLocale}`)
  console.log(`  SKU:            ${CONFIG.sku}`)
  console.log(`  Bundle ID:      ${CONFIG.bundleIdResourceId}`)

  const body = {
    data: {
      type: 'apps',
      attributes: {
        name: CONFIG.appName,
        primaryLocale: CONFIG.primaryLocale,
        sku: CONFIG.sku,
      },
      relationships: {
        bundleId: {
          data: {
            id: CONFIG.bundleIdResourceId,
            type: 'bundleIds',
          },
        },
      },
    },
  }

  console.log('\n  Request body:')
  console.log(JSON.stringify(body, null, 4))

  const result = await appleApiRequest('POST', '/apps', token, body)

  if (result.statusCode >= 400) {
    const errors = result.data?.errors || []
    const errorMessages = errors.map((e) => `${e.status} ${e.title}: ${e.detail}`).join('\n  ')

    // Check for specific 403 - role issue
    const isForbidden = errors.some(
      (e) => e.code === 'FORBIDDEN_ERROR' && e.detail?.includes("does not allow 'CREATE'")
    )

    if (isForbidden) {
      throw new Error(
        `API KEY PERMISSION ERROR: Your API key (${CONFIG.keyId}) has "Developer" access level.\n` +
          `  Creating apps requires "Admin" or "App Manager" access level.\n\n` +
          `  To fix this:\n` +
          `  1. Go to https://appstoreconnect.apple.com/access/integrations/api\n` +
          `  2. Create a new API key with "Admin" access level\n` +
          `  3. Download the .p8 file\n` +
          `  4. Re-run this script:\n` +
          `     node scripts/create-app-store-app.mjs --key-id NEW_KEY_ID --key-path /path/to/AuthKey_NEW.p8`
      )
    }

    throw new Error(`API Error ${result.statusCode}:\n  ${errorMessages}`)
  }

  const app = result.data?.data

  if (!app) {
    throw new Error('Failed to create app: ' + JSON.stringify(result.data, null, 2))
  }

  return app
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70))
  console.log(' Create App in App Store Connect')
  console.log(' Apple App Store Connect API v1')
  console.log('='.repeat(70))
  console.log()
  console.log(`  App Name:       ${CONFIG.appName}`)
  console.log(`  Primary Locale: ${CONFIG.primaryLocale}`)
  console.log(`  SKU:            ${CONFIG.sku}`)
  console.log(`  Bundle ID:      ${CONFIG.bundleIdResourceId}`)
  console.log(`  API Key:        ${CONFIG.keyId}`)
  console.log(`  Key File:       ${CONFIG.privateKeyPath}`)
  console.log()

  try {
    // Step 1: Create JWT
    const token = createAppleJWT()

    // Step 2: Verify JWT and check existing apps
    const existingApp = await verifyAndListApps(token)

    if (existingApp) {
      console.log('\n' + '='.repeat(70))
      console.log(' APP ALREADY EXISTS')
      console.log('='.repeat(70))
      console.log()
      console.log(`  App Store Connect App ID: ${existingApp.id}`)
      console.log(`  App Name:                 ${existingApp.attributes.name}`)
      console.log(`  Bundle ID:                ${existingApp.attributes.bundleId}`)
      console.log(`  SKU:                      ${existingApp.attributes.sku}`)
      console.log(`  Primary Locale:           ${existingApp.attributes.primaryLocale}`)
      return
    }

    // Step 3: Create the app
    const app = await createApp(token)

    console.log('\n' + '='.repeat(70))
    console.log(' APP CREATED SUCCESSFULLY')
    console.log('='.repeat(70))
    console.log()
    console.log(`  App Store Connect App ID: ${app.id}`)
    console.log(`  App Name:                 ${app.attributes.name}`)
    console.log(`  Bundle ID:                ${app.attributes.bundleId}`)
    console.log(`  SKU:                      ${app.attributes.sku}`)
    console.log(`  Primary Locale:           ${app.attributes.primaryLocale}`)
    console.log()
    console.log('  Full response:')
    console.log(JSON.stringify(app, null, 4))
    console.log()
    console.log('  Next steps:')
    console.log(`  1. Update app.config.ts with App Store Connect ID: ${app.id}`)
    console.log('  2. Run EAS build: npx eas-cli build --platform ios --profile production')
    console.log('  3. Submit to TestFlight: npx eas-cli submit --platform ios --latest')
  } catch (error) {
    console.error('\n  ERROR:', error.message)
    process.exit(1)
  }
}

main()
