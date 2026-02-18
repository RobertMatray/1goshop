import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
const { sign } = jwt
import { resolve } from 'path'

// ============================================================================
// Configuration
// ============================================================================

const API_KEY_PATH = resolve('./internals/appstore-api/AuthKey_79PJWGG49Z.p8')
const KEY_ID = '79PJWGG49Z'
const ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
const BASE_URL = 'https://api.appstoreconnect.apple.com/v1'

const ASC_APP_ID = '6759269751'
const VERSION_ID = '139155f5-3177-4e12-9199-23b3667a56cb'
const SK_LOCALIZATION_ID = '6fa5b847-f055-4d9c-936e-82fcbb934489'

// Existing SK screenshot sets
const SK_SCREENSHOT_SETS = {
  'APP_IPHONE_67': '331c6daa-4caf-44db-9294-1cf149dfe9fe',
  'APP_IPHONE_65': '15590acd-637a-4c8a-aca7-b03c02585e60',
}

const EN_METADATA = {
  description: '1GoShop is a simple and fast shopping list app. Add items, check them off, and start shopping with one tap. Track your shopping history, export and import your lists, and customize with dark mode and 7 languages.',
  keywords: 'shopping list,grocery,checklist,shopping,list,one tap,quick,simple,groceries,market',
  subtitle: 'One-tap shopping list',
}

// ============================================================================
// JWT Token Generation
// ============================================================================

function generateJWT() {
  const privateKey = readFileSync(API_KEY_PATH, 'utf8')
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: 'appstoreconnect-v1',
  }

  const token = sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: KEY_ID,
      typ: 'JWT',
    },
  })

  console.log('[JWT] Token generated successfully')
  return token
}

// ============================================================================
// API Helpers
// ============================================================================

async function apiRequest(method, path, body = null) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const options = { method, headers }
  if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)
  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (!res.ok) {
    console.error(`[API ERROR] ${method} ${path} -> ${res.status}`)
    console.error(JSON.stringify(data, null, 2))
    throw new Error(`API request failed: ${res.status} ${res.statusText}`)
  }

  return data
}

// ============================================================================
// Step 1: Create EN-US Version Localization
// ============================================================================

async function createEnLocalization() {
  console.log('\n========================================')
  console.log('[EN LOCALIZATION] Creating en-US version localization...')

  // First check if it already exists (must query via version relationship)
  const existing = await apiRequest('GET', `/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`)
  const enLoc = existing.data?.find(loc => loc.attributes?.locale === 'en-US')

  if (enLoc) {
    console.log(`[EN LOCALIZATION] Already exists with ID: ${enLoc.id}`)
    return enLoc.id
  }

  const body = {
    data: {
      type: 'appStoreVersionLocalizations',
      attributes: {
        locale: 'en-US',
        description: EN_METADATA.description,
        keywords: EN_METADATA.keywords,
        marketingUrl: null,
        promotionalText: null,
        supportUrl: null,
        whatsNew: null,
      },
      relationships: {
        appStoreVersion: {
          data: {
            type: 'appStoreVersions',
            id: VERSION_ID,
          },
        },
      },
    },
  }

  const result = await apiRequest('POST', '/appStoreVersionLocalizations', body)
  const locId = result.data.id
  console.log(`[EN LOCALIZATION] Created with ID: ${locId}`)
  return locId
}

// ============================================================================
// Step 2: Set EN Metadata (subtitle)
// ============================================================================

async function setEnMetadata(enLocalizationId) {
  console.log('\n========================================')
  console.log('[EN METADATA] Setting subtitle on version localization...')

  // The subtitle is set via PATCH on the localization
  const body = {
    data: {
      type: 'appStoreVersionLocalizations',
      id: enLocalizationId,
      attributes: {
        description: EN_METADATA.description,
        keywords: EN_METADATA.keywords,
      },
    },
  }

  await apiRequest('PATCH', `/appStoreVersionLocalizations/${enLocalizationId}`, body)
  console.log('[EN METADATA] Description and keywords set on version localization')

  // Subtitle is on appInfoLocalization - check/create EN appInfo localization
  console.log('[EN METADATA] Setting subtitle on appInfo localization...')

  // Get appInfo for this app
  const appInfos = await apiRequest('GET', `/apps/${ASC_APP_ID}/appInfos`)
  const appInfoId = appInfos.data?.[0]?.id
  if (!appInfoId) {
    throw new Error('Could not find appInfo')
  }
  console.log(`[EN METADATA] AppInfo ID: ${appInfoId}`)

  // Check existing appInfo localizations
  const appInfoLocs = await apiRequest('GET', `/appInfos/${appInfoId}/appInfoLocalizations`)
  const enAppInfoLoc = appInfoLocs.data?.find(loc => loc.attributes?.locale === 'en-US')

  if (enAppInfoLoc) {
    console.log(`[EN METADATA] EN appInfo localization exists: ${enAppInfoLoc.id}`)
    // Update subtitle
    const patchBody = {
      data: {
        type: 'appInfoLocalizations',
        id: enAppInfoLoc.id,
        attributes: {
          subtitle: EN_METADATA.subtitle,
        },
      },
    }
    await apiRequest('PATCH', `/appInfoLocalizations/${enAppInfoLoc.id}`, patchBody)
    console.log('[EN METADATA] Subtitle updated')
  } else {
    console.log('[EN METADATA] Creating EN appInfo localization...')
    const createBody = {
      data: {
        type: 'appInfoLocalizations',
        attributes: {
          locale: 'en-US',
          subtitle: EN_METADATA.subtitle,
        },
        relationships: {
          appInfo: {
            data: {
              type: 'appInfos',
              id: appInfoId,
            },
          },
        },
      },
    }
    const result = await apiRequest('POST', '/appInfoLocalizations', createBody)
    console.log(`[EN METADATA] Created EN appInfo localization: ${result.data.id}`)
  }

  console.log('[EN METADATA] All EN metadata set successfully')
}

