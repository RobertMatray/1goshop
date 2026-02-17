import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'

const key = readFileSync('./internals/appstore-api/AuthKey_79PJWGG49Z.p8', 'utf8')
const now = Math.floor(Date.now() / 1000)
const token = jwt.sign(
  { iss: '69a6de87-7e92-47e3-e053-5b8c7c11a4d1', iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' },
  key,
  { algorithm: 'ES256', header: { alg: 'ES256', kid: '79PJWGG49Z', typ: 'JWT' } }
)

async function apiGet(endpoint) {
  const r = await fetch('https://api.appstoreconnect.apple.com' + endpoint, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  return r.json()
}

const appId = '6759269751'

// Get builds
const builds = await apiGet(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=5`)
console.log('Builds:')
builds.data?.forEach(b => {
  console.log(`  Build ${b.attributes.version} | uploaded: ${b.attributes.uploadedDate} | processing: ${b.attributes.processingState}`)
})

if (builds.data?.[0]) {
  const buildId = builds.data[0].id
  console.log('\nBuild ID:', buildId)

  // Get diagnostic signatures (crashes)
  const diag = await apiGet(`/v1/builds/${buildId}/diagnosticSignatures?filter[diagnosticType]=CRASHES`)
  console.log('\nCrash signatures:', diag.data?.length || 0)
  if (diag.data?.length > 0) {
    for (const sig of diag.data) {
      console.log(`  Crash: ${sig.attributes.signature}`)
      console.log(`  Weight: ${sig.attributes.weight}`)
      // Get crash logs
      const logs = await apiGet(`/v1/diagnosticSignatures/${sig.id}/logs`)
      if (logs.data?.length > 0) {
        for (const log of logs.data) {
          if (log.attributes?.diagnosticLogUrl) {
            console.log(`  Log URL: ${log.attributes.diagnosticLogUrl}`)
            // Fetch and print the log
            const logRes = await fetch(log.attributes.diagnosticLogUrl)
            const logText = await logRes.text()
            console.log('\n--- CRASH LOG ---')
            console.log(logText.substring(0, 5000))
            console.log('--- END LOG ---\n')
          }
        }
      }
    }
  } else {
    console.log('No crash signatures found (may take 24-48h to appear)')
  }

  // Get beta build localizations (TestFlight notes)
  const localizations = await apiGet(`/v1/builds/${buildId}/betaBuildLocalizations`)
  console.log('\nBeta build localizations:')
  localizations.data?.forEach(l => {
    console.log(`  Locale: ${l.attributes.locale} | What to test: ${l.attributes.whatsNew}`)
  })

  // Get beta app review detail
  const reviewDetail = await apiGet(`/v1/builds/${buildId}/betaAppReviewDetail`)
  console.log('\nBeta review detail:', JSON.stringify(reviewDetail.data?.attributes, null, 2))
}

// Check beta tester feedback
console.log('\n--- Checking Beta Tester Feedback ---')
const betaGroups = await apiGet(`/v1/apps/${appId}/betaGroups`)
console.log('Beta groups:', betaGroups.data?.length || 0)
betaGroups.data?.forEach(g => {
  console.log(`  Group: ${g.attributes.name} | Public: ${g.attributes.isInternalGroup}`)
})

// Check for crash feedback submissions
const crashFeedback = await apiGet(`/v1/apps/${appId}/betaFeedbackCrashSubmissions`)
console.log('\nCrash feedback submissions:', JSON.stringify(crashFeedback, null, 2))
