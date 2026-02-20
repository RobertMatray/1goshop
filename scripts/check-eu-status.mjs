/**
 * Check EU Territory Availability Status for 1GoShop
 *
 * Verifies whether TRADER_STATUS_NOT_PROVIDED has been resolved
 * after setting Trader Status (non-trader) in App Store Connect.
 *
 * Usage:
 *   node scripts/check-eu-status.mjs
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

// All 27 EU member states (ISO 3166-1 alpha-3)
const EU_COUNTRIES = new Map([
  ['AUT', 'Austria'],
  ['BEL', 'Belgium'],
  ['BGR', 'Bulgaria'],
  ['HRV', 'Croatia'],
  ['CYP', 'Cyprus'],
  ['CZE', 'Czechia'],
  ['DNK', 'Denmark'],
  ['EST', 'Estonia'],
  ['FIN', 'Finland'],
  ['FRA', 'France'],
  ['DEU', 'Germany'],
  ['GRC', 'Greece'],
  ['HUN', 'Hungary'],
  ['IRL', 'Ireland'],
  ['ITA', 'Italy'],
  ['LVA', 'Latvia'],
  ['LTU', 'Lithuania'],
  ['LUX', 'Luxembourg'],
  ['MLT', 'Malta'],
  ['NLD', 'Netherlands'],
  ['POL', 'Poland'],
  ['PRT', 'Portugal'],
  ['ROU', 'Romania'],
  ['SVK', 'Slovakia'],
  ['SVN', 'Slovenia'],
  ['ESP', 'Spain'],
  ['SWE', 'Sweden'],
])

function createAppleJWT() {
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8')
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { iss: CONFIG.issuerId, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1' },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: CONFIG.keyId, typ: 'JWT' } }
  )
}

function appleApiRequest(apiPath, token) {
  return new Promise((resolve, reject) => {
    const fullPath = apiPath.startsWith('/v') ? apiPath : `/v1${apiPath}`
    const options = {
      hostname: CONFIG.apiHost,
      path: fullPath,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) })
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, raw: data })
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function fetchAllTerritoryAvailabilities(token) {
  let allItems = []
  let allIncluded = []
  let nextUrl = `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?include=territory&limit=200`

  while (nextUrl) {
    const result = await appleApiRequest(nextUrl, token)

    if (result.statusCode >= 400) {
      console.log('ERROR:', JSON.stringify(result.data?.errors, null, 2))
      return { items: [], included: [] }
    }

    const items = result.data?.data || []
    const included = result.data?.included || []
    allItems = allItems.concat(items)
    allIncluded = allIncluded.concat(included)

    // Check for pagination
    nextUrl = result.data?.links?.next || null
    if (nextUrl) {
      // Strip the hostname portion if present (API returns full URL)
      nextUrl = nextUrl.replace(`https://${CONFIG.apiHost}`, '')
    }
  }

  return { items: allItems, included: allIncluded }
}

async function main() {
  console.log('='.repeat(70))
  console.log(' EU TERRITORY AVAILABILITY STATUS - 1GoShop')
  console.log(' App ID: ' + CONFIG.appId)
  console.log(' Date: ' + new Date().toISOString())
  console.log(' Purpose: Verify TRADER_STATUS_NOT_PROVIDED resolution')
  console.log('='.repeat(70))

  const token = createAppleJWT()

  console.log('\nFetching territory availabilities...')
  const { items, included } = await fetchAllTerritoryAvailabilities(token)

  if (items.length === 0) {
    console.log('No territory data returned. Check API credentials or app ID.')
    return
  }

  // Build territory info map
  const territoryInfoMap = new Map()
  for (const t of included) {
    if (t.type === 'territories') {
      territoryInfoMap.set(t.id, t.attributes || {})
    }
  }

  // Parse all territory statuses
  const allTerritories = []
  for (const ta of items) {
    const isAvailable = ta.attributes?.available
    const contentStatuses = ta.attributes?.contentStatuses || []
    const releaseDate = ta.attributes?.preOrderEnabled
    const territoryId = ta.relationships?.territory?.data?.id || ta.id

    allTerritories.push({
      id: territoryId,
      isAvailable,
      contentStatuses,
    })
  }

  // Categorize all territories
  const availableList = []
  const traderStatusList = []
  const cannotSellList = []
  const processingList = []
  const disabledList = []
  const otherIssuesList = []

  for (const t of allTerritories) {
    const statuses = t.contentStatuses

    if (!t.isAvailable) {
      disabledList.push(t)
    } else if (statuses.includes('AVAILABLE') && statuses.length === 1) {
      availableList.push(t)
    } else if (statuses.includes('TRADER_STATUS_NOT_PROVIDED')) {
      traderStatusList.push(t)
    } else if (statuses.includes('CANNOT_SELL')) {
      cannotSellList.push(t)
    } else if (statuses.includes('PROCESSING_TO_AVAILABLE')) {
      processingList.push(t)
    } else if (statuses.includes('AVAILABLE')) {
      availableList.push(t)
    } else {
      otherIssuesList.push(t)
    }
  }

  // Overall summary
  console.log('\n' + '-'.repeat(70))
  console.log(' OVERALL SUMMARY')
  console.log('-'.repeat(70))
  console.log(`  Total territories in response:  ${allTerritories.length}`)
  console.log(`  Enabled (available=true):       ${allTerritories.filter(t => t.isAvailable).length}`)
  console.log(`  Disabled (available=false):      ${disabledList.length}`)
  console.log('')
  console.log(`  AVAILABLE:                       ${availableList.length}`)
  console.log(`  TRADER_STATUS_NOT_PROVIDED:       ${traderStatusList.length}`)
  console.log(`  CANNOT_SELL:                     ${cannotSellList.length}`)
  console.log(`  PROCESSING_TO_AVAILABLE:          ${processingList.length}`)
  console.log(`  OTHER ISSUES:                    ${otherIssuesList.length}`)

  // EU-specific report
  console.log('\n' + '-'.repeat(70))
  console.log(' EU COUNTRIES STATUS (27 Member States)')
  console.log('-'.repeat(70))

  const euAvailable = []
  const euTraderIssue = []
  const euCannotSell = []
  const euDisabled = []
  const euProcessing = []
  const euOther = []
  const euNotFound = []

  for (const [code, name] of EU_COUNTRIES) {
    const territory = allTerritories.find(t => t.id === code)
    if (!territory) {
      euNotFound.push({ code, name })
      continue
    }

    const statuses = territory.contentStatuses
    const statusStr = statuses.join(' + ') || '(none)'

    if (!territory.isAvailable) {
      euDisabled.push({ code, name, statuses: statusStr })
    } else if (statuses.includes('AVAILABLE') && !statuses.includes('TRADER_STATUS_NOT_PROVIDED') && !statuses.includes('CANNOT_SELL')) {
      euAvailable.push({ code, name, statuses: statusStr })
    } else if (statuses.includes('TRADER_STATUS_NOT_PROVIDED')) {
      euTraderIssue.push({ code, name, statuses: statusStr })
    } else if (statuses.includes('CANNOT_SELL')) {
      euCannotSell.push({ code, name, statuses: statusStr })
    } else if (statuses.includes('PROCESSING_TO_AVAILABLE')) {
      euProcessing.push({ code, name, statuses: statusStr })
    } else {
      euOther.push({ code, name, statuses: statusStr })
    }
  }

  // Print EU results
  if (euAvailable.length > 0) {
    console.log(`\n  AVAILABLE (${euAvailable.length}/27):`)
    for (const t of euAvailable.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name.padEnd(20)} [${t.statuses}]`)
    }
  }

  if (euTraderIssue.length > 0) {
    console.log(`\n  TRADER_STATUS_NOT_PROVIDED (${euTraderIssue.length}/27):`)
    for (const t of euTraderIssue.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name.padEnd(20)} [${t.statuses}]`)
    }
  }

  if (euCannotSell.length > 0) {
    console.log(`\n  CANNOT_SELL (${euCannotSell.length}/27):`)
    for (const t of euCannotSell.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name.padEnd(20)} [${t.statuses}]`)
    }
  }

  if (euProcessing.length > 0) {
    console.log(`\n  PROCESSING (${euProcessing.length}/27):`)
    for (const t of euProcessing.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name.padEnd(20)} [${t.statuses}]`)
    }
  }

  if (euDisabled.length > 0) {
    console.log(`\n  DISABLED (${euDisabled.length}/27):`)
    for (const t of euDisabled.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name.padEnd(20)} [${t.statuses}]`)
    }
  }

  if (euOther.length > 0) {
    console.log(`\n  OTHER STATUS (${euOther.length}/27):`)
    for (const t of euOther.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name.padEnd(20)} [${t.statuses}]`)
    }
  }

  if (euNotFound.length > 0) {
    console.log(`\n  NOT FOUND IN RESPONSE (${euNotFound.length}/27):`)
    for (const t of euNotFound.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`    ${t.code}  ${t.name}`)
    }
  }

  // Non-EU territories summary
  console.log('\n' + '-'.repeat(70))
  console.log(' NON-EU TERRITORIES')
  console.log('-'.repeat(70))

  const nonEuAvailable = availableList.filter(t => !EU_COUNTRIES.has(t.id))
  const nonEuTrader = traderStatusList.filter(t => !EU_COUNTRIES.has(t.id))
  const nonEuCannotSell = cannotSellList.filter(t => !EU_COUNTRIES.has(t.id))
  const nonEuDisabled = disabledList.filter(t => !EU_COUNTRIES.has(t.id))

  console.log(`  AVAILABLE: ${nonEuAvailable.length}`)
  if (nonEuAvailable.length > 0) {
    for (let i = 0; i < nonEuAvailable.length; i += 15) {
      console.log('    ' + nonEuAvailable.slice(i, i + 15).map(t => t.id).join(', '))
    }
  }

  if (nonEuTrader.length > 0) {
    console.log(`  TRADER_STATUS_NOT_PROVIDED: ${nonEuTrader.length}`)
    for (let i = 0; i < nonEuTrader.length; i += 15) {
      console.log('    ' + nonEuTrader.slice(i, i + 15).map(t => t.id).join(', '))
    }
  }

  if (nonEuCannotSell.length > 0) {
    console.log(`  CANNOT_SELL: ${nonEuCannotSell.length}`)
    for (let i = 0; i < nonEuCannotSell.length; i += 15) {
      console.log('    ' + nonEuCannotSell.slice(i, i + 15).map(t => t.id).join(', '))
    }
  }

  console.log(`  DISABLED: ${nonEuDisabled.length}`)

  // Final verdict
  console.log('\n' + '='.repeat(70))
  console.log(' VERDICT')
  console.log('='.repeat(70))

  if (euTraderIssue.length === 0 && euCannotSell.length === 0) {
    console.log('')
    console.log('  ALL 27 EU COUNTRIES: OK')
    console.log('  Trader Status issue has been RESOLVED.')
    console.log('  All EU territories should be available for distribution.')
  } else {
    console.log('')
    console.log('  EU ISSUES REMAIN:')
    if (euTraderIssue.length > 0) {
      console.log(`  - ${euTraderIssue.length} countries still have TRADER_STATUS_NOT_PROVIDED`)
      console.log('    This means the Trader Status setting has NOT yet propagated,')
      console.log('    or needs to be set in App Store Connect.')
      console.log('    URL: https://appstoreconnect.apple.com/apps/6759269751/appstore/info')
    }
    if (euCannotSell.length > 0) {
      console.log(`  - ${euCannotSell.length} countries have CANNOT_SELL status`)
    }
    if (euDisabled.length > 0) {
      console.log(`  - ${euDisabled.length} EU countries are DISABLED`)
    }
  }

  const totalAvailableEU = euAvailable.length
  const totalEU = EU_COUNTRIES.size
  console.log(`\n  EU Score: ${totalAvailableEU}/${totalEU} fully available`)
  console.log('='.repeat(70))
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
