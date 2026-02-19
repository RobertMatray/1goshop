import { readFileSync } from 'fs'
import jwt from 'jsonwebtoken'
const { sign } = jwt
import { resolve } from 'path'

const API_KEY_PATH = resolve('./internals/appstore-api/AuthKey_79PJWGG49Z.p8')
const KEY_ID = '79PJWGG49Z'
const ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
const BASE_URL = 'https://api.appstoreconnect.apple.com/v1'
const ASC_APP_ID = '6759269751'
const VERSION_ID = '139155f5-3177-4e12-9199-23b3667a56cb'

const privateKey = readFileSync(API_KEY_PATH, 'utf8')
const now = Math.floor(Date.now() / 1000)
const token = sign(
  { iss: ISSUER_ID, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1' },
  privateKey,
  { algorithm: 'ES256', header: { alg: 'ES256', kid: KEY_ID, typ: 'JWT' } }
)

async function api(method, path, body) {
  const url = path.startsWith('http') ? path : BASE_URL + path
  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)

  if (method === 'DELETE') {
    console.log('DELETE', path, '->', res.status)
    return null
  }

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (!res.ok) {
    console.error('ERROR', method, path, res.status)
    console.error(JSON.stringify(data, null, 2))
    return null
  }
  return data
}

// List all review submissions
console.log('=== All review submissions ===')
const subs = await api('GET', `/apps/${ASC_APP_ID}/reviewSubmissions`)

for (const s of subs?.data || []) {
  console.log('  ID:', s.id, '| State:', s.attributes.state, '| Platform:', s.attributes.platform)
}

// Cancel ALL non-terminal submissions
for (const s of subs?.data || []) {
  const state = s.attributes.state
  if (state === 'COMPLETE' || state === 'CANCELING') {
    console.log(`  Skipping ${s.id} (${state})`)
    continue
  }
  console.log(`\nCancelling submission: ${s.id} (${state})`)
  const cancelResult = await api('PATCH', `/reviewSubmissions/${s.id}`, {
    data: {
      type: 'reviewSubmissions',
      id: s.id,
      attributes: { canceled: true },
    },
  })
  if (cancelResult) {
    console.log('Cancelled:', cancelResult.data?.attributes?.state)
  } else {
    console.log('Trying DELETE...')
    await api('DELETE', `/reviewSubmissions/${s.id}`)
  }
}

// Wait for cancellations to complete
console.log('\nWaiting 5s for cancellations to process...')
await new Promise(r => setTimeout(r, 5000))

// Create new submission
console.log('\n=== Creating new review submission ===')
const newSub = await api('POST', '/reviewSubmissions', {
  data: {
    type: 'reviewSubmissions',
    attributes: { platform: 'IOS' },
    relationships: {
      app: { data: { type: 'apps', id: ASC_APP_ID } },
    },
  },
})

if (!newSub) {
  console.log('Failed to create submission')
  process.exit(1)
}

const newSubId = newSub.data.id
console.log('Created:', newSubId)

// Add version
console.log('\n=== Adding version to submission ===')
const item = await api('POST', '/reviewSubmissionItems', {
  data: {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: newSubId } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
    },
  },
})

if (!item) {
  console.log('Failed to add item')
  process.exit(1)
}
console.log('Added item:', item.data?.id)

// Submit
console.log('\n=== Submitting for review ===')
const submit = await api('PATCH', `/reviewSubmissions/${newSubId}`, {
  data: {
    type: 'reviewSubmissions',
    id: newSubId,
    attributes: { submitted: true },
  },
})

if (submit) {
  console.log('SUBMITTED! State:', submit.data?.attributes?.state)
} else {
  console.log('Submission failed')
  process.exit(1)
}