// ============================================================================
// Step 3: Create Screenshot Sets for EN
// ============================================================================

async function createScreenshotSets(localizationId) {
  console.log('\n========================================')
  console.log('[SCREENSHOT SETS] Creating screenshot sets for EN locale...')

  const displayTypes = ['APP_IPHONE_67', 'APP_IPHONE_65']
  const results = {}

  for (const displayType of displayTypes) {
    // Check if it already exists
    const existing = await apiRequest(
      'GET',
      `/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`
    )
    const existingSet = existing.data?.find(s => s.attributes?.screenshotDisplayType === displayType)

    if (existingSet) {
      console.log(`[SCREENSHOT SETS] ${displayType} already exists: ${existingSet.id}`)
      results[displayType] = existingSet.id
      continue
    }

    const body = {
      data: {
        type: 'appScreenshotSets',
        attributes: {
          screenshotDisplayType: displayType,
        },
        relationships: {
          appStoreVersionLocalization: {
            data: {
              type: 'appStoreVersionLocalizations',
              id: localizationId,
            },
          },
        },
      },
    }

    const result = await apiRequest('POST', '/appScreenshotSets', body)
    results[displayType] = result.data.id
    console.log(`[SCREENSHOT SETS] ${displayType} created: ${result.data.id}`)
  }

  return results
}

// ============================================================================
// Step 4: Upload Screenshots (3-step process)
// ============================================================================

async function uploadScreenshot(screenshotSetId, filePath, fileName) {
  console.log(`\n  [UPLOAD] ${fileName}`)

  // Read file
  const fileData = readFileSync(filePath)
  const fileSize = fileData.length
  console.log(`  [UPLOAD] File size: ${fileSize} bytes`)

  // Calculate MD5 checksum
  const md5Checksum = createHash('md5').update(fileData).digest('hex')
  console.log(`  [UPLOAD] MD5 checksum: ${md5Checksum}`)

  // --- Step 1: Reserve screenshot upload (NO sourceFileChecksum here) ---
  console.log('  [UPLOAD] Step 1: Reserving upload slot...')

  const reserveBody = {
    data: {
      type: 'appScreenshots',
      attributes: {
        fileName: fileName,
        fileSize: fileSize,
      },
      relationships: {
        appScreenshotSet: {
          data: {
            type: 'appScreenshotSets',
            id: screenshotSetId,
          },
        },
      },
    },
  }

  const reserveResult = await apiRequest('POST', '/appScreenshots', reserveBody)
  const screenshotId = reserveResult.data.id
  const uploadOperations = reserveResult.data.attributes.uploadOperations
  console.log(`  [UPLOAD] Reserved screenshot ID: ${screenshotId}`)
  console.log(`  [UPLOAD] Got ${uploadOperations.length} upload operation(s)`)

  // --- Step 2: Upload file data to provided URL(s) ---
  console.log('  [UPLOAD] Step 2: Uploading file data...')

  for (const op of uploadOperations) {
    const { method, url, requestHeaders, offset, length } = op
    const chunk = fileData.subarray(offset, offset + length)

    const headers = {}
    for (const h of requestHeaders) {
      headers[h.name] = h.value
    }

    console.log(`  [UPLOAD] PUT ${chunk.length} bytes to upload URL (offset ${offset})...`)

    const uploadRes = await fetch(url, {
      method: method || 'PUT',
      headers,
      body: chunk,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error(`  [UPLOAD ERROR] Upload failed: ${uploadRes.status}`)
      console.error(errText)
      throw new Error(`Upload failed: ${uploadRes.status}`)
    }

    console.log(`  [UPLOAD] Chunk uploaded successfully (${uploadRes.status})`)
  }

  // --- Step 3: Commit upload with checksum ---
  console.log('  [UPLOAD] Step 3: Committing upload with checksum...')

  const commitBody = {
    data: {
      type: 'appScreenshots',
      id: screenshotId,
      attributes: {
        uploaded: true,
        sourceFileChecksum: md5Checksum,
      },
    },
  }

  const commitResult = await apiRequest('PATCH', `/appScreenshots/${screenshotId}`, commitBody)
  const state = commitResult.data.attributes.assetDeliveryState?.state
  console.log(`  [UPLOAD] Committed. Asset state: ${state}`)

  return screenshotId
}

async function uploadAllScreenshotsForSet(screenshotSetId, directory, filePrefix, count) {
  const results = []

  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(2, '0')
    const fileName = `${filePrefix}${num}.png`
    const filePath = resolve(directory, fileName)

    try {
      const id = await uploadScreenshot(screenshotSetId, filePath, fileName)
      results.push({ fileName, id, success: true })
    } catch (err) {
      console.error(`  [UPLOAD FAILED] ${fileName}: ${err.message}`)
      results.push({ fileName, id: null, success: false, error: err.message })
    }
  }

  return results
}

