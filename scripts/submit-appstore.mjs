import { readFileSync, existsSync } from 'fs'
import jwt from 'jsonwebtoken'
const { sign } = jwt
import { resolve } from 'path'
import { createHash } from 'crypto'

// ============================================================================
// Configuration (only constants that never change)
// ============================================================================

const API_KEY_PATH = resolve('../superapp-ai-poc/internals/appstore-api/AuthKey_79PJWGG49Z.p8')
const KEY_ID = '79PJWGG49Z'
const ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
const BASE_URL = 'https://api.appstoreconnect.apple.com/v1'

const ASC_APP_ID = '6759269751'

const PRIVACY_POLICY_URL = 'https://1goshop.realise.sk/privacy-policy.html'
const SUPPORT_URL = 'https://1goshop.realise.sk/'
const MARKETING_URL = 'https://1goshop.realise.sk/'
const COPYRIGHT = '2026 Robert Matray'
const CONTACT_EMAIL = 'matray@realise.sk'
const CONTACT_PHONE = '+421907123456'

// What's New text per locale (for app updates — required by Apple for non-first versions)
const WHATS_NEW = {
  sk: 'Zdieľanie nákupných zoznamov v reálnom čase s rodinou a priateľmi. Offline podpora s automatickou synchronizáciou. Vylepšená stabilita.',
  'en-US': 'Real-time shopping list sharing with family and friends. Offline support with automatic sync. Improved stability.',
}

// Target version — pass as CLI arg or auto-detect from app.config.ts
const TARGET_VERSION = process.argv[2] || null

// ============================================================================
// JWT Token Generation
// ============================================================================

function generateJWT() {
  const privateKey = readFileSync(API_KEY_PATH, 'utf8')
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
  }

  const jwtToken = sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: KEY_ID,
      typ: 'JWT',
    },
  })

  return jwtToken
}

// ============================================================================
// API Helpers
// ============================================================================

let token = generateJWT()

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

  if (method === 'DELETE' && res.status === 204) {
    return { success: true }
  }

  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (!res.ok) {
    console.error(`[API ERROR] ${method} ${path} -> ${res.status}`)
    if (typeof data === 'object') {
      console.error(JSON.stringify(data, null, 2))
    } else {
      console.error(data)
    }
    throw new Error(`API request failed: ${res.status} ${res.statusText}`)
  }

  return data
}

// ============================================================================
// Auto-detect version from app.config.ts
// ============================================================================

function getVersionFromConfig() {
  try {
    const config = readFileSync(resolve('app.config.ts'), 'utf8')
    const match = config.match(/version:\s*['"]([^'"]+)['"]/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// ============================================================================
// Step 0: Find or create App Store version
// ============================================================================

async function findOrCreateVersion(targetVersion) {
  console.log('\n========================================')
  console.log('[STEP 0] Finding or creating App Store version...')
  console.log('========================================')

  // List existing versions
  const versions = await apiRequest(
    'GET',
    `/apps/${ASC_APP_ID}/appStoreVersions?limit=10`
  )

  // Look for editable version (PREPARE_FOR_SUBMISSION, DEVELOPER_REJECTED, etc.)
  const editableStates = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']
  let editableVersion = versions.data?.find(v =>
    editableStates.includes(v.attributes.appStoreState)
  )

  if (editableVersion) {
    console.log(`[STEP 0] Found editable version: ${editableVersion.attributes.versionString} (${editableVersion.attributes.appStoreState})`)

    // If target version specified and different, update it
    if (targetVersion && editableVersion.attributes.versionString !== targetVersion) {
      console.log(`[STEP 0] Updating version string from ${editableVersion.attributes.versionString} to ${targetVersion}...`)
      await apiRequest('PATCH', `/appStoreVersions/${editableVersion.id}`, {
        data: {
          type: 'appStoreVersions',
          id: editableVersion.id,
          attributes: { versionString: targetVersion },
        },
      })
      editableVersion.attributes.versionString = targetVersion
    }

    return editableVersion
  }

  // No editable version exists — create new one
  const newVersion = targetVersion || getVersionFromConfig() || '1.3.0'
  console.log(`[STEP 0] No editable version found. Creating v${newVersion}...`)

  const result = await apiRequest('POST', '/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: {
        versionString: newVersion,
        platform: 'IOS',
        copyright: COPYRIGHT,
      },
      relationships: {
        app: {
          data: { type: 'apps', id: ASC_APP_ID },
        },
      },
    },
  })

  console.log(`[STEP 0] Created version: ${result.data.attributes.versionString} (ID: ${result.data.id})`)
  return result.data
}

