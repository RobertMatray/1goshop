/**
 * Verify App Store Territory Availability for 1GoShop
 *
 * Quick check to confirm the territory availability was set correctly.
 *
 * Usage:
 *   node scripts/verify-territory-availability.mjs
 */

import jwt from 'jsonwebtoken'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

const CONFIG = {
  keyId: '79PJWGG49Z',
  issuerId: '69a6de87-7e92-47e3-e053-5b8c7c11a4d1',
  privateKeyPath: path.join(PROJECT_ROOT, 'internals', 'appstore-api', 'AuthKey_79PJWGG49Z.p8'),
  apiHost: 'api.appstoreconnect.apple.com',
  appId: '6759269751',
}

function createAppleJWT() {
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: CONFIG.issuerId,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
  }
  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: CONFIG.keyId, typ: 'JWT' },
  })
}

function appleApiRequest(method, apiPath, token) {
  return new Promise((resolve, reject) => {
    const fullPath = apiPath.startsWith('/v2') ? apiPath : `/v1${apiPath}`
    const options = {
      hostname: CONFIG.apiHost,
      path: fullPath,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }

    console.log(`  >> ${method} https://${CONFIG.apiHost}${fullPath}`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        console.log(`  << ${res.statusCode}`)
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve({ statusCode: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, raw: data })
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function main() {
  console.log('='.repeat(70))
  console.log(' Verify App Store Territory Availability - 1GoShop')
  console.log(' App ID: ' + CONFIG.appId)
  console.log('='.repeat(70))

  const token = createAppleJWT()

  // 1. Check app info
  console.log('\n--- App Info ---')
  const appResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}?fields[apps]=name,bundleId,sku,primaryLocale`,
    token
  )
  if (appResult.statusCode < 400) {
    const app = appResult.data?.data
    console.log(`  App Name: ${app?.attributes?.name}`)
    console.log(`  Bundle ID: ${app?.attributes?.bundleId}`)
    console.log(`  SKU: ${app?.attributes?.sku}`)
  }

  // 2. Check app store versions
  console.log('\n--- App Store Versions ---')
  const versionResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState,platform`,
    token
  )
  if (versionResult.statusCode < 400) {
    const versions = versionResult.data?.data || []
    for (const v of versions) {
      console.log(`  v${v.attributes.versionString} | State: ${v.attributes.appStoreState} | Platform: ${v.attributes.platform}`)
    }
  }

  // 3. Check v2 app availability
  console.log('\n--- v2 App Availability ---')
  const v2Result = await appleApiRequest(
    'GET',
    `/v2/apps/${CONFIG.appId}/appAvailability`,
    token
  )
  if (v2Result.statusCode < 400) {
    const avail = v2Result.data?.data
    console.log(`  Available in new territories: ${avail?.attributes?.availableInNewTerritories}`)
    console.log(`  Full response:`, JSON.stringify(v2Result.data, null, 4))
  } else {
    console.log(`  ERROR:`, JSON.stringify(v2Result.data?.errors, null, 2))
  }

  // 4. Check territory availabilities
  console.log('\n--- Territory Availabilities (v2) ---')
  const taResult = await appleApiRequest(
    'GET',
    `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?limit=200`,
    token
  )
  if (taResult.statusCode < 400) {
    const territories = taResult.data?.data || []
    console.log(`  Total territory availabilities: ${territories.length}`)

    // Count available vs unavailable
    let available = 0
    let unavailable = 0
    const sampleAvailable = []
    const sampleUnavailable = []
    for (const t of territories) {
      if (t.attributes?.available) {
        available++
        if (sampleAvailable.length < 10) {
          sampleAvailable.push(t.id)
        }
      } else {
        unavailable++
        if (sampleUnavailable.length < 10) {
          sampleUnavailable.push(t.id)
        }
      }
    }
    console.log(`  Available: ${available}`)
    console.log(`  Unavailable: ${unavailable}`)
    if (sampleAvailable.length > 0) {
      console.log(`  Sample available: ${sampleAvailable.join(', ')}`)
    }
    if (sampleUnavailable.length > 0) {
      console.log(`  Sample unavailable: ${sampleUnavailable.join(', ')}`)
    }

    // Check if there are more pages
    const nextLink = taResult.data?.links?.next
    if (nextLink) {
      console.log(`  More pages available: ${nextLink}`)
    }

    // Show first few with details
    if (territories.length > 0) {
      console.log('\n  First 5 territory availabilities:')
      for (const t of territories.slice(0, 5)) {
        console.log(`    ${t.id}: available=${t.attributes?.available}, contentStatuses=${JSON.stringify(t.attributes?.contentStatuses)}, preOrderEnabled=${t.attributes?.preOrderEnabled}`)
      }
    }
  } else {
    console.log(`  ERROR:`, JSON.stringify(taResult.data?.errors, null, 2))
  }

  // 5. Check price schedule
  console.log('\n--- Price Schedule ---')
  const priceResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appPriceSchedule?include=baseTerritory,manualPrices`,
    token
  )
  if (priceResult.statusCode < 400) {
    const schedule = priceResult.data
    const baseTerritory = schedule?.included?.find(i => i.type === 'territories')
    const manualPrices = schedule?.included?.filter(i => i.type === 'appPrices') || []
    console.log(`  Base territory: ${baseTerritory?.id}`)
    console.log(`  Manual prices: ${manualPrices.length}`)
    for (const p of manualPrices) {
      console.log(`    - startDate: ${p.attributes?.startDate}, manual: ${p.attributes?.manual}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(' VERIFICATION COMPLETE')
  console.log('='.repeat(70))
  console.log('\n  App Store page: https://apps.apple.com/app/id6759269751')
  console.log('  App Store Connect: https://appstoreconnect.apple.com/apps/6759269751')
  console.log('  Pricing & Availability: https://appstoreconnect.apple.com/apps/6759269751/distribution/pricing')
  console.log('')
  console.log('  NOTE: It may take 24-48 hours for the app to become visible in the App Store')
  console.log('  after territory availability is configured.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