// ============================================================================
// Main Execution
// ============================================================================

console.log('==============================================')
console.log('  App Store Connect - Screenshot & Metadata Upload')
console.log('  App: 1GoShop (ID: ' + ASC_APP_ID + ')')
console.log('==============================================')

// Generate JWT
const token = generateJWT()

try {
  // ---- EN Localization & Metadata ----
  const enLocalizationId = await createEnLocalization()
  await setEnMetadata(enLocalizationId)

  // ---- Create EN Screenshot Sets ----
  const enScreenshotSets = await createScreenshotSets(enLocalizationId)

  // ---- Upload SK Screenshots ----
  console.log('\n========================================')
  console.log('[SCREENSHOTS] Uploading SK screenshots...')

  console.log('\n--- SK 6.7" (APP_IPHONE_67) ---')
  const sk67Results = await uploadAllScreenshotsForSet(
    SK_SCREENSHOT_SETS['APP_IPHONE_67'],
    resolve('./appstore-screenshots/SK/6.7'),
    '',
    4
  )

  console.log('\n--- SK 6.5" (APP_IPHONE_65) ---')
  const sk65Results = await uploadAllScreenshotsForSet(
    SK_SCREENSHOT_SETS['APP_IPHONE_65'],
    resolve('./appstore-screenshots/SK/6.5'),
    '',
    4
  )

  // ---- Upload EN Screenshots ----
  console.log('\n========================================')
  console.log('[SCREENSHOTS] Uploading EN screenshots...')

  console.log('\n--- EN 6.7" (APP_IPHONE_67) ---')
  const en67Results = await uploadAllScreenshotsForSet(
    enScreenshotSets['APP_IPHONE_67'],
    resolve('./appstore-screenshots/EN/6.7'),
    'en_',
    4
  )

  console.log('\n--- EN 6.5" (APP_IPHONE_65) ---')
  const en65Results = await uploadAllScreenshotsForSet(
    enScreenshotSets['APP_IPHONE_65'],
    resolve('./appstore-screenshots/EN/6.5'),
    'en_',
    4
  )

  // ---- Summary ----
  console.log('\n==============================================')
  console.log('  UPLOAD SUMMARY')
  console.log('==============================================')

  const allResults = [
    { label: 'SK 6.7"', results: sk67Results },
    { label: 'SK 6.5"', results: sk65Results },
    { label: 'EN 6.7"', results: en67Results },
    { label: 'EN 6.5"', results: en65Results },
  ]

  let totalSuccess = 0
  let totalFailed = 0

  for (const group of allResults) {
    console.log(`\n  ${group.label}:`)
    for (const r of group.results) {
      const status = r.success ? 'OK' : `FAILED (${r.error})`
      console.log(`    ${r.fileName}: ${status}`)
      if (r.success) totalSuccess++
      else totalFailed++
    }
  }

  console.log(`\n  Total: ${totalSuccess} succeeded, ${totalFailed} failed out of ${totalSuccess + totalFailed}`)
  console.log('\n  EN Localization ID: ' + enLocalizationId)
  console.log('  EN Screenshot Sets:')
  for (const [type, id] of Object.entries(enScreenshotSets)) {
    console.log(`    ${type}: ${id}`)
  }

  if (totalFailed > 0) {
    console.log('\n  WARNING: Some uploads failed. Check errors above.')
    process.exit(1)
  }

  console.log('\n  All done! Screenshots and metadata uploaded successfully.')
} catch (err) {
  console.error('\n[FATAL ERROR]', err.message)
  console.error(err.stack)
  process.exit(1)
}
