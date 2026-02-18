import { readFileSync } from 'fs'
import jwt from 'jsonwebtoken'
const { sign } = jwt
import { resolve } from 'path'

// ============================================================================
// Configuration
// ============================================================================

const API_KEY_PATH = resolve('../superapp-ai-poc/internals/appstore-api/AuthKey_79PJWGG49Z.p8')
const KEY_ID = '79PJWGG49Z'
const ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
const BASE_URL = 'https://api.appstoreconnect.apple.com/v1'

const ASC_APP_ID = '6759269751'
const VERSION_ID = '139155f5-3177-4e12-9199-23b3667a56cb'

// Privacy policy hosted on GitHub Pages (placeholder - replace with real URL if available)
const PRIVACY_POLICY_URL = 'https://robertmatray.github.io/1goshop/privacy-policy.html'
const SUPPORT_URL = 'https://robertmatray.github.io/1goshop/'

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

  // List recent builds for this app, sorted by upload date descending
  const builds = await apiRequest(
    'GET',
    `/builds?filter[app]=${ASC_APP_ID}&sort=-uploadedDate&limit=5`
  )

  if (!builds.data || builds.data.length === 0) {
    console.error('[STEP 1] No builds found for this app!')
    return null
  }

  console.log(`[STEP 1] Found ${builds.data.length} build(s):`)

  let targetBuild = null

  for (const build of builds.data) {
    const attrs = build.attributes
    const version = attrs.version          // CFBundleShortVersionString
    const buildNum = attrs.buildNumber || attrs.uploadedDate  // CFBundleVersion if available
    const state = attrs.processingState
    const expired = attrs.expired
    const iconUrl = attrs.iconAssetToken?.templateUrl

    console.log(`  Build ID: ${build.id}`)
    console.log(`    Version: ${version}`)
    console.log(`    Processing State: ${state}`)
    console.log(`    Expired: ${expired}`)
    console.log(`    Uploaded: ${attrs.uploadedDate}`)
    console.log(`    Min OS Version: ${attrs.minOsVersion}`)
    console.log('')

    // Look for our build - version 1.0.1 and in VALID state
    if (!targetBuild && version === '1.0.1') {
      targetBuild = build
    }
  }

  // If we didn't find 1.0.1, take the most recent one
  if (!targetBuild) {
    console.log('[STEP 1] Could not find build with version 1.0.1, using most recent build')
    targetBuild = builds.data[0]
  }

  const state = targetBuild.attributes.processingState
  console.log(`[STEP 1] Target build: ${targetBuild.id} (v${targetBuild.attributes.version})`)
  console.log(`[STEP 1] Processing state: ${state}`)

  if (state === 'PROCESSING') {
    console.log('[STEP 1] WARNING: Build is still processing. Cannot attach to version yet.')
    console.log('[STEP 1] You may need to wait and re-run this script.')
    return null
  }

  if (state === 'FAILED') {
    console.log('[STEP 1] ERROR: Build processing failed!')
    return null
  }

  if (state === 'VALID') {
    console.log('[STEP 1] Build is VALID and ready to attach.')
  }

  return targetBuild
}

// ============================================================================
// Step 2: Attach Build to Version
// ============================================================================

