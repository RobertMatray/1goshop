import { readFileSync, existsSync } from 'fs'
import jwt from 'jsonwebtoken'
const { sign } = jwt
import { resolve } from 'path'
import { createHash } from 'crypto'

// ============================================================================
// Configuration
// ============================================================================

const API_KEY_PATH = resolve('../superapp-ai-poc/internals/appstore-api/AuthKey_79PJWGG49Z.p8')
const KEY_ID = '79PJWGG49Z'
const ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
const BASE_URL = 'https://api.appstoreconnect.apple.com/v1'

const ASC_APP_ID = '6759269751'
const VERSION_ID = '99a1cd3e-547d-4f77-81d1-6795e61adb35'
const APP_INFO_ID = 'f4a3f725-3cb5-413e-9417-eadc5272420f'

// AppInfo Localization IDs (for privacy policy URL)
const APP_INFO_LOC_SK = 'e5877e16-aff9-4066-99d5-74dec1b640fa'
const APP_INFO_LOC_EN = '58f45bec-4211-4a72-9da1-3539130db3a7'

// Version Localization IDs (for supportUrl) - v1.1.0
const VERSION_LOC_SK = 'f01cb3c8-6080-4a1f-95d1-a8cf431fd9c3'
const VERSION_LOC_EN = 'a3ef7538-e32f-4e4c-a044-f9e4c5951724'

const PRIVACY_POLICY_URL = 'https://robertmatray.github.io/1goshop/privacy-policy.html'
const SUPPORT_URL = 'https://robertmatray.github.io/1goshop/'
const COPYRIGHT = '2026 Robert Matray'
const CONTACT_EMAIL = 'matray@realise.sk'
const CONTACT_PHONE = '+421907123456'

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

  console.log('[JWT] Token generated successfully')
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
// Step 1: Check Build Processing Status
// ============================================================================

async function checkBuildStatus() {
  console.log('\n========================================')
  console.log('[STEP 1] Checking build processing status...')
  console.log('========================================')

  const builds = await apiRequest(
    'GET',
    `/builds?filter[app]=${ASC_APP_ID}&sort=-uploadedDate&limit=5`
  )

  if (!builds.data || builds.data.length === 0) {
    console.error('[STEP 1] No builds found for this app!')
    return null
  }

  console.log(`[STEP 1] Found ${builds.data.length} build(s):`)

  for (const build of builds.data) {
    const attrs = build.attributes
    console.log(`  Build ${attrs.version} | State: ${attrs.processingState} | Uploaded: ${attrs.uploadedDate}`)
  }

  const targetBuild = builds.data.find(b => b.attributes.processingState === 'VALID') || builds.data[0]
  const state = targetBuild.attributes.processingState

  console.log(`\n[STEP 1] Selected build: ${targetBuild.id} (v${targetBuild.attributes.version})`)
  console.log(`[STEP 1] Processing state: ${state}`)

  if (state !== 'VALID') {
    console.log('[STEP 1] WARNING: Build is not in VALID state.')
    return null
  }

  return targetBuild
}

// ============================================================================
// Step 2: Attach Build to Version + Set Copyright
// ============================================================================

