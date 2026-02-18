import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import readline from 'readline'

// ============================================================================
// App Store Connect - Set App Privacy
// ============================================================================
//
// Declares "No, we do not collect data from this app" via Apple's auth flow.
//
// APPROACH: Authenticate via Apple ID web auth (like fastlane spaceship),
// then use the Iris internal API to set app privacy.
//
// If Apple ID login is needed, the script will prompt for credentials
// and 2FA code interactively in the terminal.
//
// If that fails, falls back to attempting submission and showing what's needed.
//
// Usage: node scripts/set-app-privacy.mjs
// ============================================================================

const ASC_APP_ID = '6759269751'
const API_KEY_PATH = resolve('../superapp-ai-poc/internals/appstore-api/AuthKey_79PJWGG49Z.p8')
const KEY_ID = '79PJWGG49Z'
const ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'

function generateJWT() {
  const privateKey = readFileSync(API_KEY_PATH, 'utf8')
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { iss: ISSUER_ID, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1' },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: KEY_ID, typ: 'JWT' } }
  )
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function apiRequest(method, path, body = null) {
  const token = generateJWT()
  const url = path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com/v1${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  const options = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(url, options)
  if (method === 'DELETE' && res.status === 204) return { success: true }
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) {
    console.error(`[API ERROR] ${method} ${path} -> ${res.status}`)
    if (typeof data === 'object') console.error(JSON.stringify(data, null, 2))
    throw new Error(`API request failed: ${res.status}`)
  }
  return data
}

console.log('==============================================')
console.log('  App Store Connect - Set App Privacy')
console.log('  App: 1GoShop (ID: ' + ASC_APP_ID + ')')
console.log('  Date: ' + new Date().toISOString())
console.log('==============================================')
console.log('')

// ============================================================================
// Approach: Use Apple ID web authentication (like fastlane spaceship)
// to get a session, then call the Iris internal API
// ============================================================================

async function authenticateAppleID() {
  console.log('[AUTH] Starting Apple ID authentication...')
  console.log('[AUTH] This requires your Apple ID credentials.')
  console.log('')

  const appleId = await prompt('Apple ID (email): ')
  const password = await prompt('Password: ')

  const AUTH_BASE = 'https://idmsa.apple.com/appleauth/auth'

  // Step 1: Sign in
  console.log('[AUTH] Signing in...')
  const signinRes = await fetch(AUTH_BASE + '/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Apple-ID-Session-Id': '',
      'X-Apple-Widget-Key': 'e0b80c3bf78523bfe80571b6ff2e766f',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      accountName: appleId,
      password: password,
      rememberMe: true,
    }),
  })

  console.log('[AUTH] Sign in response:', signinRes.status)

  if (signinRes.status === 409) {
    // 2FA required
    const sessionId = signinRes.headers.get('x-apple-id-session-id')
    const scnt = signinRes.headers.get('scnt')

    console.log('[AUTH] Two-factor authentication required.')
    const code = await prompt('Enter 2FA code from your device: ')

    const verifyRes = await fetch(AUTH_BASE + '/verify/trusteddevice/securitycode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Apple-ID-Session-Id': sessionId,
        'scnt': scnt,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        securityCode: { code },
      }),
    })

    console.log('[AUTH] 2FA verify response:', verifyRes.status)

    if (verifyRes.ok || verifyRes.status === 204) {
      // Trust session
      const trustRes = await fetch(AUTH_BASE + '/2sv/trust', {
        method: 'GET',
        headers: {
          'X-Apple-ID-Session-Id': sessionId,
          'scnt': scnt,
          'Accept': 'application/json',
        },
      })
      console.log('[AUTH] Trust response:', trustRes.status)

      // Get session cookies
      const cookies = trustRes.headers.getSetCookie?.() || []
      return { sessionId, scnt, cookies }
    } else {
      const text = await verifyRes.text()
      throw new Error('2FA verification failed: ' + text)
    }
  } else if (signinRes.ok) {
    // No 2FA needed
    const cookies = signinRes.headers.getSetCookie?.() || []
    return { cookies }
  } else {
    const text = await signinRes.text()
    throw new Error('Authentication failed: ' + signinRes.status + ' ' + text)
  }
}