// ============================================================================
// Step 1: Find latest valid build
// ============================================================================

async function findLatestBuild() {
  console.log('\n========================================')
  console.log('[STEP 1] Finding latest valid build...')
  console.log('========================================')

  const builds = await apiRequest(
    'GET',
    `/builds?filter[app]=${ASC_APP_ID}&sort=-uploadedDate&limit=5`
  )

  if (!builds.data || builds.data.length === 0) {
    console.error('[STEP 1] No builds found!')
    return null
  }

  for (const build of builds.data) {
    const attrs = build.attributes
    console.log(`  Build ${attrs.version} | State: ${attrs.processingState} | Uploaded: ${attrs.uploadedDate}`)
  }

  const validBuild = builds.data.find(b => b.attributes.processingState === 'VALID')

  if (!validBuild) {
    console.error('[STEP 1] No VALID build found!')
    return null
  }

  console.log(`[STEP 1] Selected: Build ${validBuild.attributes.version} (${validBuild.id})`)
  return validBuild
}

// ============================================================================
// Step 2: Attach build to version
// ============================================================================

async function attachBuild(versionId, build) {
  console.log('\n========================================')
  console.log('[STEP 2] Attaching build to version...')
  console.log('========================================')

  if (!build) {
    console.log('[STEP 2] SKIPPED - No valid build')
    return false
  }

  try {
    await apiRequest('PATCH', `/appStoreVersions/${versionId}`, {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: { copyright: COPYRIGHT },
        relationships: {
          build: {
            data: { type: 'builds', id: build.id },
          },
        },
      },
    })
    console.log(`[STEP 2] Build ${build.attributes.version} attached, copyright set`)
    return true
  } catch (err) {
    console.error(`[STEP 2] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 3: Set category (SHOPPING)
// ============================================================================

async function setCategory() {
  console.log('\n========================================')
  console.log('[STEP 3] Setting category to SHOPPING...')
  console.log('========================================')

  // Get current appInfo ID dynamically
  const appInfos = await apiRequest('GET', `/apps/${ASC_APP_ID}/appInfos`)
  const appInfoId = appInfos.data?.[0]?.id

  if (!appInfoId) {
    console.error('[STEP 3] Could not find appInfo ID')
    return false
  }

  try {
    await apiRequest('PATCH', `/appInfos/${appInfoId}`, {
      data: {
        type: 'appInfos',
        id: appInfoId,
        relationships: {
          primaryCategory: {
            data: { type: 'appCategories', id: 'SHOPPING' },
          },
        },
      },
    })
    console.log('[STEP 3] Category set to SHOPPING')
    return appInfoId
  } catch (err) {
    console.error(`[STEP 3] Failed: ${err.message}`)
    return appInfoId || false
  }
}

// ============================================================================
// Step 4: Set privacy policy URL (on appInfo localizations)
// ============================================================================

async function setPrivacyPolicy(appInfoId) {
  console.log('\n========================================')
  console.log('[STEP 4] Setting privacy policy URL...')
  console.log('========================================')

  if (!appInfoId) {
    console.log('[STEP 4] SKIPPED - No appInfo ID')
    return false
  }

  const locs = await apiRequest('GET', `/appInfos/${appInfoId}/appInfoLocalizations`)
  let allSuccess = true

  for (const loc of locs.data || []) {
    try {
      await apiRequest('PATCH', `/appInfoLocalizations/${loc.id}`, {
        data: {
          type: 'appInfoLocalizations',
          id: loc.id,
          attributes: { privacyPolicyUrl: PRIVACY_POLICY_URL },
        },
      })
      console.log(`[STEP 4] Privacy policy set for ${loc.attributes.locale}`)
    } catch (err) {
      console.error(`[STEP 4] Failed for ${loc.attributes.locale}: ${err.message}`)
      allSuccess = false
    }
  }

  return allSuccess
}

// ============================================================================
// Step 5: Set support URL + marketing URL on version localizations
// ============================================================================

async function setVersionUrls(versionId) {
  console.log('\n========================================')
  console.log('[STEP 5] Setting support + marketing URLs + What\'s New...')
  console.log('========================================')

  const locs = await apiRequest('GET', `/appStoreVersions/${versionId}/appStoreVersionLocalizations`)
  let allSuccess = true

  for (const loc of locs.data || []) {
    const locale = loc.attributes.locale
    const attrs = {
      supportUrl: SUPPORT_URL,
      marketingUrl: MARKETING_URL,
    }

    // Add What's New text if available for this locale
    const whatsNew = WHATS_NEW[locale] || WHATS_NEW['en-US']
    if (whatsNew) {
      attrs.whatsNew = whatsNew
    }

    try {
      await apiRequest('PATCH', `/appStoreVersionLocalizations/${loc.id}`, {
        data: {
          type: 'appStoreVersionLocalizations',
          id: loc.id,
          attributes: attrs,
        },
      })
      console.log(`[STEP 5] URLs + What's New set for ${locale}`)
    } catch (err) {
      console.error(`[STEP 5] Failed for ${locale}: ${err.message}`)
      allSuccess = false
    }
  }

  return allSuccess
}

