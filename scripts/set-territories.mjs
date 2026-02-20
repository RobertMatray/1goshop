/**
 * Set App Store Territory Availability for 1GoShop
 *
 * Sets specific territories based on supported languages:
 * SK, EN, DE, HU, UK, CS, ZH
 *
 * Strategy: Explore all available API operations to find a working approach.
 *
 * Usage:
 *   node scripts/set-territories.mjs
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
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  keyId: '79PJWGG49Z',
  issuerId: '69a6de87-7e92-47e3-e053-5b8c7c11a4d1',
  privateKeyPath: path.join(PROJECT_ROOT, 'internals', 'appstore-api', 'AuthKey_79PJWGG49Z.p8'),
  apiHost: 'api.appstoreconnect.apple.com',
  appId: '6759269751',
}

// ---------------------------------------------------------------------------
// Desired Territories (organized by language reason)
// ---------------------------------------------------------------------------

const DESIRED_TERRITORIES = new Set([
  // Slovak (SK)
  'SVK',
  // Czech (CS)
  'CZE',
  // Hungarian (HU)
  'HUN',
  // Ukrainian (UK)
  'UKR',
  // German (DE)
  'DEU', 'AUT', 'CHE', 'LIE', 'LUX', 'BEL',
  // Chinese (ZH)
  'CHN', 'HKG', 'TWN', 'SGP', 'MAC',
  // English (EN) - official or widely spoken
  'USA', 'GBR', 'CAN', 'AUS', 'NZL', 'IRL', 'ZAF', 'IND', 'PHL', 'MYS',
  'NGA', 'KEN', 'GHA', 'TZA', 'UGA', 'RWA', 'ZMB', 'ZWE', 'BWA', 'NAM',
  'MWI', 'GMB', 'SLE', 'LBR', 'CMR', 'ETH', 'PAK', 'BGD', 'LKA', 'MMR',
  'NPL', 'BHR', 'QAT', 'ARE', 'OMN', 'KWT', 'SAU', 'JOR', 'ISR', 'EGY',
  'MAR', 'TUN', 'DZA', 'SEN', 'CIV', 'MOZ', 'AGO', 'TTO', 'JAM', 'BRB',
  'BHS', 'GUY', 'SUR', 'BLZ', 'FJI', 'PNG', 'WSM', 'TON', 'VUT', 'SLB',
  'NRU', 'PLW', 'MHL', 'FSM', 'KIR', 'TUV',
  // European countries where English is widely understood
  'NLD', 'SWE', 'DNK', 'NOR', 'FIN', 'ISL', 'MLT', 'CYP', 'EST', 'LVA',
  'LTU', 'HRV', 'SVN', 'BGR', 'ROU', 'POL', 'SRB', 'MNE', 'ALB', 'MKD',
  'BIH', 'GRC', 'PRT', 'ESP', 'ITA', 'FRA', 'TUR', 'GEO', 'ARM', 'AZE',
  'KAZ', 'UZB', 'KGZ', 'TJK', 'MNG', 'KHM', 'THA', 'VNM', 'IDN', 'JPN',
  'KOR', 'BRA', 'MEX', 'ARG', 'CHL', 'COL', 'PER', 'ECU', 'BOL', 'PRY',
  'URY', 'VEN', 'CRI', 'PAN', 'GTM', 'HND', 'SLV', 'NIC', 'DOM',
])

// ---------------------------------------------------------------------------
// JWT Token Generation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HTTP Client
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

    // Allow raw paths (v1, v2, or already prefixed)
    let fullPath
    if (apiPath.startsWith('/v1') || apiPath.startsWith('/v2')) {
      fullPath = apiPath
    } else {
      fullPath = `/v1${apiPath}`
    }

    const options = {
      hostname: CONFIG.apiHost,
      path: fullPath,
      method,
      headers,
    }

    console.log(`  >> ${method} ${fullPath}`)

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
          resolve({ statusCode: res.statusCode, data: parsed, raw: data })
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

// ---------------------------------------------------------------------------
// Main - Diagnostic and fix
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70))
  console.log(' Set App Store Territory Availability - 1GoShop')
  console.log(' App ID: ' + CONFIG.appId)
  console.log('='.repeat(70))

  const token = createAppleJWT()
  console.log('JWT token created successfully\n')

  // Step 1: Get all Apple territories for validation
  console.log('--- Step 1: Fetch Apple territories ---')
  const terrResult = await appleApiRequest('GET', '/v1/territories?limit=200', token)
  const allAppleTerritories = terrResult.data?.data || []
  console.log(`  Apple has ${allAppleTerritories.length} territories`)

  const appleIds = new Set(allAppleTerritories.map(t => t.id))
  const matchedTerritories = [...DESIRED_TERRITORIES].filter(id => appleIds.has(id))
  const notFound = [...DESIRED_TERRITORIES].filter(id => !appleIds.has(id))
  console.log(`  Matched: ${matchedTerritories.length}, Not found: ${notFound.length}`)
  if (notFound.length > 0) console.log(`  Not found: ${notFound.join(', ')}`)

  // Step 2: Explore current territory availabilities in detail
  console.log('\n--- Step 2: Current v2 territory availabilities ---')
  const taResult = await appleApiRequest('GET', `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?include=territory&limit=200`, token)
  const allTA = taResult.data?.data || []
  console.log(`  Found ${allTA.length} territory availabilities`)

  // Show first one in full detail
  if (allTA.length > 0) {
    console.log('  First entry:', JSON.stringify(allTA[0], null, 4))
  }

  // Step 3: Try PATCH on a SINGLE territory availability to see if it works
  console.log('\n--- Step 3: Test PATCH on single territory availability ---')

  // Find one to disable (e.g., AFG which we do NOT want)
  const unwantedTA = allTA.find(ta => {
    const tId = ta.relationships?.territory?.data?.id
    return tId && !DESIRED_TERRITORIES.has(tId) && ta.attributes?.available === true
  })

  if (unwantedTA) {
    const taId = unwantedTA.id
    const tId = unwantedTA.relationships?.territory?.data?.id
    console.log(`  Testing disable of ${tId} (taId: ${taId})`)

    // Try different URL patterns (including v1 - self link uses v1!)
    const patterns = [
      // Pattern 1: /v1/territoryAvailabilities/{id} (from self link!)
      `/v1/territoryAvailabilities/${taId}`,
      // Pattern 2: /v2/territoryAvailabilities/{id}
      `/v2/territoryAvailabilities/${taId}`,
      // Pattern 3: /v2/appAvailabilities/{appId}/territoryAvailabilities/{taId}
      `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities/${taId}`,
    ]

    for (const urlPattern of patterns) {
      console.log(`\n  Trying: PATCH ${urlPattern}`)
      const patchBody = {
        data: {
          type: 'territoryAvailabilities',
          id: taId,
          attributes: {
            available: false,
          },
        },
      }

      const result = await appleApiRequest('PATCH', urlPattern, token, patchBody)
      if (result.statusCode < 400) {
        console.log('  SUCCESS! PATCH works with this pattern.')
        console.log('  Response:', JSON.stringify(result.data, null, 2))

        // Now apply to all territories
        await applyAllChanges(token, allTA, urlPattern.replace(taId, '{id}'))
        return
      } else {
        console.log('  Failed:', result.data?.errors?.[0]?.detail || `HTTP ${result.statusCode}`)
      }
    }

    // Pattern 3: Try DELETE + re-POST the appAvailability with correct territories
    // This might work if the "already exists" error was because we didn't include all territories
    console.log('\n--- Step 4: Try POST with ALL territories (desired=true, rest=false) ---')

    const allTerritoryIds = allAppleTerritories.map(t => t.id)
    const territoryData = allTerritoryIds.map((id, idx) => ({
      type: 'territoryAvailabilities',
      id: `\${${idx}}`,
    }))

    const includedData = allTerritoryIds.map((id, idx) => ({
      type: 'territoryAvailabilities',
      id: `\${${idx}}`,
      attributes: {
        available: DESIRED_TERRITORIES.has(id),
      },
      relationships: {
        territory: {
          data: {
            type: 'territories',
            id: id,
          },
        },
      },
    }))

    const postBody = {
      data: {
        type: 'appAvailabilities',
        attributes: {
          availableInNewTerritories: false,
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: CONFIG.appId,
            },
          },
          territoryAvailabilities: {
            data: territoryData,
          },
        },
      },
      included: includedData,
    }

    console.log(`  POST with ${allTerritoryIds.length} territories (${matchedTerritories.length} true, ${allTerritoryIds.length - matchedTerritories.length} false)`)
    const postResult = await appleApiRequest('POST', '/v2/appAvailabilities', token, postBody)

    if (postResult.statusCode < 400) {
      console.log('  POST succeeded!')
    } else {
      console.log('  POST failed:', JSON.stringify(postResult.data?.errors?.slice(0, 2), null, 2))

      // Try the replace relationship approach on v2
      console.log('\n--- Step 5: Try PATCH on v2 appAvailabilities relationship ---')

      // Try to replace the territoryAvailabilities relationship
      const relBody = {
        data: matchedTerritories.map((id, idx) => ({
          type: 'territoryAvailabilities',
          id: `\${${idx}}`,
        })),
        included: matchedTerritories.map((id, idx) => ({
          type: 'territoryAvailabilities',
          id: `\${${idx}}`,
          attributes: { available: true },
          relationships: {
            territory: {
              data: { type: 'territories', id: id },
            },
          },
        })),
      }

      const relResult = await appleApiRequest(
        'PATCH',
        `/v2/appAvailabilities/${CONFIG.appId}/relationships/territoryAvailabilities`,
        token,
        relBody
      )

      if (relResult.statusCode < 400) {
        console.log('  Relationship PATCH succeeded!')
      } else {
        console.log('  Relationship PATCH failed:', JSON.stringify(relResult.data?.errors?.slice(0, 2), null, 2))
      }
    }
  }

  // Final verification
  await printReport(token)
}

async function applyAllChanges(token, allTA, urlPattern) {
  console.log('\n--- Applying changes to all territories ---')

  const toDisable = allTA.filter(ta => {
    const tId = ta.relationships?.territory?.data?.id
    return tId && !DESIRED_TERRITORIES.has(tId) && ta.attributes?.available === true
  })

  console.log(`  Need to disable: ${toDisable.length} territories`)

  let success = 0
  let fail = 0

  for (let i = 0; i < toDisable.length; i++) {
    const ta = toDisable[i]
    const taId = ta.id
    const tId = ta.relationships?.territory?.data?.id
    const url = urlPattern.replace('{id}', taId)

    process.stdout.write(`  [${i + 1}/${toDisable.length}] DISABLE ${tId}...`)

    const patchBody = {
      data: {
        type: 'territoryAvailabilities',
        id: taId,
        attributes: {
          available: false,
        },
      },
    }

    const result = await appleApiRequest('PATCH', url, token, patchBody)

    if (result.statusCode < 400) {
      console.log(' OK')
      success++
    } else {
      console.log(` FAILED (${result.statusCode})`)
      fail++
    }

    // Small delay for rate limiting
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n  Done: ${success} succeeded, ${fail} failed`)
}

async function printReport(token) {
  console.log('\n' + '='.repeat(70))
  console.log(' TERRITORY AVAILABILITY REPORT')
  console.log('='.repeat(70))

  const allItems = []
  let nextUrl = `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?include=territory&limit=200`
  while (nextUrl) {
    const result = await appleApiRequest('GET', nextUrl, token)
    if (result.statusCode >= 400) break
    allItems.push(...(result.data?.data || []))
    const nextLink = result.data?.links?.next
    nextUrl = nextLink ? new URL(nextLink).pathname + new URL(nextLink).search : null
  }

  const available = []
  const traderStatus = []
  const unavailable = []
  const other = []

  for (const ta of allItems) {
    const isAvail = ta.attributes?.available
    const statuses = ta.attributes?.contentStatuses || []
    const tId = ta.relationships?.territory?.data?.id || ta.id

    if (!isAvail) {
      unavailable.push(tId)
    } else if (statuses.includes('AVAILABLE')) {
      available.push(tId)
    } else if (statuses.includes('TRADER_STATUS_NOT_PROVIDED') || statuses.includes('CANNOT_SELL_REQUIRES_TRADER_STATUS')) {
      traderStatus.push(tId)
    } else if (statuses.length === 0) {
      available.push(tId)
    } else {
      other.push({ id: tId, statuses, available: isAvail })
    }
  }

  console.log(`\n  AVAILABLE (${available.length}):`)
  for (let i = 0; i < available.length; i += 15) {
    console.log(`    ${available.slice(i, i + 15).join(', ')}`)
  }

  console.log(`\n  TRADER STATUS REQUIRED (${traderStatus.length}):`)
  if (traderStatus.length > 0) {
    for (let i = 0; i < traderStatus.length; i += 15) {
      console.log(`    ${traderStatus.slice(i, i + 15).join(', ')}`)
    }
  }

  console.log(`\n  UNAVAILABLE (${unavailable.length}):`)
  if (unavailable.length > 0) {
    for (let i = 0; i < unavailable.length; i += 15) {
      console.log(`    ${unavailable.slice(i, i + 15).join(', ')}`)
    }
  }

  if (other.length > 0) {
    console.log(`\n  OTHER (${other.length}):`)
    for (const o of other) {
      console.log(`    ${o.id}: ${JSON.stringify(o.statuses)}`)
    }
  }

  console.log(`\n  TOTAL: ${available.length + traderStatus.length} enabled, ${unavailable.length} disabled`)
  console.log('='.repeat(70))
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  console.error(err.stack)
  process.exit(1)
})