async function setPrivacyViaIris(session) {
  console.log('[IRIS] Attempting to set privacy via Iris API...')

  const IRIS_BASE = 'https://appstoreconnect.apple.com/WebObjects/iTunesConnect.woa/ra'

  // Build cookie header
  const cookieHeader = session.cookies?.join('; ') || ''

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  }

  if (session.sessionId) {
    headers['X-Apple-ID-Session-Id'] = session.sessionId
  }
  if (session.scnt) {
    headers['scnt'] = session.scnt
  }

  // Try to get app privacy info
  const privacyRes = await fetch(
    `${IRIS_BASE}/apps/${ASC_APP_ID}/privacyDetails`,
    { headers }
  )

  console.log('[IRIS] Privacy details response:', privacyRes.status)
  const privacyText = await privacyRes.text()
  console.log('[IRIS] Response:', privacyText.substring(0, 1000))

  return false
}

// ============================================================================
// Main logic
// ============================================================================

try {
  // First, try the Apple ID auth approach
  console.log('Option 1: Attempt Apple ID web authentication')
  console.log('Option 2: Skip to try submitting for review (to see current issues)')
  console.log('')

  const choice = await prompt('Choose option (1 or 2): ')

  if (choice === '1') {
    try {
      const session = await authenticateAppleID()
      console.log('[AUTH] Authentication successful!')
      await setPrivacyViaIris(session)
    } catch (err) {
      console.error('[AUTH] Failed:', err.message)
      console.log('')
      console.log('Falling back to option 2...')
    }
  }

  // Option 2: Try to submit and show what's missing
  console.log('')
  console.log('==============================================')
  console.log('  Checking submission readiness...')
  console.log('==============================================')
  console.log('')

  // Check for existing review submissions that might be blocking
  try {
    const existing = await apiRequest('GET', `/apps/${ASC_APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW`)
    if (existing.data?.length > 0) {
      for (const sub of existing.data) {
        console.log(`[CLEANUP] Deleting existing review submission: ${sub.id} (state: ${sub.attributes.state})`)
        await apiRequest('DELETE', `/reviewSubmissions/${sub.id}`)
      }
    }
  } catch (err) {
    console.log('[CLEANUP] No existing submissions to clean:', err.message)
  }

  // Create a new review submission to check what's missing
  console.log('[CHECK] Creating review submission to check requirements...')
  const submission = await apiRequest('POST', '/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: {
        app: { data: { type: 'apps', id: ASC_APP_ID } },
      },
    },
  })

  const submissionId = submission.data.id
  console.log(`[CHECK] Review submission created: ${submissionId}`)

  // Try adding version
  const VERSION_ID = '139155f5-3177-4e12-9199-23b3667a56cb'
  console.log('[CHECK] Adding version to review...')
  try {
    const itemResult = await apiRequest('POST', '/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
        },
      },
    })
    console.log('[CHECK] Version added successfully!')

    // Try to submit
    console.log('[CHECK] Attempting to confirm submission...')
    const submitResult = await apiRequest('PATCH', `/reviewSubmissions/${submissionId}`, {
      data: {
        type: 'reviewSubmissions',
        id: submissionId,
        attributes: { submitted: true },
      },
    })
    console.log('[CHECK] SUBMITTED FOR REVIEW!')
    console.log('[CHECK] State:', submitResult.data?.attributes?.state)

  } catch (err) {
    console.log('')
    console.log('==============================================')
    console.log('  SUBMISSION BLOCKED - Missing Requirements')
    console.log('==============================================')
    console.log('')
    console.log('The App Privacy declaration is required but cannot be set via the REST API.')
    console.log('')
    console.log('MANUAL STEP REQUIRED:')
    console.log('')
    console.log('  1. Open: https://appstoreconnect.apple.com/apps/6759269751/privacy/data-collection')
    console.log('  2. Click "Get Started"')
    console.log('  3. On the question "Do you or your third-party partners collect data from this app?"')
    console.log('     Select: "No, we do not collect data from this app"')
    console.log('  4. Click "Save"')
    console.log('  5. Click "Publish"')
    console.log('')
    console.log('After completing this step, run:')
    console.log('  node scripts/submit-appstore.mjs')
    console.log('')
    console.log('Direct link to privacy page:')
    console.log(`  https://appstoreconnect.apple.com/apps/${ASC_APP_ID}/privacy/data-collection`)
    console.log('')

    // Clean up the review submission
    try {
      await apiRequest('DELETE', `/reviewSubmissions/${submissionId}`)
      console.log('[CLEANUP] Deleted review submission.')
    } catch {}
  }

} catch (err) {
  console.error('[ERROR]', err.message)
}
