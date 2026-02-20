/**
 * Check App Store Status for 1GoShop
 *
 * Investigates why the app (ID: 6759269751) is not findable when searching
 * in the Apple App Store on an iPhone 12 Pro.
 *
 * Checks:
 *   1. App state and version info
 *   2. Pricing / price schedule
 *   3. App info / content state
 *   4. Territory availability
 *   5. iTunes lookup (public index)
 *   6. App Store version localizations (keywords, description)
 *
 * Usage:
 *   node scripts/check-app-store-status.mjs
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

// ============================================================
//  Helpers
// ============================================================

function createAppleJWT() {
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8')
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { iss: CONFIG.issuerId, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1' },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: CONFIG.keyId, typ: 'JWT' } }
  )
}

function appleApiRequest(method, apiPath, token) {
  return new Promise((resolve, reject) => {
    const fullPath = apiPath.startsWith('/v') ? apiPath : `/v1${apiPath}`
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const options = { hostname: CONFIG.apiHost, path: fullPath, method, headers }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve({ statusCode: res.statusCode, data: parsed })
        } catch (_e) {
          resolve({ statusCode: res.statusCode, data: null, raw: data })
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function httpsFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) })
        } catch (_e) {
          resolve({ statusCode: res.statusCode, data: null, raw: data })
        }
      })
    }).on('error', reject)
  })
}

function section(title) {
  console.log('\n' + '='.repeat(70))
  console.log(` ${title}`)
  console.log('='.repeat(70))
}

function sub(title) {
  console.log(`\n--- ${title} ---`)
}

// ============================================================
//  Main
// ============================================================

async function main() {
  section('1GoShop - App Store Searchability Diagnostic')
  console.log(`  App ID:     ${CONFIG.appId}`)
  console.log(`  Date:       ${new Date().toISOString()}`)
  console.log(`  Store URL:  https://apps.apple.com/app/id${CONFIG.appId}`)

  const token = createAppleJWT()

  // ----------------------------------------------------------
  // 1. App basic info
  // ----------------------------------------------------------
  section('1. APP STATE & BASIC INFO')

  const appResult = await appleApiRequest(
    'GET',
    `/v1/apps/${CONFIG.appId}?fields[apps]=name,bundleId,sku,primaryLocale,contentRightsDeclaration,isOrEverWasMadeForKids`,
    token
  )
  if (appResult.statusCode < 400 && appResult.data?.data) {
    const attrs = appResult.data.data.attributes
    console.log('  Name:                      ', attrs.name)
    console.log('  Bundle ID:                 ', attrs.bundleId)
    console.log('  SKU:                       ', attrs.sku)
    console.log('  Primary Locale:            ', attrs.primaryLocale)
    console.log('  Content Rights Declaration:', attrs.contentRightsDeclaration || 'NOT SET')
    console.log('  Made for Kids:             ', attrs.isOrEverWasMadeForKids)
  } else {
    console.log('  ERROR:', JSON.stringify(appResult.data?.errors || appResult, null, 2))
  }

  // ----------------------------------------------------------
  // 2. App Store Versions
  // ----------------------------------------------------------
  section('2. APP STORE VERSIONS')

  const versionsResult = await appleApiRequest(
    'GET',
    `/v1/apps/${CONFIG.appId}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState,appVersionState,releaseType,createdDate,platform&limit=5`,
    token
  )
  if (versionsResult.statusCode < 400 && versionsResult.data?.data) {
    const versions = versionsResult.data.data
    console.log(`  Total versions returned: ${versions.length}`)
    for (const v of versions) {
      const a = v.attributes
      console.log(`\n  Version ${a.versionString} (${a.platform})`)
      console.log(`    appStoreState:  ${a.appStoreState}`)
      console.log(`    appVersionState: ${a.appVersionState}`)
      console.log(`    releaseType:    ${a.releaseType}`)
      console.log(`    createdDate:    ${a.createdDate}`)

      // Check version localizations for this version (keywords, description, etc.)
      sub(`Version ${a.versionString} Localizations`)
      const locResult = await appleApiRequest(
        'GET',
        `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,description,keywords,whatsNew,promotionalText,marketingUrl,supportUrl`,
        token
      )
      if (locResult.statusCode < 400 && locResult.data?.data) {
        for (const loc of locResult.data.data) {
          const la = loc.attributes
          console.log(`\n    Locale: ${la.locale}`)
          console.log(`      Keywords:         ${la.keywords || 'NONE'}`)
          console.log(`      Description:      ${la.description ? la.description.substring(0, 100) + '...' : 'NONE'}`)
          console.log(`      What's New:       ${la.whatsNew ? la.whatsNew.substring(0, 80) + '...' : 'NONE'}`)
          console.log(`      Promotional Text: ${la.promotionalText || 'NONE'}`)
          console.log(`      Marketing URL:    ${la.marketingUrl || 'NONE'}`)
          console.log(`      Support URL:      ${la.supportUrl || 'NONE'}`)
        }
      } else {
        console.log('    Could not fetch localizations:', locResult.statusCode)
      }
    }
  } else {
    console.log('  ERROR:', JSON.stringify(versionsResult.data?.errors || versionsResult, null, 2))
  }

  // ----------------------------------------------------------
  // 3. App Price Schedule
  // ----------------------------------------------------------
  section('3. APP PRICE SCHEDULE')

  // Try v2 first (newer endpoint)
  let priceResult = await appleApiRequest(
    'GET',
    `/v2/apps/${CONFIG.appId}/appPriceSchedule`,
    token
  )
  if (priceResult.statusCode >= 400) {
    // Fall back to v1
    sub('v2 failed, trying v1 appPricePoints')
    priceResult = await appleApiRequest(
      'GET',
      `/v1/apps/${CONFIG.appId}/appPriceSchedule`,
      token
    )
  }

  if (priceResult.statusCode < 400 && priceResult.data) {
    console.log('  Price schedule data:')
    console.log(JSON.stringify(priceResult.data, null, 4).split('\n').map(l => '    ' + l).join('\n'))
  } else {
    console.log('  Status:', priceResult.statusCode)
    console.log('  Response:', JSON.stringify(priceResult.data?.errors || priceResult.data || priceResult.raw, null, 2))
  }

  // Also try to check in-app purchases / subscription info
  sub('Checking if price is set via appPricePoints')
  const pricePointsResult = await appleApiRequest(
    'GET',
    `/v1/apps/${CONFIG.appId}/pricePoints?filter[territory]=USA&limit=1`,
    token
  )
  if (pricePointsResult.statusCode < 400) {
    console.log('  Price points status:', pricePointsResult.statusCode)
    const points = pricePointsResult.data?.data || []
    if (points.length > 0) {
      console.log('  First price point:', JSON.stringify(points[0].attributes, null, 4))
    } else {
      console.log('  NO PRICE POINTS FOUND - This could be the issue!')
    }
  } else {
    console.log('  Price points check:', pricePointsResult.statusCode, JSON.stringify(pricePointsResult.data?.errors?.[0]?.detail || '', null, 2))
  }

  // ----------------------------------------------------------
  // 4. App Infos (content state, age rating, categories)
  // ----------------------------------------------------------
  section('4. APP INFOS & CONTENT STATE')

  const appInfoResult = await appleApiRequest(
    'GET',
    `/v1/apps/${CONFIG.appId}/appInfos?include=primaryCategory,secondaryCategory,primarySubcategoryOne,primarySubcategoryTwo`,
    token
  )
  if (appInfoResult.statusCode < 400 && appInfoResult.data?.data) {
    const infos = appInfoResult.data.data
    const included = appInfoResult.data.included || []
    console.log(`  App infos returned: ${infos.length}`)

    for (const info of infos) {
      const ia = info.attributes
      console.log(`\n  App Info ID: ${info.id}`)
      console.log(`    appStoreState:        ${ia.appStoreState}`)
      console.log(`    appStoreAgeRating:    ${ia.appStoreAgeRating}`)
      console.log(`    brazilAgeRating:      ${ia.brazilAgeRating}`)
      console.log(`    brazilAgeRatingV2:    ${ia.brazilAgeRatingV2}`)
      console.log(`    kidsAgeBand:          ${ia.kidsAgeBand}`)

      // Show categories from included
      const primaryCatId = info.relationships?.primaryCategory?.data?.id
      const secondaryCatId = info.relationships?.secondaryCategory?.data?.id
      const primaryCat = included.find(i => i.id === primaryCatId)
      const secondaryCat = included.find(i => i.id === secondaryCatId)
      console.log(`    Primary Category:     ${primaryCatId || 'NOT SET'} ${primaryCat ? '(' + JSON.stringify(primaryCat.attributes) + ')' : ''}`)
      console.log(`    Secondary Category:   ${secondaryCatId || 'NOT SET'} ${secondaryCat ? '(' + JSON.stringify(secondaryCat.attributes) + ')' : ''}`)

      // Age Rating Declaration
      sub('Age Rating Declaration')
      const ageResult = await appleApiRequest(
        'GET',
        `/v1/appInfos/${info.id}/ageRatingDeclaration`,
        token
      )
      if (ageResult.statusCode < 400 && ageResult.data?.data) {
        console.log(JSON.stringify(ageResult.data.data.attributes, null, 4).split('\n').map(l => '    ' + l).join('\n'))
      } else {
        console.log('    Could not fetch age rating:', ageResult.statusCode)
      }

      // App Info Localizations (subtitle, etc.)
      sub('App Info Localizations')
      const infoLocResult = await appleApiRequest(
        'GET',
        `/v1/appInfos/${info.id}/appInfoLocalizations`,
        token
      )
      if (infoLocResult.statusCode < 400 && infoLocResult.data?.data) {
        for (const loc of infoLocResult.data.data) {
          const la = loc.attributes
          console.log(`    Locale: ${la.locale}`)
          console.log(`      Name:              ${la.name || 'NOT SET'}`)
          console.log(`      Subtitle:          ${la.subtitle || 'NOT SET'}`)
          console.log(`      Privacy Policy URL: ${la.privacyPolicyUrl || 'NOT SET'}`)
          console.log(`      Privacy Choices URL: ${la.privacyChoicesUrl || 'NOT SET'}`)
          console.log(`      Privacy Policy Text: ${la.privacyPolicyText ? 'SET' : 'NOT SET'}`)
        }
      }
    }
  } else {
    console.log('  ERROR:', JSON.stringify(appInfoResult.data?.errors || appInfoResult, null, 2))
  }

  // ----------------------------------------------------------
  // 5. Territory Availability
  // ----------------------------------------------------------
  section('5. TERRITORY AVAILABILITY')

  const territoryResult = await appleApiRequest(
    'GET',
    `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?include=territory&limit=200`,
    token
  )
  if (territoryResult.statusCode < 400 && territoryResult.data?.data) {
    const territories = territoryResult.data.data
    const included = territoryResult.data.included || []

    const territoryMap = {}
    for (const t of included) {
      if (t.type === 'territories') {
        territoryMap[t.id] = t.id
      }
    }

    // Group by content statuses
    const statusGroups = {}
    let availableCount = 0
    let slovakiaStatus = null

    for (const t of territories) {
      const statuses = (t.attributes?.contentStatuses || []).sort().join(' + ')
      if (!statusGroups[statuses]) statusGroups[statuses] = []
      const territoryId = t.relationships?.territory?.data?.id || 'unknown'
      statusGroups[statuses].push(territoryId)

      if ((t.attributes?.contentStatuses || []).includes('AVAILABLE')) {
        availableCount++
      }
      if (territoryId === 'SVK') {
        slovakiaStatus = t.attributes?.contentStatuses
      }
    }

    console.log(`  Total territories: ${territories.length}`)
    console.log(`  AVAILABLE in: ${availableCount} territories`)

    if (slovakiaStatus) {
      console.log(`\n  ** SLOVAKIA (SVK): ${slovakiaStatus.join(', ')} **`)
    } else {
      console.log('\n  ** SLOVAKIA (SVK): NOT FOUND IN TERRITORIES - APP NOT AVAILABLE IN SLOVAKIA! **')
    }

    console.log('\n  Status breakdown:')
    for (const [status, terrs] of Object.entries(statusGroups)) {
      console.log(`    [${status}]: ${terrs.length} territories`)
      // Show first 10 only
      if (terrs.length <= 15) {
        console.log(`      ${terrs.join(', ')}`)
      } else {
        console.log(`      ${terrs.slice(0, 10).join(', ')}  ... and ${terrs.length - 10} more`)
      }
    }
  } else {
    console.log('  ERROR:', JSON.stringify(territoryResult.data?.errors || territoryResult, null, 2))
  }

  // ----------------------------------------------------------
  // 6. iTunes Lookup (Public Index Check)
  // ----------------------------------------------------------
  section('6. iTUNES LOOKUP (PUBLIC INDEX)')

  console.log('  Checking if app is indexed in the public App Store...')

  // Check by ID
  const lookupById = await httpsFetch(`https://itunes.apple.com/lookup?id=${CONFIG.appId}`)
  console.log(`\n  Lookup by ID (${CONFIG.appId}):`)
  console.log(`    HTTP Status: ${lookupById.statusCode}`)
  console.log(`    Result Count: ${lookupById.data?.resultCount ?? 'N/A'}`)

  if (lookupById.data?.resultCount > 0) {
    const app = lookupById.data.results[0]
    console.log(`    Track Name:      ${app.trackName}`)
    console.log(`    Bundle ID:       ${app.bundleId}`)
    console.log(`    Version:         ${app.version}`)
    console.log(`    Release Date:    ${app.releaseDate}`)
    console.log(`    Current Release: ${app.currentVersionReleaseDate}`)
    console.log(`    Price:           ${app.price} ${app.currency}`)
    console.log(`    Content Rating:  ${app.contentAdvisoryRating}`)
    console.log(`    Genres:          ${app.genres?.join(', ')}`)
    console.log(`    Artist Name:     ${app.artistName}`)
    console.log(`    Store URL:       ${app.trackViewUrl}`)
    console.log(`    Average Rating:  ${app.averageUserRating ?? 'No ratings yet'}`)
    console.log(`    Rating Count:    ${app.userRatingCount ?? 0}`)
    console.log(`    Description:     ${(app.description || '').substring(0, 120)}...`)
  } else {
    console.log('    ** APP NOT FOUND IN PUBLIC iTunes INDEX **')
    console.log('    This means the app is either:')
    console.log('    1. Not yet fully processed by Apple (can take 24-48h after approval)')
    console.log('    2. Not available in any territory')
    console.log('    3. Has pricing/availability issues')
    console.log('    4. Was removed or rejected')
  }

  // Also try lookup by bundle ID
  sub('Lookup by Bundle ID')
  const appAttrs = appResult.data?.data?.attributes
  if (appAttrs?.bundleId) {
    const lookupByBundle = await httpsFetch(`https://itunes.apple.com/lookup?bundleId=${appAttrs.bundleId}`)
    console.log(`  Bundle ID: ${appAttrs.bundleId}`)
    console.log(`    HTTP Status: ${lookupByBundle.statusCode}`)
    console.log(`    Result Count: ${lookupByBundle.data?.resultCount ?? 'N/A'}`)
    if (lookupByBundle.data?.resultCount > 0) {
      const app = lookupByBundle.data.results[0]
      console.log(`    Track ID found: ${app.trackId}`)
      console.log(`    Track Name: ${app.trackName}`)
    } else {
      console.log('    NOT FOUND by bundle ID either.')
    }
  }

  // Try lookup in specific country (Slovakia)
  sub('Lookup in Slovakia (SK) store')
  const lookupSK = await httpsFetch(`https://itunes.apple.com/lookup?id=${CONFIG.appId}&country=sk`)
  console.log(`    HTTP Status: ${lookupSK.statusCode}`)
  console.log(`    Result Count: ${lookupSK.data?.resultCount ?? 'N/A'}`)
  if (lookupSK.data?.resultCount > 0) {
    const app = lookupSK.data.results[0]
    console.log(`    Available in SK store: YES`)
    console.log(`    Track Name: ${app.trackName}`)
  } else {
    console.log('    ** NOT AVAILABLE IN SLOVAKIA STORE **')
  }

  // Try US store
  sub('Lookup in US store')
  const lookupUS = await httpsFetch(`https://itunes.apple.com/lookup?id=${CONFIG.appId}&country=us`)
  console.log(`    HTTP Status: ${lookupUS.statusCode}`)
  console.log(`    Result Count: ${lookupUS.data?.resultCount ?? 'N/A'}`)
  if (lookupUS.data?.resultCount > 0) {
    const app = lookupUS.data.results[0]
    console.log(`    Available in US store: YES`)
    console.log(`    Track Name: ${app.trackName}`)
  } else {
    console.log('    NOT AVAILABLE IN US STORE')
  }

  // ----------------------------------------------------------
  // 7. Check for app review / rejection status
  // ----------------------------------------------------------
  section('7. APP REVIEW STATUS')

  const reviewSubmissions = await appleApiRequest(
    'GET',
    `/v1/apps/${CONFIG.appId}/reviewSubmissions?limit=5`,
    token
  )
  if (reviewSubmissions.statusCode < 400 && reviewSubmissions.data?.data) {
    const submissions = reviewSubmissions.data.data
    console.log(`  Recent review submissions: ${submissions.length}`)
    for (const s of submissions) {
      console.log(`\n    Submission ID: ${s.id}`)
      console.log(`      State:       ${s.attributes?.state}`)
      console.log(`      Submitted:   ${s.attributes?.submittedDate}`)
      console.log(`      Platform:    ${s.attributes?.platform}`)
    }
  } else {
    console.log('  Could not fetch review submissions:', reviewSubmissions.statusCode)
    if (reviewSubmissions.data?.errors) {
      console.log('  ', reviewSubmissions.data.errors[0]?.detail)
    }
  }

  // ----------------------------------------------------------
  // 8. Check app availability (v2 - includes streamlinedWaitingForExportCompliance)
  // ----------------------------------------------------------
  section('8. APP AVAILABILITY (v2)')

  const availabilityResult = await appleApiRequest(
    'GET',
    `/v2/appAvailabilities/${CONFIG.appId}`,
    token
  )
  if (availabilityResult.statusCode < 400 && availabilityResult.data?.data) {
    const avail = availabilityResult.data.data
    console.log('  Attributes:', JSON.stringify(avail.attributes, null, 4))
  } else {
    console.log('  Status:', availabilityResult.statusCode)
    if (availabilityResult.data?.errors) {
      console.log('  Error:', availabilityResult.data.errors[0]?.detail)
    }
  }

  // ----------------------------------------------------------
  // 9. Check search ads / Apple Search API
  // ----------------------------------------------------------
  section('9. SEARCH CHECK (iTunes Search API)')

  // Try searching by app name
  const appName = appResult.data?.data?.attributes?.name || '1GoShop'
  const searchTerm = encodeURIComponent(appName)
  const searchResult = await httpsFetch(`https://itunes.apple.com/search?term=${searchTerm}&country=sk&entity=software&limit=10`)
  console.log(`  Search term: "${appName}" (country=sk)`)
  console.log(`    HTTP Status: ${searchResult.statusCode}`)
  console.log(`    Result Count: ${searchResult.data?.resultCount ?? 'N/A'}`)

  if (searchResult.data?.results) {
    const found = searchResult.data.results.find(r => String(r.trackId) === CONFIG.appId)
    if (found) {
      console.log(`    ** APP FOUND IN SEARCH RESULTS! **`)
      console.log(`    Position: ${searchResult.data.results.indexOf(found) + 1} of ${searchResult.data.results.length}`)
    } else {
      console.log(`    ** APP NOT FOUND IN SEARCH RESULTS **`)
      console.log('    Apps found instead:')
      for (const r of searchResult.data.results.slice(0, 5)) {
        console.log(`      - ${r.trackName} (${r.trackId}) by ${r.artistName}`)
      }
    }
  }

  // Also search in US store
  sub('Search in US store')
  const searchUS = await httpsFetch(`https://itunes.apple.com/search?term=${searchTerm}&country=us&entity=software&limit=5`)
  console.log(`  Search term: "${appName}" (country=us)`)
  console.log(`    Result Count: ${searchUS.data?.resultCount ?? 'N/A'}`)
  if (searchUS.data?.results) {
    const found = searchUS.data.results.find(r => String(r.trackId) === CONFIG.appId)
    if (found) {
      console.log(`    ** APP FOUND IN US SEARCH RESULTS! **`)
    } else {
      console.log(`    ** APP NOT FOUND IN US SEARCH RESULTS **`)
    }
  }

  // ----------------------------------------------------------
  // ANALYSIS & RECOMMENDATIONS
  // ----------------------------------------------------------
  section('ANALYSIS & RECOMMENDATIONS')

  const issues = []

  // Check if app is in Ready for Distribution state
  const latestVersion = versionsResult.data?.data?.[0]
  if (latestVersion) {
    const state = latestVersion.attributes?.appStoreState
    if (state !== 'READY_FOR_SALE' && state !== 'PROCESSING_FOR_APP_STORE') {
      issues.push(`App store state is "${state}" - must be "READY_FOR_SALE" to be searchable`)
    } else if (state === 'READY_FOR_SALE') {
      console.log('  [OK] App state is READY_FOR_SALE')
    }
  }

  // Check iTunes index
  if (lookupById.data?.resultCount === 0) {
    issues.push('App is NOT indexed in iTunes lookup API - not visible to users')
  } else {
    console.log('  [OK] App is indexed in iTunes lookup')
  }

  // Check pricing
  if (priceResult.statusCode >= 400) {
    issues.push('Could not verify pricing - pricing may not be configured')
  }

  // Check Slovakia availability
  if (lookupSK.data?.resultCount === 0) {
    issues.push('App is NOT available in Slovakia App Store')
  } else {
    console.log('  [OK] App is available in Slovakia store')
  }

  // Check keywords
  if (versionsResult.data?.data?.[0]) {
    const vId = versionsResult.data.data[0].id
    const locCheck = await appleApiRequest(
      'GET',
      `/v1/appStoreVersions/${vId}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,keywords`,
      token
    )
    if (locCheck.statusCode < 400) {
      const hasKeywords = locCheck.data?.data?.some(l => l.attributes?.keywords)
      if (!hasKeywords) {
        issues.push('No keywords set in any localization - this severely affects search discoverability')
      } else {
        console.log('  [OK] Keywords are set')
      }
    }
  }

  // Content rights
  if (appResult.data?.data?.attributes?.contentRightsDeclaration === 'DOES_NOT_USE_THIRD_PARTY_CONTENT') {
    console.log('  [OK] Content rights declaration is set')
  } else {
    const crd = appResult.data?.data?.attributes?.contentRightsDeclaration
    if (!crd) {
      issues.push('Content rights declaration not set')
    }
  }

  if (issues.length > 0) {
    console.log('\n  ISSUES FOUND:')
    for (let i = 0; i < issues.length; i++) {
      console.log(`    ${i + 1}. ${issues[i]}`)
    }
  } else {
    console.log('\n  No obvious issues found via API.')
    console.log('  If app was recently approved, search indexing can take 24-48 hours.')
    console.log('  New apps with zero downloads/ratings rank very low in search.')
  }

  console.log('\n  COMMON REASONS FOR NOT BEING SEARCHABLE:')
  console.log('    1. App not in READY_FOR_SALE state')
  console.log('    2. Pricing not set (even free apps need price tier 0)')
  console.log('    3. No territory availability')
  console.log('    4. Missing keywords in version localizations')
  console.log('    5. Apple indexing delay (24-48h for new apps)')
  console.log('    6. App name conflict with established apps')
  console.log('    7. Export compliance / encryption not declared')
  console.log('    8. Privacy nutrition labels incomplete')
  console.log('    9. DSA trader status not provided (EU territories)')
  console.log('   10. App removed from sale or rejected')
  console.log('')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
