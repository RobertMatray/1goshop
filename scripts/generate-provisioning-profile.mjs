/**
 * Generate iOS Distribution Provisioning Profile via Apple App Store Connect API
 *
 * This script uses the App Store Connect API v1 to programmatically create
 * an App Store distribution provisioning profile for com.robertmatray.onegoshop.
 *
 * Steps:
 *   1. Create JWT token for Apple API authentication (ES256)
 *   2. Find or register the Bundle ID for com.robertmatray.onegoshop
 *   3. Find the distribution certificate (28T88DA5Q5)
 *   4. Create a new App Store distribution provisioning profile
 *   5. Download and save the .mobileprovision file
 *
 * Usage:
 *   node scripts/generate-provisioning-profile.mjs
 *
 * Output:
 *   internals/appstore-api/onegoshop.mobileprovision
 */

import jwt from 'jsonwebtoken'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  keyId: '79PJWGG49Z',
  issuerId: '69a6de87-7e92-47e3-e053-5b8c7c11a4d1',
  teamId: 'U5Q2UN4QKJ',
  bundleIdentifier: 'com.robertmatray.onegoshop',
  distributionCertificateId: '28T88DA5Q5',
  certificateSerialNumber: '43E703D3C1F55FEACFD80AAD6F944C7E',
  privateKeyPath: path.join(PROJECT_ROOT, 'internals', 'appstore-api', 'AuthKey_79PJWGG49Z.p8'),
  outputPath: path.join(PROJECT_ROOT, 'internals', 'appstore-api', 'onegoshop.mobileprovision'),
  apiHost: 'api.appstoreconnect.apple.com',
}

// ---------------------------------------------------------------------------
// JWT Token Generation
// ---------------------------------------------------------------------------

function createAppleJWT() {
  console.log('Step 1: Creating JWT token for Apple API authentication...')

  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: CONFIG.issuerId,
    iat: now,
    exp: now + 20 * 60, // 20 minutes (max allowed)
    aud: 'appstoreconnect-v1',
  }

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: CONFIG.keyId,
      typ: 'JWT',
    },
  })

  console.log('  JWT token created successfully')
  console.log(`  Issuer: ${CONFIG.issuerId}`)
  console.log(`  Key ID: ${CONFIG.keyId}`)
  console.log(`  Expires: ${new Date((now + 20 * 60) * 1000).toISOString()}`)

  return token
}

// ---------------------------------------------------------------------------
// HTTP Client for Apple API
// ---------------------------------------------------------------------------

