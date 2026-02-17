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

// Get crash log for the feedback submission
const crashLogRes = await apiGet('/v1/betaFeedbackCrashSubmissions/AC3j85APvq5p75nSGNKXmHw/crashLog')
console.log('Crash log response:')
console.log(JSON.stringify(crashLogRes, null, 2))

// If there's a URL, fetch it
if (crashLogRes.data?.attributes?.crashLogUrl) {
  console.log('\n--- Fetching crash log ---')
  const logRes = await fetch(crashLogRes.data.attributes.crashLogUrl)
  const logText = await logRes.text()
  console.log(logText)
}