// ============================================================================
// Step 6: Set age rating
// ============================================================================

async function setAgeRating(appInfoId) {
  console.log('\n========================================')
  console.log('[STEP 6] Setting age rating...')
  console.log('========================================')

  try {
    const ageRating = await apiRequest('GET', `/appInfos/${appInfoId}/ageRatingDeclaration`)
    const ageRatingId = ageRating.data.id

    await apiRequest('PATCH', `/ageRatingDeclarations/${ageRatingId}`, {
      data: {
        type: 'ageRatingDeclarations',
        id: ageRatingId,
        attributes: {
          alcoholTobaccoOrDrugUseOrReferences: 'NONE',
          contests: 'NONE',
          gamblingSimulated: 'NONE',
          gunsOrOtherWeapons: 'NONE',
          horrorOrFearThemes: 'NONE',
          matureOrSuggestiveThemes: 'NONE',
          medicalOrTreatmentInformation: 'NONE',
          profanityOrCrudeHumor: 'NONE',
          sexualContentGraphicAndNudity: 'NONE',
          sexualContentOrNudity: 'NONE',
          violenceCartoonOrFantasy: 'NONE',
          violenceRealistic: 'NONE',
          violenceRealisticProlongedGraphicOrSadistic: 'NONE',
          advertising: false,
          ageAssurance: false,
          gambling: false,
          healthOrWellnessTopics: false,
          lootBox: false,
          messagingAndChat: false,
          parentalControls: false,
          unrestrictedWebAccess: false,
          userGeneratedContent: false,
        },
      },
    })
    console.log('[STEP 6] Age rating set (all NONE/false)')
    return true
  } catch (err) {
    console.error(`[STEP 6] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 7: Set content rights
// ============================================================================

async function setContentRights() {
  console.log('\n========================================')
  console.log('[STEP 7] Setting content rights...')
  console.log('========================================')

  try {
    await apiRequest('PATCH', `/apps/${ASC_APP_ID}`, {
      data: {
        type: 'apps',
        id: ASC_APP_ID,
        attributes: {
          contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
        },
      },
    })
    console.log('[STEP 7] Content rights: no third-party content')
    return true
  } catch (err) {
    console.error(`[STEP 7] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 8: Set pricing (FREE)
// ============================================================================

async function setPricing() {
  console.log('\n========================================')
  console.log('[STEP 8] Setting pricing (FREE)...')
  console.log('========================================')

  try {
    const schedule = await apiRequest('GET', `/apps/${ASC_APP_ID}/appPriceSchedule`)
    if (schedule.data) {
      try {
        const prices = await apiRequest('GET', `/appPriceSchedules/${ASC_APP_ID}/manualPrices`)
        if (prices.data?.length > 0) {
          console.log('[STEP 8] Pricing already configured')
          return true
        }
      } catch {}
    }
  } catch {}

  try {
    const pricePoints = await apiRequest('GET', `/apps/${ASC_APP_ID}/appPricePoints?filter[territory]=USA&limit=1`)
    const freePricePoint = pricePoints.data?.[0]

    if (!freePricePoint) {
      console.error('[STEP 8] Could not find free price point')
      return false
    }

    await apiRequest('POST', '/appPriceSchedules', {
      data: {
        type: 'appPriceSchedules',
        relationships: {
          app: { data: { type: 'apps', id: ASC_APP_ID } },
          manualPrices: { data: [{ type: 'appPrices', id: '${price1}' }] },
          baseTerritory: { data: { type: 'territories', id: 'USA' } },
        },
      },
      included: [{
        type: 'appPrices',
        id: '${price1}',
        attributes: { startDate: null },
        relationships: {
          appPricePoint: { data: { type: 'appPricePoints', id: freePricePoint.id } },
        },
      }],
    })
    console.log('[STEP 8] FREE pricing set')
    return true
  } catch (err) {
    console.error(`[STEP 8] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 9: Create review detail
// ============================================================================

async function createReviewDetail(versionId) {
  console.log('\n========================================')
  console.log('[STEP 9] Setting review detail...')
  console.log('========================================')

  try {
    const existing = await apiRequest('GET', `/appStoreVersions/${versionId}/appStoreReviewDetail`)
    if (existing.data) {
      console.log(`[STEP 9] Review detail already exists`)
      return true
    }
  } catch {}

  try {
    await apiRequest('POST', '/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: {
          contactEmail: CONTACT_EMAIL,
          contactFirstName: 'Robert',
          contactLastName: 'Matray',
          contactPhone: CONTACT_PHONE,
          demoAccountRequired: false,
          notes: 'Simple shopping list app. No account or login required. Just open the app and start adding items to your shopping list.',
        },
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId },
          },
        },
      },
    })
    console.log('[STEP 9] Review detail created')
    return true
  } catch (err) {
    console.error(`[STEP 9] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 10: Upload iPad screenshots (if available)
// ============================================================================

async function uploadIpadScreenshots(versionId) {
  console.log('\n========================================')
  console.log('[STEP 10] Checking iPad screenshots...')
  console.log('========================================')

  const locs = await apiRequest('GET', `/appStoreVersions/${versionId}/appStoreVersionLocalizations`)

  for (const loc of locs.data || []) {
    const locale = loc.attributes.locale
    const locId = loc.id
    const dirName = locale === 'sk' ? 'SK' : 'EN'

    const sets = await apiRequest('GET', `/appStoreVersionLocalizations/${locId}/appScreenshotSets`)
    const ipadSet = sets.data?.find(s => s.attributes?.screenshotDisplayType === 'APP_IPAD_PRO_3GEN_129')

    if (ipadSet) {
      const screenshots = await apiRequest('GET', `/appScreenshotSets/${ipadSet.id}/appScreenshots`)
      if (screenshots.data?.length > 0) {
        console.log(`[STEP 10] ${locale}: iPad screenshots already uploaded (${screenshots.data.length})`)
        continue
      }
    }

    const ipadDir = resolve(`appstore-screenshots/${dirName}/ipad`)
    const firstFile = resolve(ipadDir, '01.png')

    if (!existsSync(firstFile)) {
      console.log(`[STEP 10] ${locale}: No iPad screenshots at ${ipadDir}`)
      continue
    }

    let setId
    if (ipadSet) {
      setId = ipadSet.id
    } else {
      const createResult = await apiRequest('POST', '/appScreenshotSets', {
        data: {
          type: 'appScreenshotSets',
          attributes: { screenshotDisplayType: 'APP_IPAD_PRO_3GEN_129' },
          relationships: {
            appStoreVersionLocalization: {
              data: { type: 'appStoreVersionLocalizations', id: locId },
            },
          },
        },
      })
      setId = createResult.data.id
    }

    for (let i = 1; i <= 4; i++) {
      const num = String(i).padStart(2, '0')
      const filePath = resolve(ipadDir, `${num}.png`)
      if (!existsSync(filePath)) continue

      const fileData = readFileSync(filePath)
      const fileSize = fileData.length
      const md5 = createHash('md5').update(fileData).digest('hex')
      const fileName = `ipad_${locale}_${num}.png`

      try {
        const reserve = await apiRequest('POST', '/appScreenshots', {
          data: {
            type: 'appScreenshots',
            attributes: { fileName, fileSize },
            relationships: {
              appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } },
            },
          },
        })

        const ssId = reserve.data.id
        const ops = reserve.data.attributes.uploadOperations

        for (const op of ops) {
          const chunk = fileData.subarray(op.offset, op.offset + op.length)
          const uploadHeaders = {}
          for (const h of op.requestHeaders) uploadHeaders[h.name] = h.value
          const ur = await fetch(op.url, { method: op.method || 'PUT', headers: uploadHeaders, body: chunk })
          if (!ur.ok) throw new Error(`Upload chunk failed: ${ur.status}`)
        }

        await apiRequest('PATCH', `/appScreenshots/${ssId}`, {
          data: {
            type: 'appScreenshots',
            id: ssId,
            attributes: { uploaded: true, sourceFileChecksum: md5 },
          },
        })
        console.log(`[STEP 10] ${locale}: Uploaded ${fileName}`)
      } catch (err) {
        console.error(`[STEP 10] ${locale}: Failed ${fileName}: ${err.message}`)
      }
    }
  }

  return true
}

// ============================================================================
// Step 11: Verify readiness
// ============================================================================

async function verifyReadiness(versionId, appInfoId) {
  console.log('\n========================================')
  console.log('[STEP 11] Verifying submission readiness...')
  console.log('========================================')

  try {
    const version = await apiRequest(
      'GET',
      `/appStoreVersions/${versionId}?include=build,appStoreVersionLocalizations`
    )

    const attrs = version.data?.attributes
    console.log(`  Version: ${attrs?.versionString}`)
    console.log(`  State: ${attrs?.appStoreState}`)
    console.log(`  Copyright: ${attrs?.copyright || 'MISSING'}`)

    const buildRel = version.data?.relationships?.build?.data
    console.log(`  Build attached: ${buildRel ? 'YES' : 'NO - REQUIRED'}`)

    if (version.included) {
      const localizations = version.included.filter(i => i.type === 'appStoreVersionLocalizations')
      for (const loc of localizations) {
        const la = loc.attributes
        console.log(`  ${la.locale}: desc=${la.description ? 'SET' : 'MISSING'} support=${la.supportUrl || 'MISSING'}`)
      }
    }

    const appInfoLocs = await apiRequest('GET', `/appInfos/${appInfoId}/appInfoLocalizations`)
    for (const loc of appInfoLocs.data || []) {
      console.log(`  ${loc.attributes.locale} (appInfo): privacy=${loc.attributes.privacyPolicyUrl || 'MISSING'}`)
    }

    return true
  } catch (err) {
    console.error(`[STEP 11] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 12: Submit for review
// ============================================================================

async function submitForReview(versionId) {
  console.log('\n========================================')
  console.log('[STEP 12] Submitting for App Review...')
  console.log('========================================')

  try {
    const existing = await apiRequest(
      'GET',
      `/apps/${ASC_APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW`
    )

    let reviewSubmissionId = existing.data?.[0]?.id || null

    if (!reviewSubmissionId) {
      const createResult = await apiRequest('POST', '/reviewSubmissions', {
        data: {
          type: 'reviewSubmissions',
          attributes: { platform: 'IOS' },
          relationships: {
            app: { data: { type: 'apps', id: ASC_APP_ID } },
          },
        },
      })
      reviewSubmissionId = createResult.data.id
      console.log(`[STEP 12] Created review submission: ${reviewSubmissionId}`)
    }

    try {
      const itemResult = await apiRequest('POST', '/reviewSubmissionItems', {
        data: {
          type: 'reviewSubmissionItems',
          relationships: {
            reviewSubmission: {
              data: { type: 'reviewSubmissions', id: reviewSubmissionId },
            },
            appStoreVersion: {
              data: { type: 'appStoreVersions', id: versionId },
            },
          },
        },
      })
      console.log(`[STEP 12] Version added as review item`)
    } catch (err) {
      console.error(`[STEP 12] Failed to add version: ${err.message}`)
      console.log('[STEP 12] Check App Store Connect for missing requirements:')
      console.log('  https://appstoreconnect.apple.com/apps/6759269751/appstore')
      return false
    }

    try {
      await apiRequest('PATCH', `/reviewSubmissions/${reviewSubmissionId}`, {
        data: {
          type: 'reviewSubmissions',
          id: reviewSubmissionId,
          attributes: { submitted: true },
        },
      })
      console.log('[STEP 12] SUBMITTED FOR APP REVIEW!')
      return true
    } catch (err) {
      console.error(`[STEP 12] Submit confirmation failed: ${err.message}`)
      return false
    }
  } catch (err) {
    console.error(`[STEP 12] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Main Execution
// ============================================================================

const version = TARGET_VERSION || getVersionFromConfig() || '1.3.0'

console.log('==============================================')
console.log('  App Store Connect - Automated Submission')
console.log('  App: 1GoShop (ID: ' + ASC_APP_ID + ')')
console.log('  Target version: ' + version)
console.log('  Date: ' + new Date().toISOString())
console.log('==============================================')

const results = {}

try {
  // Step 0: Find or create version (dynamic — no hardcoded IDs)
  const appVersion = await findOrCreateVersion(version)
  const versionId = appVersion.id
  results.version = true

  // Step 1: Find latest valid build
  const build = await findLatestBuild()
  results.build = build !== null

  // Step 2: Attach build
  if (build) results.attach = await attachBuild(versionId, build)

  // Step 3: Set category (returns appInfoId)
  const appInfoId = await setCategory()
  results.category = !!appInfoId

  // Step 4: Privacy policy URL
  try { results.privacy = await setPrivacyPolicy(appInfoId) } catch (err) { console.error(err.message) }

  // Step 5: Support + marketing URLs
  try { results.urls = await setVersionUrls(versionId) } catch (err) { console.error(err.message) }

  // Step 6: Age rating
  try { results.ageRating = await setAgeRating(appInfoId) } catch (err) { console.error(err.message) }

  // Step 7: Content rights
  try { results.contentRights = await setContentRights() } catch (err) { console.error(err.message) }

  // Step 8: Pricing
  try { results.pricing = await setPricing() } catch (err) { console.error(err.message) }

  // Refresh JWT
  token = generateJWT()

  // Step 9: Review detail
  try { results.reviewDetail = await createReviewDetail(versionId) } catch (err) { console.error(err.message) }

  // Step 10: iPad screenshots
  try { results.screenshots = await uploadIpadScreenshots(versionId) } catch (err) { console.error(err.message) }

  // Step 11: Verify
  try { results.verification = await verifyReadiness(versionId, appInfoId) } catch (err) { console.error(err.message) }

  // Step 12: Submit
  results.submission = await submitForReview(versionId)

  // Summary
  console.log('\n==============================================')
  console.log('  SUBMISSION SUMMARY')
  console.log('==============================================')
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${key.padEnd(16)} ${val ? 'PASS' : 'FAIL'}`)
  }
  console.log('')

  if (results.submission) {
    console.log('  App has been submitted for App Review!')
    console.log('  Monitor: https://appstoreconnect.apple.com/apps/6759269751/appstore')
  } else {
    console.log('  MANUAL STEP MAY BE REQUIRED:')
    console.log('    App Privacy cannot be set via API.')
    console.log('    Go to: https://appstoreconnect.apple.com/apps/6759269751/privacy')
    console.log('    Select "No, we do not collect data from this app" -> Save -> Publish')
    console.log('    Then re-run: node scripts/submit-appstore.mjs')
  }
  console.log('==============================================')
} catch (err) {
  console.error('\n[FATAL ERROR]', err.message)
  console.error(err.stack)
  process.exit(1)
}
