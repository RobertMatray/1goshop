/**
 * Check content statuses for all territories
 *
 * Analyze why territories show CANNOT_SELL, TRADER_STATUS_NOT_PROVIDED, etc.
 *
 * Usage:
 *   node scripts/check-content-statuses.mjs
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
  return jwt.sign(
    { iss: CONFIG.issuerId, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1' },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: CONFIG.keyId, typ: 'JWT' } }
  )
}

function appleApiRequest(method, apiPath, token, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null
    const fullPath = apiPath.startsWith('/v') ? apiPath : `/v1${apiPath}`
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr)

    const options = { hostname: CONFIG.apiHost, path: fullPath, method, headers }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve({ statusCode: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, raw: data })
        }
      })
    })

    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function main() {
  console.log('='.repeat(70))
  console.log(' Territory Content Status Analysis - 1GoShop')
  console.log('='.repeat(70))

  const token = createAppleJWT()

  // Get all territory availabilities with include territory info
  console.log('\n--- Fetching territory availabilities ---')
  const result = await appleApiRequest(
    'GET',
    `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?include=territory&limit=200`,
    token
  )

  if (result.statusCode >= 400) {
    console.log('ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return
  }

  const territories = result.data?.data || []
  const included = result.data?.included || []

  // Map territory IDs to names
  const territoryMap = {}
  for (const t of included) {
    if (t.type === 'territories') {
      territoryMap[t.id] = t.attributes?.currency || t.id
    }
  }

  // Group by content status combination
  const statusGroups = {}
  for (const t of territories) {
    const statuses = (t.attributes?.contentStatuses || []).sort().join(' + ')
    if (!statusGroups[statuses]) {
      statusGroups[statuses] = []
    }
    // Get territory ID from relationship
    const territoryId = t.relationships?.territory?.data?.id || 'unknown'
    statusGroups[statuses].push(territoryId)
  }

  console.log(`\nTotal territories: ${territories.length}`)
  console.log('\n--- Status Groups ---')
  for (const [status, terrs] of Object.entries(statusGroups)) {
    console.log(`\n  [${status}]: ${terrs.length} territories`)
    console.log(`    ${terrs.join(', ')}`)
  }

  // Check for PROCESSING_TO_AVAILABLE
  const processing = territories.filter(t =>
    (t.attributes?.contentStatuses || []).includes('PROCESSING_TO_AVAILABLE')
  )
  const cannotSell = territories.filter(t =>
    (t.attributes?.contentStatuses || []).includes('CANNOT_SELL')
  )
  const traderNotProvided = territories.filter(t =>
    (t.attributes?.contentStatuses || []).includes('TRADER_STATUS_NOT_PROVIDED')
  )
  const available = territories.filter(t =>
    (t.attributes?.contentStatuses || []).includes('AVAILABLE')
  )

  console.log('\n--- Summary ---')
  console.log(`  PROCESSING_TO_AVAILABLE: ${processing.length}`)
  console.log(`  CANNOT_SELL: ${cannotSell.length}`)
  console.log(`  TRADER_STATUS_NOT_PROVIDED: ${traderNotProvided.length}`)
  console.log(`  AVAILABLE: ${available.length}`)

  // Check if app has trader/DSA info
  console.log('\n--- Checking App Info for DSA/Trader Status ---')
  const appInfoResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appInfos`,
    token
  )
  if (appInfoResult.statusCode < 400) {
    const appInfos = appInfoResult.data?.data || []
    if (appInfos.length > 0) {
      const appInfo = appInfos[0]
      console.log('  App Info ID:', appInfo.id)
      console.log('  Attributes:', JSON.stringify(appInfo.attributes, null, 4))

      // Check ageRatingDeclaration
      console.log('\n--- Age Rating Declaration ---')
      const ageResult = await appleApiRequest(
        'GET',
        `/appInfos/${appInfo.id}/ageRatingDeclaration`,
        token
      )
      if (ageResult.statusCode < 400) {
        console.log('  Age Rating:', JSON.stringify(ageResult.data?.data?.attributes, null, 4))
      } else {
        console.log('  ERROR:', JSON.stringify(ageResult.data?.errors, null, 2))
      }
    }
  }

  // Check if there's a content rights declaration issue
  console.log('\n--- Checking content rights and distribution ---')
  const appResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}?fields[apps]=name,bundleId,contentRightsDeclaration`,
    token
  )
  if (appResult.statusCode < 400) {
    console.log('  Content Rights Declaration:', appResult.data?.data?.attributes?.contentRightsDeclaration)
  }

  console.log('\n' + '='.repeat(70))
  console.log(' ANALYSIS')
  console.log('='.repeat(70))
  console.log('')
  console.log('  Status explanations:')
  console.log('  - PROCESSING_TO_AVAILABLE: Apple is processing the app for this territory.')
  console.log('    This is normal after just setting availability. Should resolve in hours.')
  console.log('')
  console.log('  - CANNOT_SELL: Currently cannot sell in this territory. This is usually')
  console.log('    temporary while processing, or related to regulatory requirements.')
  console.log('')
  console.log('  - TRADER_STATUS_NOT_PROVIDED: EU Digital Services Act (DSA) requires')
  console.log('    trader status declaration for EU territories. This must be set in')
  console.log('    App Store Connect under "App Information" > "Trader Status".')
  console.log('    URL: https://appstoreconnect.apple.com/apps/6759269751/appstore/info')
  console.log('')
  console.log('  RECOMMENDED ACTIONS:')
  console.log('  1. Set Trader Status in App Store Connect for EU compliance (DSA)')
  console.log('  2. Wait 24-48h for PROCESSING_TO_AVAILABLE to complete')
  console.log('  3. Check app page: https://apps.apple.com/app/id6759269751')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