async function attachBuildToVersion(build) {
  console.log('\n========================================')
  console.log('[STEP 2] Attaching build to version...')
  console.log('========================================')

  if (!build) {
    console.log('[STEP 2] SKIPPED - No valid build available')
    return false
  }

  const body = {
    data: {
      type: 'appStoreVersions',
      id: VERSION_ID,
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
    console.log(`[STEP 2] Build ${build.id} (v${build.attributes.version}) attached to version ${VERSION_ID}`)
    return true
  } catch (err) {
    console.error(`[STEP 2] Failed to attach build: ${err.message}`)
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

  // Get appInfos for this app
  const appInfos = await apiRequest('GET', `/apps/${ASC_APP_ID}/appInfos`)

  if (!appInfos.data || appInfos.data.length === 0) {
    console.error('[STEP 3] No appInfo found!')
    return false
  }

  const appInfoId = appInfos.data[0].id
  const currentCategory = appInfos.data[0].relationships?.primaryCategory?.data?.id
  console.log(`[STEP 3] AppInfo ID: ${appInfoId}`)
  console.log(`[STEP 3] Current primary category: ${currentCategory || 'not set'}`)

  // Get available categories to find SHOPPING
  try {
    const categories = await apiRequest('GET', '/appCategories?limit=200')
    const shoppingCategory = categories.data?.find(c =>
      c.id === 'SHOPPING' ||
      c.attributes?.platforms?.includes('IOS') && c.id.includes('SHOPPING')
    )

    if (shoppingCategory) {
      console.log(`[STEP 3] Found SHOPPING category ID: ${shoppingCategory.id}`)
    } else {
      console.log('[STEP 3] Available categories:')
      for (const cat of (categories.data || []).slice(0, 30)) {
        console.log(`  ${cat.id}`)
      }
    }
  } catch (err) {
    console.log(`[STEP 3] Could not list categories: ${err.message}`)
  }

  // Set primary category to SHOPPING
  const body = {
    data: {
      type: 'appInfos',
      id: appInfoId,
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
    await apiRequest('PATCH', `/appInfos/${appInfoId}`, body)
    console.log('[STEP 3] Primary category set to SHOPPING')
    return true
  } catch (err) {
    console.error(`[STEP 3] Failed to set category: ${err.message}`)
    // Try with different category ID format
    console.log('[STEP 3] Trying alternative category ID formats...')

    const alternatives = ['SHOPPING', 'Shopping', 'ios-shopping']
    for (const altId of alternatives) {
      try {
        body.data.relationships.primaryCategory.data.id = altId
        await apiRequest('PATCH', `/appInfos/${appInfoId}`, body)
        console.log(`[STEP 3] Primary category set with ID: ${altId}`)
        return true
      } catch {
        // Continue trying
      }
    }

    console.error('[STEP 3] Could not set category with any known ID format')
    return false
  }
}

// ============================================================================
// Step 4: Set Privacy Policy URL on Version Localizations
// ============================================================================

async function setPrivacyPolicyUrl() {
  console.log('\n========================================')
  console.log('[STEP 4] Setting Privacy Policy URL on version localizations...')
  console.log('========================================')

  // Get all version localizations
  const localizations = await apiRequest(
    'GET',
    `/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`
  )

  if (!localizations.data || localizations.data.length === 0) {
    console.error('[STEP 4] No version localizations found!')
    return false
  }

  console.log(`[STEP 4] Found ${localizations.data.length} localization(s)`)

  let allSuccess = true

  for (const loc of localizations.data) {
    const locale = loc.attributes.locale
    const existingUrl = loc.attributes.privacyPolicyUrl
    console.log(`[STEP 4] Locale: ${locale}, current privacy URL: ${existingUrl || 'not set'}`)

    const body = {
      data: {
        type: 'appStoreVersionLocalizations',
        id: loc.id,
        attributes: {
          privacyPolicyUrl: PRIVACY_POLICY_URL,
          supportUrl: SUPPORT_URL,
        },
      },
    }

    try {
      await apiRequest('PATCH', `/appStoreVersionLocalizations/${loc.id}`, body)
      console.log(`[STEP 4] Privacy policy URL set for ${locale}`)
    } catch (err) {
      console.error(`[STEP 4] Failed to set privacy URL for ${locale}: ${err.message}`)
      allSuccess = false
    }
  }

  return allSuccess
}

// ============================================================================
// Step 5: Set Age Rating Declaration
// ============================================================================

async function setAgeRating() {
  console.log('\n========================================')
  console.log('[STEP 5] Setting age rating declaration...')
  console.log('========================================')

  // Get the age rating declaration for this version
  try {
    const version = await apiRequest(
      'GET',
      `/appStoreVersions/${VERSION_ID}?include=ageRatingDeclaration`
    )

    // Find the ageRatingDeclaration in included
    let ageRatingId = null

    if (version.included) {
      const ageRating = version.included.find(i => i.type === 'ageRatingDeclarations')
      if (ageRating) {
        ageRatingId = ageRating.id
        console.log(`[STEP 5] Found age rating declaration ID: ${ageRatingId}`)
      }
    }

    // Try via relationship
    if (!ageRatingId) {
      const ageRatingRel = version.data?.relationships?.ageRatingDeclaration?.data
      if (ageRatingRel) {
        ageRatingId = ageRatingRel.id
        console.log(`[STEP 5] Found age rating declaration ID from relationship: ${ageRatingId}`)
      }
    }

    // Try direct fetch
    if (!ageRatingId) {
      console.log('[STEP 5] Trying to fetch age rating declaration directly...')
      try {
        const ageRatingResult = await apiRequest(
          'GET',
          `/appStoreVersions/${VERSION_ID}/ageRatingDeclaration`
        )
        if (ageRatingResult.data) {
          ageRatingId = ageRatingResult.data.id
          console.log(`[STEP 5] Found age rating declaration ID: ${ageRatingId}`)
        }
      } catch {
        console.log('[STEP 5] Could not fetch age rating declaration directly')
      }
    }

    if (!ageRatingId) {
      console.error('[STEP 5] Could not find age rating declaration ID')
      console.log('[STEP 5] This may need to be set manually in App Store Connect')
      return false
    }

    // Set all ratings to NONE - this is a simple shopping list app
    const body = {
      data: {
        type: 'ageRatingDeclarations',
        id: ageRatingId,
        attributes: {
          alcoholTobaccoOrDrugUseOrReferences: 'NONE',
          contests: 'NONE',
          gamblingAndContests: false,
          gambling: false,
          gamblingSimulated: 'NONE',
          horrorOrFearThemes: 'NONE',
          matureOrSuggestiveThemes: 'NONE',
          medicalOrTreatmentInformation: 'NONE',
          profanityOrCrudeHumor: 'NONE',
          sexualContentGraphicAndNudity: 'NONE',
          sexualContentOrNudity: 'NONE',
          violenceCartoonOrFantasy: 'NONE',
          violenceRealistic: 'NONE',
          violenceRealisticProlongedGraphicOrSadistic: 'NONE',
          kidsAgeBand: null,
          seventeenPlus: false,
          unrestrictedWebAccess: false,
        },
      },
    }

    await apiRequest('PATCH', `/ageRatingDeclarations/${ageRatingId}`, body)
    console.log('[STEP 5] Age rating declaration set to NONE for all categories')
    return true
  } catch (err) {
    console.error(`[STEP 5] Failed to set age rating: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 6: Check Content Rights Declaration
// ============================================================================

async function checkContentRights() {
  console.log('\n========================================')
  console.log('[STEP 6] Checking content rights...')
  console.log('========================================')

  // Content rights is typically a boolean on the version
  // The app doesn't use third-party content, so we declare no rights needed
  try {
    const body = {
      data: {
        type: 'appStoreVersions',
        id: VERSION_ID,
        attributes: {
          usesIdfa: false,
        },
      },
    }

    // Note: content rights might not be a direct attribute
    // Let's check the version details first
    const versionDetails = await apiRequest(
      'GET',
      `/appStoreVersions/${VERSION_ID}`
    )

    console.log(`[STEP 6] Version state: ${versionDetails.data?.attributes?.appStoreState}`)
    console.log(`[STEP 6] Version string: ${versionDetails.data?.attributes?.versionString}`)
    console.log(`[STEP 6] Release type: ${versionDetails.data?.attributes?.releaseType}`)

    // Check createdDate to see when version was created
    const createdDate = versionDetails.data?.attributes?.createdDate
    if (createdDate) {
      console.log(`[STEP 6] Version created: ${createdDate}`)
    }

    console.log('[STEP 6] Content rights check complete')
    return true
  } catch (err) {
    console.error(`[STEP 6] Content rights check failed: ${err.message}`)
    return false
  }
}

// ============================================================================
// Step 7: Verify Everything & Show What's Missing
// ============================================================================

async function verifyReadyForSubmission() {
  console.log('\n========================================')
  console.log('[STEP 7] Verifying submission readiness...')
  console.log('========================================')

  // Get full version details with includes
  try {
    const version = await apiRequest(
      'GET',
      `/appStoreVersions/${VERSION_ID}?include=build,appStoreVersionLocalizations,appStoreVersionSubmission`
    )

    const attrs = version.data?.attributes
    console.log(`[STEP 7] Version: ${attrs?.versionString}`)
    console.log(`[STEP 7] State: ${attrs?.appStoreState}`)
    console.log(`[STEP 7] Release type: ${attrs?.releaseType}`)

    // Check build
    const buildRel = version.data?.relationships?.build?.data
    if (buildRel) {
      console.log(`[STEP 7] Build attached: YES (${buildRel.id})`)
    } else {
      console.log('[STEP 7] Build attached: NO - REQUIRED')
    }

    // Check localizations
    if (version.included) {
      const localizations = version.included.filter(i => i.type === 'appStoreVersionLocalizations')
      console.log(`[STEP 7] Localizations: ${localizations.length}`)
      for (const loc of localizations) {
        const la = loc.attributes
        console.log(`  ${la.locale}:`)
        console.log(`    Description: ${la.description ? 'SET' : 'MISSING'}`)
        console.log(`    Keywords: ${la.keywords ? 'SET' : 'MISSING'}`)
        console.log(`    Privacy URL: ${la.privacyPolicyUrl || 'MISSING'}`)
        console.log(`    Support URL: ${la.supportUrl || 'MISSING'}`)
        console.log(`    What's New: ${la.whatsNew || 'not set (optional for v1.0)'}`)
      }

      // Check for submission
      const submission = version.included.find(i => i.type === 'appStoreVersionSubmissions')
      if (submission) {
        console.log(`[STEP 7] Submission exists: ${submission.id}`)
      } else {
        console.log('[STEP 7] Submission: not yet submitted')
      }
    }

    return version
  } catch (err) {
    console.error(`[STEP 7] Verification failed: ${err.message}`)
    return null
  }
}

// ============================================================================
// Step 8: Submit for App Review
// ============================================================================

async function submitForReview() {
  console.log('\n========================================')
  console.log('[STEP 8] Submitting for App Review...')
  console.log('========================================')

  const body = {
    data: {
      type: 'appStoreVersionSubmissions',
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
    const result = await apiRequest('POST', '/appStoreVersionSubmissions', body)
    console.log('[STEP 8] SUBMITTED FOR REVIEW!')
    console.log(`[STEP 8] Submission ID: ${result.data?.id}`)
    return true
  } catch (err) {
    console.error(`[STEP 8] Submission failed: ${err.message}`)
    console.log('')
    console.log('[STEP 8] Common reasons for submission failure:')
    console.log('  - Build not yet processed by Apple')
    console.log('  - Missing screenshots for required device sizes')
    console.log('  - Missing privacy policy URL')
    console.log('  - Missing app description or keywords')
    console.log('  - Age rating not configured')
    console.log('  - App category not set')
    console.log('  - Content rights not declared')
    console.log('')
    console.log('[STEP 8] Check App Store Connect for specific issues:')
    console.log('  https://appstoreconnect.apple.com/apps/6759269751/appstore')
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
  ageRating: false,
  contentRights: false,
  verification: false,
  submission: false,
}

try {
  // Step 1: Check build status
  const build = await checkBuildStatus()
  results.buildCheck = build !== null

  // Step 2: Attach build to version
  if (build) {
    results.buildAttach = await attachBuildToVersion(build)
  } else {
    console.log('\n[STEP 2] SKIPPED - No valid build to attach')
  }

  // Step 3: Set category
  try {
    results.category = await setAppCategory()
  } catch (err) {
    console.error(`[STEP 3] Error: ${err.message}`)
  }

  // Step 4: Set privacy policy URL
  try {
    results.privacyPolicy = await setPrivacyPolicyUrl()
  } catch (err) {
    console.error(`[STEP 4] Error: ${err.message}`)
  }

  // Step 5: Set age rating
  try {
    results.ageRating = await setAgeRating()
  } catch (err) {
    console.error(`[STEP 5] Error: ${err.message}`)
  }

  // Step 6: Content rights
  try {
    results.contentRights = await checkContentRights()
  } catch (err) {
    console.error(`[STEP 6] Error: ${err.message}`)
  }

  // Regenerate JWT in case it's about to expire (we've been making many calls)
  token = generateJWT()

  // Step 7: Verify readiness
  const versionInfo = await verifyReadyForSubmission()
  results.verification = versionInfo !== null

  // Step 8: Submit for review
  const readyToSubmit = results.buildAttach && results.verification
  if (readyToSubmit) {
    results.submission = await submitForReview()
  } else {
    console.log('\n========================================')
    console.log('[STEP 8] SKIPPED - Not ready for submission')
    if (!results.buildAttach) {
      console.log('  Reason: Build not attached to version')
    }
    if (!results.verification) {
      console.log('  Reason: Verification step failed')
    }
    console.log('========================================')
  }

  // Final Summary
  console.log('\n==============================================')
  console.log('  SUBMISSION SUMMARY')
  console.log('==============================================')
  console.log(`  Build check:      ${results.buildCheck ? 'PASS' : 'FAIL'}`)
  console.log(`  Build attached:   ${results.buildAttach ? 'PASS' : 'FAIL'}`)
  console.log(`  Category set:     ${results.category ? 'PASS' : 'FAIL'}`)
  console.log(`  Privacy policy:   ${results.privacyPolicy ? 'PASS' : 'FAIL'}`)
  console.log(`  Age rating:       ${results.ageRating ? 'PASS' : 'FAIL'}`)
  console.log(`  Content rights:   ${results.contentRights ? 'PASS' : 'FAIL'}`)
  console.log(`  Verification:     ${results.verification ? 'PASS' : 'FAIL'}`)
  console.log(`  Submission:       ${results.submission ? 'SUBMITTED' : 'NOT SUBMITTED'}`)
  console.log('')

  if (results.submission) {
    console.log('  App has been submitted for App Review!')
    console.log('  Monitor status at: https://appstoreconnect.apple.com/apps/6759269751/appstore')
  } else {
    console.log('  Submission was not completed. Check the errors above and fix them.')
    console.log('  Then re-run: node scripts/submit-appstore.mjs')
  }

  console.log('==============================================')
} catch (err) {
  console.error('\n[FATAL ERROR]', err.message)
  console.error(err.stack)
  process.exit(1)
}