async function attachBuildAndSetCopyright(build) {
  console.log('\n========================================')
  console.log('[STEP 2] Attaching build to version and setting copyright...')
  console.log('========================================')

  if (!build) {
    console.log('[STEP 2] SKIPPED - No valid build available')
    return false
  }

  const body = {
    data: {
      type: 'appStoreVersions',
      id: VERSION_ID,
      attributes: {
        copyright: COPYRIGHT,
      },
      relationships: {
        build: {
          data: {
            type: 'builds',
            id: build.id,
          },
        },
      },
    },
  }

  try {
    await apiRequest('PATCH', `/appStoreVersions/${VERSION_ID}`, body)
    console.log(`[STEP 2] Build ${build.attributes.version} attached, copyright set to "${COPYRIGHT}"`)
    return true
  } catch (err) {
    console.error(`[STEP 2] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 3: Set App Store Category (SHOPPING)
// ============================================================================

async function setAppCategory() {
  console.log('\n========================================')
  console.log('[STEP 3] Setting App Store category to SHOPPING...')
  console.log('========================================')

  const body = {
    data: {
      type: 'appInfos',
      id: APP_INFO_ID,
      relationships: {
        primaryCategory: {
          data: {
            type: 'appCategories',
            id: 'SHOPPING',
          },
        },
      },
    },
  }

  try {
    await apiRequest('PATCH', `/appInfos/${APP_INFO_ID}`, body)
    console.log('[STEP 3] Primary category set to SHOPPING')
    return true
  } catch (err) {
    console.error(`[STEP 3] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 4: Set Privacy Policy URL on appInfoLocalizations
// ============================================================================

async function setPrivacyPolicyUrl() {
  console.log('\n========================================')
  console.log('[STEP 4] Setting Privacy Policy URL on appInfoLocalizations...')
  console.log('========================================')

  let allSuccess = true

  for (const [locale, locId] of [['sk', APP_INFO_LOC_SK], ['en-US', APP_INFO_LOC_EN]]) {
    const body = {
      data: {
        type: 'appInfoLocalizations',
        id: locId,
        attributes: {
          privacyPolicyUrl: PRIVACY_POLICY_URL,
        },
      },
    }

    try {
      await apiRequest('PATCH', `/appInfoLocalizations/${locId}`, body)
      console.log(`[STEP 4] Privacy policy URL set for ${locale}`)
    } catch (err) {
      console.error(`[STEP 4] Failed for ${locale}: ${err.message}`)
      allSuccess = false
    }
  }

  return allSuccess
}

// ============================================================================
// Step 5: Set Support URL on version localizations
// ============================================================================

async function setSupportUrl() {
  console.log('\n========================================')
  console.log('[STEP 5] Setting Support URL on version localizations...')
  console.log('========================================')

  let allSuccess = true

  for (const [locale, locId] of [['sk', VERSION_LOC_SK], ['en-US', VERSION_LOC_EN]]) {
    const body = {
      data: {
        type: 'appStoreVersionLocalizations',
        id: locId,
        attributes: {
          supportUrl: SUPPORT_URL,
        },
      },
    }

    try {
      await apiRequest('PATCH', `/appStoreVersionLocalizations/${locId}`, body)
      console.log(`[STEP 5] Support URL set for ${locale}`)
    } catch (err) {
      console.error(`[STEP 5] Failed for ${locale}: ${err.message}`)
      allSuccess = false
    }
  }

  return allSuccess
}

// ============================================================================
// Step 6: Set Age Rating Declaration
// ============================================================================

async function setAgeRating() {
  console.log('\n========================================')
  console.log('[STEP 6] Setting age rating declaration...')
  console.log('========================================')

  try {
    const ageRatingResult = await apiRequest(
      'GET',
      `/appInfos/${APP_INFO_ID}/ageRatingDeclaration`
    )
    const ageRatingId = ageRatingResult.data.id
    console.log(`[STEP 6] Age rating declaration ID: ${ageRatingId}`)

    // Correct types discovered via API error responses:
    // - String 'NONE' for content intensity levels
    // - Boolean false for yes/no feature flags
    const body = {
      data: {
        type: 'ageRatingDeclarations',
        id: ageRatingId,
        attributes: {
          // String NONE fields (content intensity: NONE / INFREQUENT_OR_MILD / FREQUENT_OR_INTENSE)
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
          // Boolean fields (yes/no feature flags)
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
    }

    await apiRequest('PATCH', `/ageRatingDeclarations/${ageRatingId}`, body)
    console.log('[STEP 6] Age rating declaration set - all categories NONE/false')
    return true
  } catch (err) {
    console.error(`[STEP 6] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 7: Set Content Rights Declaration
// ============================================================================

async function setContentRights() {
  console.log('\n========================================')
  console.log('[STEP 7] Setting content rights declaration...')
  console.log('========================================')

  const body = {
    data: {
      type: 'apps',
      id: ASC_APP_ID,
      attributes: {
        contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
      },
    },
  }

  try {
    await apiRequest('PATCH', `/apps/${ASC_APP_ID}`, body)
    console.log('[STEP 7] Content rights: does not use third-party content')
    return true
  } catch (err) {
    console.error(`[STEP 7] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 8: Set App Pricing (Free)
// ============================================================================

async function setAppPricing() {
  console.log('\n========================================')
  console.log('[STEP 8] Setting app pricing (FREE)...')
  console.log('========================================')

  try {
    // Check if manual prices already exist
    const schedule = await apiRequest('GET', `/apps/${ASC_APP_ID}/appPriceSchedule`)
    if (schedule.data) {
      // Try to get manual prices
      try {
        const prices = await apiRequest(
          'GET',
          `/appPriceSchedules/${ASC_APP_ID}/manualPrices`
        )
        if (prices.data && prices.data.length > 0) {
          console.log('[STEP 8] Pricing already configured')
          return true
        }
      } catch {
        // No manual prices set yet
      }
    }
  } catch {
    // No schedule exists
  }

  // Get the free price point for USA
  try {
    const pricePoints = await apiRequest(
      'GET',
      `/apps/${ASC_APP_ID}/appPricePoints?filter[territory]=USA&limit=1`
    )
    const freePricePoint = pricePoints.data?.[0]

    if (!freePricePoint) {
      console.error('[STEP 8] Could not find free price point')
      return false
    }

    console.log(`[STEP 8] Free price point: ${freePricePoint.id} (${freePricePoint.attributes?.customerPrice})`)

    const body = {
      data: {
        type: 'appPriceSchedules',
        relationships: {
          app: {
            data: { type: 'apps', id: ASC_APP_ID },
          },
          manualPrices: {
            data: [
              { type: 'appPrices', id: '${price1}' },
            ],
          },
          baseTerritory: {
            data: { type: 'territories', id: 'USA' },
          },
        },
      },
      included: [
        {
          type: 'appPrices',
          id: '${price1}',
          attributes: {
            startDate: null,
          },
          relationships: {
            appPricePoint: {
              data: {
                type: 'appPricePoints',
                id: freePricePoint.id,
              },
            },
          },
        },
      ],
    }

    await apiRequest('POST', '/appPriceSchedules', body)
    console.log('[STEP 8] FREE pricing schedule created')
    return true
  } catch (err) {
    console.error(`[STEP 8] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 9: Create App Store Review Detail (contact info)
// ============================================================================

async function createReviewDetail() {
  console.log('\n========================================')
  console.log('[STEP 9] Creating App Store review detail...')
  console.log('========================================')

  // Check if review detail already exists
  try {
    const existing = await apiRequest(
      'GET',
      `/appStoreVersions/${VERSION_ID}/appStoreReviewDetail`
    )
    if (existing.data) {
      console.log(`[STEP 9] Review detail already exists: ${existing.data.id}`)
      return true
    }
  } catch {
    // Does not exist yet, create it
  }

  const body = {
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
          data: {
            type: 'appStoreVersions',
            id: VERSION_ID,
          },
        },
      },
    },
  }

  try {
    const result = await apiRequest('POST', '/appStoreReviewDetails', body)
    console.log(`[STEP 9] Review detail created: ${result.data.id}`)
    return true
  } catch (err) {
    console.error(`[STEP 9] Failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 10: Upload iPad Screenshots (generate from iPhone if needed)
// ============================================================================

async function uploadIpadScreenshots() {
  console.log('\n========================================')
  console.log('[STEP 10] Checking iPad screenshots...')
  console.log('========================================')

  // Check if iPad screenshot sets already have screenshots
  for (const [locale, locId] of [['sk', VERSION_LOC_SK], ['en-US', VERSION_LOC_EN]]) {
    const sets = await apiRequest(
      'GET',
      `/appStoreVersionLocalizations/${locId}/appScreenshotSets`
    )
    const ipadSet = sets.data?.find(s => s.attributes?.screenshotDisplayType === 'APP_IPAD_PRO_3GEN_129')

    if (ipadSet) {
      // Check if it has screenshots
      const screenshots = await apiRequest(
        'GET',
        `/appScreenshotSets/${ipadSet.id}/appScreenshots`
      )
      if (screenshots.data && screenshots.data.length > 0) {
        console.log(`[STEP 10] ${locale}: iPad screenshots already uploaded (${screenshots.data.length})`)
        continue
      }
    }

    // Generate iPad screenshots from iPhone ones if not uploaded
    const ipadDir = resolve(`appstore-screenshots/${locale === 'sk' ? 'SK' : 'EN'}/ipad`)
    const firstFile = resolve(ipadDir, '01.png')

    if (!existsSync(firstFile)) {
      console.log(`[STEP 10] ${locale}: No iPad screenshots found at ${ipadDir}`)
      console.log('[STEP 10] Generate them first using sharp or upload manually')
      continue
    }

    // Create screenshot set if needed
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
      console.log(`[STEP 10] ${locale}: Created iPad screenshot set: ${setId}`)
    }

    // Upload screenshots
    for (let i = 1; i <= 4; i++) {
      const num = String(i).padStart(2, '0')
      const filePath = resolve(ipadDir, `${num}.png`)

      if (!existsSync(filePath)) {
        console.log(`[STEP 10] ${locale}: File not found: ${filePath}`)
        continue
      }

      const fileData = readFileSync(filePath)
      const fileSize = fileData.length
      const md5 = createHash('md5').update(fileData).digest('hex')
      const fileName = `ipad_${locale}_${num}.png`

      console.log(`[STEP 10] ${locale}: Uploading ${fileName} (${fileSize} bytes)...`)

      try {
        // Reserve
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

        // Upload chunks
        for (const op of ops) {
          const chunk = fileData.subarray(op.offset, op.offset + op.length)
          const uploadHeaders = {}
          for (const h of op.requestHeaders) uploadHeaders[h.name] = h.value
          const ur = await fetch(op.url, { method: op.method || 'PUT', headers: uploadHeaders, body: chunk })
          if (!ur.ok) throw new Error(`Upload chunk failed: ${ur.status}`)
        }

        // Commit
        await apiRequest('PATCH', `/appScreenshots/${ssId}`, {
          data: {
            type: 'appScreenshots',
            id: ssId,
            attributes: { uploaded: true, sourceFileChecksum: md5 },
          },
        })
        console.log(`[STEP 10] ${locale}: Uploaded ${fileName}`)
      } catch (err) {
        console.error(`[STEP 10] ${locale}: Failed to upload ${fileName}: ${err.message}`)
      }
    }
  }

  return true
}

// ============================================================================
// Step 11: Verify Everything & Show What's Missing
// ============================================================================

async function verifyReadyForSubmission() {
  console.log('\n========================================')
  console.log('[STEP 11] Verifying submission readiness...')
  console.log('========================================')

  try {
    const version = await apiRequest(
      'GET',
      `/appStoreVersions/${VERSION_ID}?include=build,appStoreVersionLocalizations`
    )

    const attrs = version.data?.attributes
    console.log(`[STEP 11] Version: ${attrs?.versionString}`)
    console.log(`[STEP 11] State: ${attrs?.appStoreState}`)
    console.log(`[STEP 11] Copyright: ${attrs?.copyright || 'MISSING'}`)

    const buildRel = version.data?.relationships?.build?.data
    console.log(`[STEP 11] Build attached: ${buildRel ? 'YES (' + buildRel.id + ')' : 'NO - REQUIRED'}`)

    if (version.included) {
      const localizations = version.included.filter(i => i.type === 'appStoreVersionLocalizations')
      console.log(`[STEP 11] Localizations: ${localizations.length}`)
      for (const loc of localizations) {
        const la = loc.attributes
        console.log(`  ${la.locale}:`)
        console.log(`    Description: ${la.description ? 'SET' : 'MISSING'}`)
        console.log(`    Keywords: ${la.keywords ? 'SET' : 'MISSING'}`)
        console.log(`    Support URL: ${la.supportUrl || 'MISSING'}`)
      }
    }

    // Check appInfo localizations for privacy policy
    const appInfoLocs = await apiRequest('GET', `/appInfos/${APP_INFO_ID}/appInfoLocalizations`)
    for (const loc of appInfoLocs.data || []) {
      console.log(`  ${loc.attributes.locale} (appInfo): Privacy URL: ${loc.attributes.privacyPolicyUrl || 'MISSING'}`)
    }

    return true
  } catch (err) {
    console.error(`[STEP 11] Verification failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 12: Submit for App Review (using reviewSubmissions)
// ============================================================================

async function submitForReview() {
  console.log('\n========================================')
  console.log('[STEP 12] Submitting for App Review...')
  console.log('========================================')

  try {
    // Check for existing review submissions in READY_FOR_REVIEW state
    const existing = await apiRequest(
      'GET',
      `/apps/${ASC_APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW`
    )

    let reviewSubmissionId = null

    if (existing.data && existing.data.length > 0) {
      reviewSubmissionId = existing.data[0].id
      console.log(`[STEP 12] Found existing review submission: ${reviewSubmissionId}`)
    }

    // Create a new review submission if none exists
    if (!reviewSubmissionId) {
      const createBody = {
        data: {
          type: 'reviewSubmissions',
          attributes: {
            platform: 'IOS',
          },
          relationships: {
            app: {
              data: { type: 'apps', id: ASC_APP_ID },
            },
          },
        },
      }

      const createResult = await apiRequest('POST', '/reviewSubmissions', createBody)
      reviewSubmissionId = createResult.data.id
      console.log(`[STEP 12] Created review submission: ${reviewSubmissionId}`)
    }

    // Add the version as a review submission item
    console.log('[STEP 12] Adding version as review submission item...')
    const itemBody = {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: {
            data: { type: 'reviewSubmissions', id: reviewSubmissionId },
          },
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: VERSION_ID },
          },
        },
      },
    }

    try {
      const itemResult = await apiRequest('POST', '/reviewSubmissionItems', itemBody)
      console.log(`[STEP 12] Version added as review item: ${itemResult.data?.id}`)
    } catch (err) {
      console.error(`[STEP 12] Failed to add version as review item: ${err.message}`)
      console.log('')
      console.log('[STEP 12] This usually means there are still missing requirements.')
      console.log('[STEP 12] Check App Store Connect for specific issues:')
      console.log('  https://appstoreconnect.apple.com/apps/6759269751/appstore')
      return false
    }

    // Confirm the submission
    console.log('[STEP 12] Confirming review submission...')
    const submitBody = {
      data: {
        type: 'reviewSubmissions',
        id: reviewSubmissionId,
        attributes: {
          submitted: true,
        },
      },
    }

    try {
      await apiRequest('PATCH', `/reviewSubmissions/${reviewSubmissionId}`, submitBody)
      console.log('[STEP 12] SUBMITTED FOR APP REVIEW!')
      return true
    } catch (err) {
      console.error(`[STEP 12] Submit confirmation failed: ${err.message}`)
      return false
    }
  } catch (err) {
    console.error(`[STEP 12] Submission failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Main Execution
// ============================================================================

console.log('==============================================')
console.log('  App Store Connect - Submit for Review')
console.log('  App: 1GoShop (ID: ' + ASC_APP_ID + ')')
console.log('  Version: 1.0 (ID: ' + VERSION_ID + ')')
console.log('  Date: ' + new Date().toISOString())
console.log('==============================================')

const results = {
  buildCheck: false,
  buildAttach: false,
  category: false,
  privacyPolicy: false,
  supportUrl: false,
  ageRating: false,
  contentRights: false,
  pricing: false,
  reviewDetail: false,
  ipadScreenshots: false,
  verification: false,
  submission: false,
}

try {
  // Step 1: Check build status
  const build = await checkBuildStatus()
  results.buildCheck = build !== null

  // Step 2: Attach build + set copyright
  if (build) {
    results.buildAttach = await attachBuildAndSetCopyright(build)
  }

  // Step 3: Set category
  try { results.category = await setAppCategory() } catch (err) { console.error(err.message) }

  // Step 4: Set privacy policy URL (on appInfoLocalizations)
  try { results.privacyPolicy = await setPrivacyPolicyUrl() } catch (err) { console.error(err.message) }

  // Step 5: Set support URL (on version localizations)
  try { results.supportUrl = await setSupportUrl() } catch (err) { console.error(err.message) }

  // Step 6: Set age rating
  try { results.ageRating = await setAgeRating() } catch (err) { console.error(err.message) }

  // Step 7: Set content rights
  try { results.contentRights = await setContentRights() } catch (err) { console.error(err.message) }

  // Step 8: Set pricing (FREE)
  try { results.pricing = await setAppPricing() } catch (err) { console.error(err.message) }

  // Regenerate JWT in case it's close to expiry
  token = generateJWT()

  // Step 9: Create review detail
  try { results.reviewDetail = await createReviewDetail() } catch (err) { console.error(err.message) }

  // Step 10: Upload iPad screenshots
  try { results.ipadScreenshots = await uploadIpadScreenshots() } catch (err) { console.error(err.message) }

  // Step 11: Verify readiness
  try { results.verification = await verifyReadyForSubmission() } catch (err) { console.error(err.message) }

  // Step 12: Submit for review
  results.submission = await submitForReview()

  // Final Summary
  console.log('\n==============================================')
  console.log('  SUBMISSION SUMMARY')
  console.log('==============================================')
  console.log(`  Build check:       ${results.buildCheck ? 'PASS' : 'FAIL'}`)
  console.log(`  Build + copyright: ${results.buildAttach ? 'PASS' : 'FAIL'}`)
  console.log(`  Category:          ${results.category ? 'PASS' : 'FAIL'}`)
  console.log(`  Privacy policy:    ${results.privacyPolicy ? 'PASS' : 'FAIL'}`)
  console.log(`  Support URL:       ${results.supportUrl ? 'PASS' : 'FAIL'}`)
  console.log(`  Age rating:        ${results.ageRating ? 'PASS' : 'FAIL'}`)
  console.log(`  Content rights:    ${results.contentRights ? 'PASS' : 'FAIL'}`)
  console.log(`  Pricing:           ${results.pricing ? 'PASS' : 'FAIL'}`)
  console.log(`  Review detail:     ${results.reviewDetail ? 'PASS' : 'FAIL'}`)
  console.log(`  iPad screenshots:  ${results.ipadScreenshots ? 'PASS' : 'FAIL'}`)
  console.log(`  Verification:      ${results.verification ? 'PASS' : 'FAIL'}`)
  console.log(`  Submission:        ${results.submission ? 'SUBMITTED' : 'NOT SUBMITTED'}`)
  console.log('')

  if (results.submission) {
    console.log('  App has been submitted for App Review!')
    console.log('  Monitor status at: https://appstoreconnect.apple.com/apps/6759269751/appstore')
  } else {
    const failed = Object.entries(results).filter(([, v]) => !v).map(([k]) => k)
    console.log('  Submission not completed. Failed steps: ' + failed.join(', '))
    console.log('')
    console.log('  MANUAL STEP REQUIRED:')
    console.log('    App Privacy (Data Usages) cannot be set via API.')
    console.log('    Go to: https://appstoreconnect.apple.com/apps/6759269751/privacy')
    console.log('    1. Click "Get Started" or "Edit"')
    console.log('    2. Select "No, we do not collect data from this app"')
    console.log('    3. Click "Save" then "Publish"')
    console.log('')
    console.log('  After completing the manual step, re-run: node scripts/submit-appstore.mjs')
  }

  console.log('==============================================')
} catch (err) {
  console.error('\n[FATAL ERROR]', err.message)
  console.error(err.stack)
  process.exit(1)
}