function appleApiRequest(method, apiPath, token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.apiHost,
      path: `/v1${apiPath}`,
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          if (res.statusCode === 204) {
            resolve({ statusCode: res.statusCode, data: null })
            return
          }

          const parsed = data ? JSON.parse(data) : null
          if (res.statusCode >= 400) {
            const errors = parsed?.errors
              ?.map((e) => `${e.status} ${e.title}: ${e.detail}`)
              .join('\n  ')
            reject(
              new Error(
                `API Error ${res.statusCode}:\n  ${errors || data.substring(0, 500)}`
              )
            )
          } else {
            resolve({ statusCode: res.statusCode, data: parsed })
          }
        } catch (e) {
          reject(
            new Error(
              `Failed to parse response (status ${res.statusCode}): ${data.substring(0, 500)}`
            )
          )
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

// ---------------------------------------------------------------------------
// Step 2: Find or Register Bundle ID
// ---------------------------------------------------------------------------

async function findOrRegisterBundleId(token) {
  console.log('\nStep 2: Finding Bundle ID for ' + CONFIG.bundleIdentifier + '...')

  // Search for existing bundle ID
  const searchPath = `/bundleIds?filter[identifier]=${CONFIG.bundleIdentifier}&filter[platform]=IOS`
  const result = await appleApiRequest('GET', searchPath, token)
  const bundleIds = result.data?.data || []

  if (bundleIds.length > 0) {
    const bundleId = bundleIds[0]
    console.log(`  Found existing Bundle ID: ${bundleId.attributes.identifier}`)
    console.log(`  Bundle ID resource ID: ${bundleId.id}`)
    console.log(`  Name: ${bundleId.attributes.name}`)
    console.log(`  Platform: ${bundleId.attributes.platform}`)
    return bundleId
  }

  // Register new bundle ID
  console.log('  Not found. Registering new Bundle ID...')

  const registerBody = {
    data: {
      type: 'bundleIds',
      attributes: {
        identifier: CONFIG.bundleIdentifier,
        name: '1GoShop',
        platform: 'IOS',
      },
    },
  }

  const registerResult = await appleApiRequest('POST', '/bundleIds', token, registerBody)
  const newBundleId = registerResult.data?.data

  if (!newBundleId) {
    throw new Error(
      'Failed to register Bundle ID: ' + JSON.stringify(registerResult.data, null, 2)
    )
  }

  console.log(`  Registered: ${newBundleId.attributes.identifier}`)
  console.log(`  Bundle ID resource ID: ${newBundleId.id}`)
  return newBundleId
}

// ---------------------------------------------------------------------------
// Step 3: Find Distribution Certificate
// ---------------------------------------------------------------------------

async function findDistributionCertificate(token) {
  console.log('\nStep 3: Finding Distribution Certificate...')

  // List all certificates and filter for distribution type
  const result = await appleApiRequest(
    'GET',
    '/certificates?filter[certificateType]=IOS_DISTRIBUTION,DISTRIBUTION&limit=200',
    token
  )
  const certificates = result.data?.data || []

  console.log(`  Found ${certificates.length} distribution certificate(s)`)

  // Try to find by the known certificate ID
  let cert = certificates.find((c) => c.id === CONFIG.distributionCertificateId)

  if (!cert) {
    // Try to find by serial number
    console.log(
      `  Certificate ${CONFIG.distributionCertificateId} not found by ID. Searching by serial number...`
    )
    cert = certificates.find(
      (c) =>
        c.attributes.serialNumber?.toUpperCase() ===
        CONFIG.certificateSerialNumber.toUpperCase()
    )
  }

  if (!cert) {
    // List all available for debugging
    console.log('\n  Available certificates:')
    for (const c of certificates) {
      console.log(
        `    - ID: ${c.id}, Type: ${c.attributes.certificateType}, Name: ${c.attributes.name}, Serial: ${c.attributes.serialNumber}, Expires: ${c.attributes.expirationDate}`
      )
    }
    throw new Error(
      `Distribution certificate not found. Searched for ID=${CONFIG.distributionCertificateId} and Serial=${CONFIG.certificateSerialNumber}`
    )
  }

  console.log(`  Found certificate: ${cert.id}`)
  console.log(`  Type: ${cert.attributes.certificateType}`)
  console.log(`  Name: ${cert.attributes.name}`)
  console.log(`  Serial: ${cert.attributes.serialNumber}`)
  console.log(`  Expires: ${cert.attributes.expirationDate}`)

  // Check expiration
  const expDate = new Date(cert.attributes.expirationDate)
  if (expDate < new Date()) {
    throw new Error(`Certificate ${cert.id} expired on ${cert.attributes.expirationDate}`)
  }

  return cert
}

// ---------------------------------------------------------------------------
// Step 4: List Registered Devices (needed for understanding, but App Store
//         profiles don't need devices - they cover all devices)
// ---------------------------------------------------------------------------

// App Store distribution profiles don't include specific devices.
// We skip device listing.

// ---------------------------------------------------------------------------
// Step 4: Create Provisioning Profile
// ---------------------------------------------------------------------------

async function createProvisioningProfile(token, bundleIdResourceId, certificateId) {
  console.log('\nStep 4: Creating App Store Distribution Provisioning Profile...')
  console.log(`  Bundle ID resource: ${bundleIdResourceId}`)
  console.log(`  Certificate: ${certificateId}`)
  console.log(`  Profile type: IOS_APP_STORE`)

  const profileName = `1GoShop AppStore ${new Date().toISOString().slice(0, 10)}`

  const body = {
    data: {
      type: 'profiles',
      attributes: {
        name: profileName,
        profileType: 'IOS_APP_STORE',
      },
      relationships: {
        bundleId: {
          data: {
            type: 'bundleIds',
            id: bundleIdResourceId,
          },
        },
        certificates: {
          data: [
            {
              type: 'certificates',
              id: certificateId,
            },
          ],
        },
      },
    },
  }

  const result = await appleApiRequest('POST', '/profiles', token, body)
  const profile = result.data?.data

  if (!profile) {
    throw new Error(
      'Failed to create provisioning profile: ' + JSON.stringify(result.data, null, 2)
    )
  }

  console.log(`  Created profile: ${profile.attributes.name}`)
  console.log(`  Profile ID: ${profile.id}`)
  console.log(`  UUID: ${profile.attributes.uuid}`)
  console.log(`  State: ${profile.attributes.profileState}`)
  console.log(`  Expires: ${profile.attributes.expirationDate}`)
  console.log(`  Type: ${profile.attributes.profileType}`)

  return profile
}

// ---------------------------------------------------------------------------
// Step 5: Download and Save Provisioning Profile
// ---------------------------------------------------------------------------

function saveProvisioningProfile(profile) {
  console.log('\nStep 5: Saving provisioning profile...')

  const profileContent = profile.attributes.profileContent

  if (!profileContent) {
    throw new Error('Profile content is empty. Cannot save.')
  }

  // profileContent is base64 encoded
  const buffer = Buffer.from(profileContent, 'base64')

  // Ensure output directory exists
  const outputDir = path.dirname(CONFIG.outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(CONFIG.outputPath, buffer)

  console.log(`  Saved to: ${CONFIG.outputPath}`)
  console.log(`  File size: ${buffer.length} bytes`)

  return CONFIG.outputPath
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70))
  console.log(' Generate iOS Distribution Provisioning Profile')
  console.log(' Apple App Store Connect API v1')
  console.log('='.repeat(70))
  console.log()
  console.log(`  Bundle ID:     ${CONFIG.bundleIdentifier}`)
  console.log(`  Certificate:   ${CONFIG.distributionCertificateId}`)
  console.log(`  Team:          ${CONFIG.teamId}`)
  console.log(`  Output:        ${CONFIG.outputPath}`)
  console.log()

  try {
    // Step 1: Create JWT
    const token = createAppleJWT()

    // Step 2: Find or register Bundle ID
    const bundleId = await findOrRegisterBundleId(token)

    // Step 3: Find distribution certificate
    const certificate = await findDistributionCertificate(token)

    // Step 4: Create provisioning profile
    const profile = await createProvisioningProfile(token, bundleId.id, certificate.id)

    // Step 5: Save .mobileprovision file
    const savedPath = saveProvisioningProfile(profile)

    console.log('\n' + '='.repeat(70))
    console.log(' PROVISIONING PROFILE GENERATED SUCCESSFULLY')
    console.log('='.repeat(70))
    console.log()
    console.log(`  Profile Name:  ${profile.attributes.name}`)
    console.log(`  Profile UUID:  ${profile.attributes.uuid}`)
    console.log(`  Profile State: ${profile.attributes.profileState}`)
    console.log(`  Expires:       ${profile.attributes.expirationDate}`)
    console.log(`  Saved to:      ${savedPath}`)
    console.log()
    console.log('  Next steps:')
    console.log('  1. Upload to EAS:')
    console.log(
      '     node scripts/setup-credentials-api.mjs --provisioning-profile internals/appstore-api/onegoshop.mobileprovision'
    )
    console.log('  2. Or run EAS build directly:')
    console.log(
      '     npx eas-cli build --platform ios --profile production --non-interactive'
    )
  } catch (error) {
    console.error('\n  ERROR:', error.message)

    if (error.message.includes('NOT_AUTHORIZED') || error.message.includes('403')) {
      console.error('\n  The API key may not have sufficient permissions.')
      console.error('  Ensure the key has "Admin" or "App Manager" role in App Store Connect.')
    }

    if (error.message.includes('ENTITY_ERROR') && error.message.includes('already exists')) {
      console.error('\n  A profile with this name may already exist.')
      console.error(
        '  You can delete it from https://developer.apple.com/account/resources/profiles/list'
      )
      console.error('  and re-run this script.')
    }

    process.exit(1)
  }
}

main()
