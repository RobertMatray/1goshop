/**
 * Fix App Store Territory Availability for 1GoShop
 *
 * This script diagnoses and fixes the issue where the app has state
 * READY_FOR_SALE but is not visible in the App Store because territories
 * aren't configured.
 *
 * Uses App Store Connect API v1 and v2.
 *
 * Usage:
 *   node scripts/fix-territory-availability.mjs
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

    // Determine if this is a v2 path
    const fullPath = apiPath.startsWith('/v2') ? apiPath : `/v1${apiPath}`

    const options = {
      hostname: CONFIG.apiHost,
      path: fullPath,
      method,
      headers,
    }

    console.log(`  >> ${method} https://${CONFIG.apiHost}${fullPath}`)

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
// Diagnostic Functions
// ---------------------------------------------------------------------------

async function getAppInfo(token) {
  console.log('\n--- Step 1: Get App Info ---')
  const result = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}?fields[apps]=name,bundleId,sku,primaryLocale,appStoreVersions,availableInNewTerritories,contentRightsDeclaration,isOrEverWasMadeForKids`,
    token
  )
  if (result.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return null
  }
  const app = result.data?.data
  console.log(`  App Name: ${app?.attributes?.name}`)
  console.log(`  Bundle ID: ${app?.attributes?.bundleId}`)
  console.log(`  Primary Locale: ${app?.attributes?.primaryLocale}`)
  console.log(`  Content Rights: ${app?.attributes?.contentRightsDeclaration}`)
  console.log(`  Full attributes:`, JSON.stringify(app?.attributes, null, 4))
  return app
}

async function getAppVersions(token) {
  console.log('\n--- Step 2: Get App Store Versions ---')
  const result = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState,releaseType,platform`,
    token
  )
  if (result.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return null
  }
  const versions = result.data?.data || []
  console.log(`  Found ${versions.length} version(s):`)
  for (const v of versions) {
    console.log(`    - v${v.attributes.versionString} | State: ${v.attributes.appStoreState} | Platform: ${v.attributes.platform} | Release: ${v.attributes.releaseType}`)
  }
  return versions
}

async function getAppPricing(token) {
  console.log('\n--- Step 3: Check App Pricing ---')

  // Check app price schedule (v1)
  console.log('\n  3a. Checking appPriceSchedule...')
  const scheduleResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appPriceSchedule?include=manualPrices,automaticPrices,baseTerritory&fields[appPrices]=startDate&fields[appPricePoints]=customerPrice,proceeds`,
    token
  )
  if (scheduleResult.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(scheduleResult.data?.errors, null, 2))
  } else {
    console.log('  Price Schedule:', JSON.stringify(scheduleResult.data, null, 4))
  }

  // Check v1 price points
  console.log('\n  3b. Checking appPricePoints...')
  const pricePointsResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appPricePoints?filter[territory]=USA&limit=5`,
    token
  )
  if (pricePointsResult.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(pricePointsResult.data?.errors, null, 2))
  } else {
    const pp = pricePointsResult.data?.data || []
    console.log(`  Found ${pp.length} price point(s)`)
    for (const p of pp) {
      console.log(`    - ID: ${p.id}, Price: ${p.attributes?.customerPrice}, Proceeds: ${p.attributes?.proceeds}`)
    }
  }

  return scheduleResult
}

async function getCurrentAvailability(token) {
  console.log('\n--- Step 4: Check Current App Availability ---')

  // v2 endpoint
  console.log('\n  4a. Checking v2 appAvailability...')
  const v2Result = await appleApiRequest(
    'GET',
    `/v2/apps/${CONFIG.appId}/appAvailability?include=territoryAvailabilities&limit=5`,
    token
  )
  if (v2Result.statusCode >= 400) {
    console.log('  v2 Availability ERROR:', JSON.stringify(v2Result.data?.errors, null, 2))
  } else {
    console.log('  v2 Availability:', JSON.stringify(v2Result.data, null, 4))
  }

  // v1 available territories
  console.log('\n  4b. Checking v1 availableTerritories...')
  const v1Result = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/availableTerritories?limit=200`,
    token
  )
  if (v1Result.statusCode >= 400) {
    console.log('  v1 Territories ERROR:', JSON.stringify(v1Result.data?.errors, null, 2))
  } else {
    const territories = v1Result.data?.data || []
    console.log(`  Currently available in ${territories.length} territories`)
    if (territories.length > 0) {
      const names = territories.map(t => t.id).join(', ')
      console.log(`  Territories: ${names}`)
    }
  }

  return { v2: v2Result, v1: v1Result }
}

async function getAllTerritories(token) {
  console.log('\n--- Step 5: Get All Available Territories ---')
  const result = await appleApiRequest('GET', '/territories?limit=200', token)
  if (result.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return []
  }
  const territories = result.data?.data || []
  console.log(`  Total territories available: ${territories.length}`)
  // Print a few
  const sample = territories.slice(0, 10)
  console.log(`  Sample: ${sample.map(t => t.id).join(', ')}...`)
  return territories
}

// ---------------------------------------------------------------------------
// Fix Functions
// ---------------------------------------------------------------------------

async function fixAvailabilityV2(token, territories) {
  console.log('\n--- Step 6: Fix Availability via v2 API ---')

  // Build territoryAvailabilities inline data
  // The v2 API expects inline territoryAvailabilities with territory relationships
  const territoryAvailabilities = territories.map(t => ({
    type: 'territoryAvailabilities',
    attributes: {
      available: true,
    },
    relationships: {
      territory: {
        data: {
          type: 'territories',
          id: t.id,
        },
      },
    },
  }))

  const body = {
    data: {
      type: 'appAvailabilities',
      attributes: {
        availableInNewTerritories: true,
      },
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: CONFIG.appId,
          },
        },
        territoryAvailabilities: {
          data: territoryAvailabilities,
        },
      },
    },
  }

  console.log(`  Sending v2 appAvailabilities with ${territoryAvailabilities.length} territories...`)
  console.log('  Request body (first territory):', JSON.stringify(body.data.relationships.territoryAvailabilities.data[0], null, 4))

  const result = await appleApiRequest('POST', '/v2/appAvailabilities', token, body)

  if (result.statusCode >= 400) {
    console.log('  v2 ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return false
  }

  console.log('  v2 SUCCESS:', JSON.stringify(result.data, null, 4))
  return true
}

async function fixAvailabilityV2Simple(token) {
  console.log('\n--- Step 6b: Fix Availability via v2 API (simple approach) ---')

  // Try with minimal payload - just availableInNewTerritories and empty array
  const body = {
    data: {
      type: 'appAvailabilities',
      attributes: {
        availableInNewTerritories: true,
      },
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: CONFIG.appId,
          },
        },
        territoryAvailabilities: {
          data: [],
        },
      },
    },
  }

  console.log('  Trying simple v2 request with empty territoryAvailabilities...')
  const result = await appleApiRequest('POST', '/v2/appAvailabilities', token, body)

  if (result.statusCode >= 400) {
    console.log('  Simple v2 ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return false
  }

  console.log('  Simple v2 SUCCESS:', JSON.stringify(result.data, null, 4))
  return true
}

async function fixAvailabilityV2WithInlineCreate(token, territories) {
  console.log('\n--- Step 6c: Fix Availability via v2 API (included approach) ---')

  // Some Apple APIs use "included" array for creating related resources inline
  const included = territories.map((t, idx) => ({
    type: 'territoryAvailabilities',
    id: `${t.id}-avail`,
    attributes: {
      available: true,
    },
    relationships: {
      territory: {
        data: {
          type: 'territories',
          id: t.id,
        },
      },
    },
  }))

  const body = {
    data: {
      type: 'appAvailabilities',
      attributes: {
        availableInNewTerritories: true,
      },
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: CONFIG.appId,
          },
        },
        territoryAvailabilities: {
          data: included.map(i => ({
            type: 'territoryAvailabilities',
            id: i.id,
          })),
        },
      },
    },
    included: included,
  }

  console.log(`  Trying v2 with "included" array for ${included.length} territories...`)
  const result = await appleApiRequest('POST', '/v2/appAvailabilities', token, body)

  if (result.statusCode >= 400) {
    console.log('  Included v2 ERROR:', JSON.stringify(result.data?.errors, null, 2))
    return false
  }

  console.log('  Included v2 SUCCESS:', JSON.stringify(result.data, null, 4))
  return true
}

async function checkPreOrderAndPricing(token) {
  console.log('\n--- Step 7: Check Pre-Order and Price Schedule Details ---')

  // Check if there's a price schedule issue
  console.log('\n  7a. App price schedule with base territory...')
  const schedResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appPriceSchedule?include=baseTerritory,manualPrices,automaticPrices`,
    token
  )
  if (schedResult.statusCode >= 400) {
    console.log('  Price Schedule ERROR:', JSON.stringify(schedResult.data?.errors, null, 2))
  } else {
    console.log('  Price Schedule:', JSON.stringify(schedResult.data, null, 4))
  }

  // Check subscription groups (in case it's a paid/IAP app)
  console.log('\n  7b. Subscription groups...')
  const subResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/subscriptionGroups`,
    token
  )
  if (subResult.statusCode >= 400) {
    console.log('  Subscriptions ERROR:', JSON.stringify(subResult.data?.errors, null, 2))
  } else {
    console.log('  Subscriptions:', JSON.stringify(subResult.data, null, 2))
  }

  return schedResult
}

async function setFreePrice(token) {
  console.log('\n--- Step 8: Ensure App Has Free Price Set ---')

  // First get the FREE price point for the base territory
  console.log('\n  8a. Getting free price point for USA...')
  const ppResult = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/appPricePoints?filter[territory]=USA&filter[customerPrice]=0&limit=5`,
    token
  )

  if (ppResult.statusCode >= 400) {
    console.log('  Price Points ERROR:', JSON.stringify(ppResult.data?.errors, null, 2))

    // Try alternate endpoint
    console.log('\n  8a-alt. Trying alternate price points endpoint...')
    const altResult = await appleApiRequest(
      'GET',
      `/apps/${CONFIG.appId}/appPricePoints?limit=5`,
      token
    )
    if (altResult.statusCode < 400) {
      console.log('  Alt Price Points:', JSON.stringify(altResult.data?.data?.slice(0, 3), null, 2))
    } else {
      console.log('  Alt ERROR:', JSON.stringify(altResult.data?.errors, null, 2))
    }
  } else {
    const points = ppResult.data?.data || []
    console.log(`  Found ${points.length} free price point(s)`)
    for (const p of points) {
      console.log(`    ID: ${p.id}, Price: ${p.attributes?.customerPrice}`)
    }
  }
}

async function checkAppRelationships(token) {
  console.log('\n--- Step 9: Check App Relationships ---')

  // Check all available relationships
  const endpoints = [
    'appInfos',
    'appClips',
    'endUserLicenseAgreement',
    'preOrder',
  ]

  for (const ep of endpoints) {
    console.log(`\n  9. Checking ${ep}...`)
    const result = await appleApiRequest(
      'GET',
      `/apps/${CONFIG.appId}/${ep}`,
      token
    )
    if (result.statusCode >= 400) {
      console.log(`  ${ep} ERROR: ${result.statusCode}`)
    } else {
      const data = result.data?.data
      if (Array.isArray(data)) {
        console.log(`  ${ep}: ${data.length} item(s)`)
        if (data.length > 0) {
          console.log(`    First:`, JSON.stringify(data[0]?.attributes, null, 4))
        }
      } else if (data) {
        console.log(`  ${ep}:`, JSON.stringify(data?.attributes, null, 4))
      } else {
        console.log(`  ${ep}: null/empty`)
      }
    }
  }
}

async function tryV1TerritoryUpdate(token) {
  console.log('\n--- Step 10: Try v1 Territory Availability Update ---')

  // Some docs suggest PATCH on the app itself with territories relationship
  console.log('\n  10a. Try adding territories via app relationship...')
  const result = await appleApiRequest(
    'GET',
    `/apps/${CONFIG.appId}/relationships/availableTerritories`,
    token
  )
  if (result.statusCode < 400) {
    console.log('  Current territory relationships:', JSON.stringify(result.data?.data?.length, null, 2), 'territories')
  } else {
    console.log('  ERROR:', JSON.stringify(result.data?.errors, null, 2))
  }
}

async function tryAddSingleTerritory(token) {
  console.log('\n--- Step 11: Try Adding Single Territory (SVK) ---')

  // Try PATCH to add territories to the app
  const body = {
    data: [
      { type: 'territories', id: 'SVK' },
    ],
  }

  const result = await appleApiRequest(
    'POST',
    `/apps/${CONFIG.appId}/relationships/availableTerritories`,
    token,
    body
  )

  if (result.statusCode >= 400) {
    console.log('  Add Territory ERROR:', JSON.stringify(result.data?.errors, null, 2))

    // Try PATCH instead of POST
    console.log('\n  Trying PATCH instead...')
    const patchResult = await appleApiRequest(
      'PATCH',
      `/apps/${CONFIG.appId}/relationships/availableTerritories`,
      token,
      body
    )
    if (patchResult.statusCode >= 400) {
      console.log('  PATCH Territory ERROR:', JSON.stringify(patchResult.data?.errors, null, 2))
    } else {
      console.log('  PATCH Territory SUCCESS')
    }
  } else {
    console.log('  Add Territory SUCCESS')
  }
}

async function tryV2WithAllTerritories(token, allTerritories) {
  console.log('\n--- Step 12: v2 appAvailabilities with all territories (correct format) ---')

  // According to Apple docs, the v2 POST /appAvailabilities expects:
  // - data.type = "appAvailabilities"
  // - data.attributes.availableInNewTerritories = true
  // - data.relationships.app = { data: { type: "apps", id: "..." } }
  // - data.relationships.territoryAvailabilities.data = array of { type: "territoryAvailabilities", id: "..." }
  // The IDs in territoryAvailabilities are temporary IDs that reference items in the "included" array
  // Each included item has type "territoryAvailabilities" and a relationship to a territory

  const tempIds = allTerritories.map((t, i) => `${t.id}`)

  const body = {
    data: {
      type: 'appAvailabilities',
      attributes: {
        availableInNewTerritories: true,
      },
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: CONFIG.appId,
          },
        },
        territoryAvailabilities: {
          data: tempIds.map(id => ({
            type: 'territoryAvailabilities',
            id: `$${id}`,
          })),
        },
      },
    },
    included: tempIds.map(id => ({
      type: 'territoryAvailabilities',
      id: `$${id}`,
      attributes: {
        available: true,
      },
      relationships: {
        territory: {
          data: {
            type: 'territories',
            id: id,
          },
        },
      },
    })),
  }

  console.log(`  Sending v2 with ${tempIds.length} territories using $-prefixed temp IDs...`)
  console.log('  Sample included[0]:', JSON.stringify(body.included[0], null, 4))
  console.log('  Sample relationship[0]:', JSON.stringify(body.data.relationships.territoryAvailabilities.data[0], null, 4))

  const result = await appleApiRequest('POST', '/v2/appAvailabilities', token, body)

  if (result.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(result.data?.errors, null, 2))
    console.log('  Full raw response (first 3000 chars):', result.raw?.substring(0, 3000))
    return false
  }

  console.log('  SUCCESS:', JSON.stringify(result.data, null, 4))
  return true
}

async function tryV2WithNewIdFormat(token, allTerritories) {
  console.log('\n--- Step 13: v2 with ${new} ID format ---')

  // Try Apple's documented format: "${new}" as placeholder ID
  const body = {
    data: {
      type: 'appAvailabilities',
      attributes: {
        availableInNewTerritories: true,
      },
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: CONFIG.appId,
          },
        },
        territoryAvailabilities: {
          data: allTerritories.map((t, i) => ({
            type: 'territoryAvailabilities',
            id: `\${${i}}`,
          })),
        },
      },
    },
    included: allTerritories.map((t, i) => ({
      type: 'territoryAvailabilities',
      id: `\${${i}}`,
      attributes: {
        available: true,
      },
      relationships: {
        territory: {
          data: {
            type: 'territories',
            id: t.id,
          },
        },
      },
    })),
  }

  console.log(`  Sending v2 with \${N} ID format for ${allTerritories.length} territories...`)

  const result = await appleApiRequest('POST', '/v2/appAvailabilities', token, body)

  if (result.statusCode >= 400) {
    console.log('  ERROR:', JSON.stringify(result.data?.errors?.[0], null, 2))
    return false
  }

  console.log('  SUCCESS:', JSON.stringify(result.data, null, 4))
  return true
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70))
  console.log(' Fix App Store Territory Availability - 1GoShop')
  console.log(' App ID: ' + CONFIG.appId)
  console.log('='.repeat(70))

  try {
    const token = createAppleJWT()
    console.log('JWT token created successfully')

    // Diagnostic phase
    await getAppInfo(token)
    await getAppVersions(token)
    await getAppPricing(token)
    const availability = await getCurrentAvailability(token)
    const allTerritories = await getAllTerritories(token)
    await checkAppRelationships(token)
    await checkPreOrderAndPricing(token)
    await setFreePrice(token)

    // Check if we already have territories
    const currentTerritoryCount = availability?.v1?.data?.data?.length || 0
    console.log(`\n${'='.repeat(70)}`)
    console.log(` DIAGNOSIS: App has ${currentTerritoryCount} territories configured`)
    console.log('='.repeat(70))

    if (currentTerritoryCount > 0) {
      console.log('  App already has territories. The issue may be elsewhere.')
      console.log('  Checking other potential causes...')
    }

    // Try v1 territory relationship approach
    await tryV1TerritoryUpdate(token)

    // Fix phase - try multiple approaches
    console.log(`\n${'='.repeat(70)}`)
    console.log(' ATTEMPTING FIXES')
    console.log('='.repeat(70))

    // Approach 1: Simple v2 with empty territories
    const simpleResult = await fixAvailabilityV2Simple(token)
    if (simpleResult) {
      console.log('\n  FIX SUCCEEDED with simple v2 approach!')
      return
    }

    // Approach 2: v2 with $-prefixed temp IDs (Apple's inline creation pattern)
    if (allTerritories.length > 0) {
      const v2Result = await tryV2WithAllTerritories(token, allTerritories)
      if (v2Result) {
        console.log('\n  FIX SUCCEEDED with v2 $-prefixed IDs!')
        return
      }
    }

    // Approach 3: v2 with ${N} format temp IDs
    if (allTerritories.length > 0) {
      const v2NewResult = await tryV2WithNewIdFormat(token, allTerritories)
      if (v2NewResult) {
        console.log('\n  FIX SUCCEEDED with v2 ${N} IDs!')
        return
      }
    }

    // Approach 4: v2 with inline attributes in relationship data
    if (allTerritories.length > 0) {
      const inlineResult = await fixAvailabilityV2(token, allTerritories)
      if (inlineResult) {
        console.log('\n  FIX SUCCEEDED with v2 inline attributes!')
        return
      }
    }

    // Approach 5: v2 with included array
    if (allTerritories.length > 0) {
      const includedResult = await fixAvailabilityV2WithInlineCreate(token, allTerritories)
      if (includedResult) {
        console.log('\n  FIX SUCCEEDED with v2 included array!')
        return
      }
    }

    // Approach 6: v1 territory relationship
    await tryAddSingleTerritory(token)

    // Final check
    console.log('\n\n--- Final Availability Check ---')
    await getCurrentAvailability(token)

    console.log(`\n${'='.repeat(70)}`)
    console.log(' SUMMARY')
    console.log('='.repeat(70))
    console.log('  If all approaches failed, possible causes:')
    console.log('  1. App pricing may not be set (free tier needs explicit setup)')
    console.log('  2. Content rights declaration may be missing')
    console.log('  3. App privacy/data collection info may be incomplete')
    console.log('  4. The API key may not have sufficient permissions')
    console.log('  5. App may need to be managed via App Store Connect web UI')
    console.log('  ')
    console.log('  Manual fix: Go to App Store Connect > 1GoShop > Pricing and Availability')
    console.log('  URL: https://appstoreconnect.apple.com/apps/6759269751/distribution/pricing')

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
