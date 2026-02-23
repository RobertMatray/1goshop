/**
 * Verify final territory state for 1GoShop
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

const DESIRED = new Set([
  'SVK','CZE','HUN','UKR','DEU','AUT','CHE','LIE','LUX','BEL',
  'CHN','HKG','TWN','SGP','MAC',
  'USA','GBR','CAN','AUS','NZL','IRL','ZAF','IND','PHL','MYS',
  'NGA','KEN','GHA','TZA','UGA','RWA','ZMB','ZWE','BWA','NAM',
  'MWI','GMB','SLE','LBR','CMR','ETH','PAK','BGD','LKA','MMR',
  'NPL','BHR','QAT','ARE','OMN','KWT','SAU','JOR','ISR','EGY',
  'MAR','TUN','DZA','SEN','CIV','MOZ','AGO','TTO','JAM','BRB',
  'BHS','GUY','SUR','BLZ','FJI','PNG','WSM','TON','VUT','SLB',
  'NRU','PLW','MHL','FSM','KIR','TUV',
  'NLD','SWE','DNK','NOR','FIN','ISL','MLT','CYP','EST','LVA',
  'LTU','HRV','SVN','BGR','ROU','POL','SRB','MNE','ALB','MKD',
  'BIH','GRC','PRT','ESP','ITA','FRA','TUR','GEO','ARM','AZE',
  'KAZ','UZB','KGZ','TJK','MNG','KHM','THA','VNM','IDN','JPN',
  'KOR','BRA','MEX','ARG','CHL','COL','PER','ECU','BOL','PRY',
  'URY','VEN','CRI','PAN','GTM','HND','SLV','NIC','DOM',
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
    const fullPath = apiPath.startsWith('/v2') ? apiPath : `/v1${apiPath}`
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
        try { resolve({ statusCode: res.statusCode, data: JSON.parse(data) }) }
        catch(e) { resolve({ statusCode: res.statusCode }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  const token = createAppleJWT()

  const result = await appleApiRequest(
    `/v2/appAvailabilities/${CONFIG.appId}/territoryAvailabilities?include=territory&limit=200`,
    token
  )
  const items = result.data?.data || []

  const available = []
  const traderStatus = []
  const unavailable = []
  const processing = []
  const other = []

  for (const ta of items) {
    const isAvail = ta.attributes?.available
    const statuses = ta.attributes?.contentStatuses || []
    const tId = ta.relationships?.territory?.data?.id || ta.id

    if (isAvail === false) {
      if (statuses.includes('PROCESSING_TO_NOT_AVAILABLE')) {
        processing.push(tId)
      } else {
        unavailable.push(tId)
      }
    } else if (statuses.includes('AVAILABLE')) {
      available.push(tId)
    } else if (statuses.includes('TRADER_STATUS_NOT_PROVIDED')) {
      traderStatus.push(tId)
    } else if (statuses.length === 0) {
      available.push(tId)
    } else {
      other.push({ id: tId, statuses, available: isAvail })
    }
  }

  console.log('='.repeat(70))
  console.log(' TERRITORY AVAILABILITY REPORT - 1GoShop')
  console.log(' Total territories: ' + items.length)
  console.log('='.repeat(70))

  console.log('\n  AVAILABLE (' + available.length + '):')
  for (let i = 0; i < available.length; i += 15) {
    console.log('    ' + available.slice(i, i + 15).join(', '))
  }

  console.log('\n  TRADER STATUS REQUIRED (' + traderStatus.length + '):')
  for (let i = 0; i < traderStatus.length; i += 15) {
    console.log('    ' + traderStatus.slice(i, i + 15).join(', '))
  }

  console.log('\n  DISABLED (' + unavailable.length + '):')
  for (let i = 0; i < unavailable.length; i += 15) {
    console.log('    ' + unavailable.slice(i, i + 15).join(', '))
  }

  console.log('\n  PROCESSING TO NOT AVAILABLE (' + processing.length + '):')
  for (let i = 0; i < processing.length; i += 15) {
    console.log('    ' + processing.slice(i, i + 15).join(', '))
  }

  if (other.length > 0) {
    console.log('\n  OTHER (' + other.length + '):')
    for (const o of other) {
      console.log('    ' + o.id + ': ' + JSON.stringify(o.statuses))
    }
  }

  // Correctness check
  const enabledSet = new Set([...available, ...traderStatus])
  const disabledSet = new Set([...unavailable, ...processing])

  let wronglyEnabled = 0
  let wronglyDisabled = 0
  const wrongEnabled = []
  const wrongDisabled = []

  for (const tId of enabledSet) {
    if (DESIRED.has(tId) === false) {
      wronglyEnabled++
      wrongEnabled.push(tId)
    }
  }
  for (const tId of disabledSet) {
    if (DESIRED.has(tId)) {
      wronglyDisabled++
      wrongDisabled.push(tId)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(' CORRECTNESS CHECK')
  console.log('='.repeat(70))
  console.log('  Desired territories: ' + DESIRED.size)
  console.log('  Enabled (available + trader status): ' + enabledSet.size)
  console.log('  Disabled/Processing: ' + disabledSet.size)
  console.log('  Wrongly enabled (should be disabled): ' + wronglyEnabled)
  if (wrongEnabled.length > 0) console.log('    ' + wrongEnabled.join(', '))
  console.log('  Wrongly disabled (should be enabled): ' + wronglyDisabled)
  if (wrongDisabled.length > 0) console.log('    ' + wrongDisabled.join(', '))

  console.log('\n  RESULT: ' + (wronglyEnabled === 0 && wronglyDisabled === 0 ? 'ALL CORRECT' : 'ISSUES FOUND'))
  console.log('='.repeat(70))
}

main().catch(err => {
  console.error('ERROR:', err)
  process.exit(1)
})
