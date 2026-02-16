/**
 * Setup iOS Build Credentials for 1GoShop via Expo GraphQL API
 *
 * This script sets up iOS App Credentials on EAS without interactive prompts.
 * It reuses the existing Apple Distribution Certificate (28T88DA5Q5) that is
 * already configured for other projects under the same account.
 *
 * What it does:
 *   1. Verifies authentication and fetches account/app metadata
 *   2. Finds or creates the AppleAppIdentifier for com.robertmatray.onegoshop
 *   3. Creates IosAppCredentials linking the app to the bundle identifier
 *   4. Creates IosAppBuildCredentials linking the distribution certificate
 *   5. Optionally uploads a provisioning profile if one is provided
 *
 * Usage:
 *   node scripts/setup-credentials-api.mjs
 *   node scripts/setup-credentials-api.mjs --provisioning-profile path/to/profile.mobileprovision
 *   node scripts/setup-credentials-api.mjs --dry-run
 *
 * Prerequisites:
 *   - Valid Expo session in ~/.expo/state.json
 *   - EAS project already created (f6744446-31a1-40f5-abe9-77e7dc41a501)
 *   - Distribution certificate 28T88DA5Q5 already uploaded to Expo
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  // Expo session (from ~/.expo/state.json)
  sessionSecret:
    '{"id":"928c128d-7ef3-4ab2-9d90-86c376de041d","version":1,"expires_at":2080944000000}',

  // EAS Project
  projectId: 'f6744446-31a1-40f5-abe9-77e7dc41a501',
  bundleIdentifier: 'com.robertmatray.onegoshop',

  // Apple credentials
  appleTeamIdentifier: 'U5Q2UN4QKJ',
  distributionCertDeveloperPortalId: '28T88DA5Q5',

  // API
  apiHost: 'api.expo.dev',
  apiPath: '/graphql',
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const provisioningProfileArgIndex = args.indexOf('--provisioning-profile')
const PROVISIONING_PROFILE_PATH =
  provisioningProfileArgIndex !== -1 ? args[provisioningProfileArgIndex + 1] : null

if (DRY_RUN) {
  console.log('[DRY RUN] No mutations will be executed.\n')
}

// ---------------------------------------------------------------------------
// GraphQL client
// ---------------------------------------------------------------------------

/**
 * Execute a GraphQL query/mutation against the Expo API.
 */
function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables })
    const options = {
      hostname: CONFIG.apiHost,
      path: CONFIG.apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'expo-session': CONFIG.sessionSecret,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.errors && parsed.errors.length > 0) {
            const errorMessages = parsed.errors.map((e) => e.message).join('\n  ')
            reject(new Error('GraphQL errors:\n  ' + errorMessages))
          } else {
            resolve(parsed)
          }
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.substring(0, 500)))
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ---------------------------------------------------------------------------
// Step functions
// ---------------------------------------------------------------------------

/**
 * Step 1: Verify authentication and get account info.
 */
async function verifyAuth() {
  console.log('Step 1: Verifying authentication...')

  const result = await graphql(`{
    meActor {
      __typename
      ... on UserActor {
        id
        username
        primaryAccount {
          id
          name
        }
      }
    }
  }`)

  const actor = result.data?.meActor
  if (!actor || actor.__typename !== 'User') {
    throw new Error('Authentication failed. Check your Expo session token.')
  }

  console.log(`  Authenticated as: ${actor.username}`)
  console.log(`  Account: ${actor.primaryAccount.name} (${actor.primaryAccount.id})`)

  return {
    userId: actor.id,
    accountId: actor.primaryAccount.id,
    accountName: actor.primaryAccount.name,
  }
}

/**
 * Step 2: Fetch app metadata and verify project exists.
 */
async function fetchAppInfo() {
  console.log('\nStep 2: Fetching app info...')

  const result = await graphql(`{
    app {
      byId(appId: "${CONFIG.projectId}") {
        id
        name
        slug
        fullName
        ownerAccount {
          id
          name
        }
        iosAppCredentials {
          id
          appleTeam {
            id
            appleTeamIdentifier
          }
          appleAppIdentifier {
            id
            bundleIdentifier
          }
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            distributionCertificate {
              id
              serialNumber
              developerPortalIdentifier
            }
            provisioningProfile {
              id
              appleUUID
              status
              expiration
            }
          }
        }
      }
    }
  }`)

  const app = result.data?.app?.byId
  if (!app) {
    throw new Error(`App not found: ${CONFIG.projectId}`)
  }

  console.log(`  App: ${app.fullName} (${app.id})`)
  console.log(`  Owner: ${app.ownerAccount.name}`)
  console.log(`  Existing iOS credentials: ${app.iosAppCredentials.length}`)

  if (app.iosAppCredentials.length > 0) {
    console.log('\n  Existing iOS App Credentials:')
    for (const cred of app.iosAppCredentials) {
      console.log(`    - ID: ${cred.id}`)
      console.log(`      Bundle ID: ${cred.appleAppIdentifier.bundleIdentifier}`)
      console.log(`      Build Credentials: ${cred.iosAppBuildCredentialsList.length}`)
      for (const bc of cred.iosAppBuildCredentialsList) {
        console.log(`        - Type: ${bc.iosDistributionType}`)
        console.log(
          `          Cert: ${bc.distributionCertificate?.developerPortalIdentifier || 'none'}`
        )
        console.log(
          `          Profile: ${bc.provisioningProfile?.status || 'none'} (UUID: ${bc.provisioningProfile?.appleUUID || 'none'})`
        )
      }
    }
  }

  return app
}

/**
 * Step 3: Find the Apple Team in Expo.
 */
async function findAppleTeam(accountName) {
  console.log('\nStep 3: Finding Apple Team...')

  const result = await graphql(`{
    account {
      byName(accountName: "${accountName}") {
        appleTeamsPaginated(first: 20) {
          edges {
            node {
              id
              appleTeamIdentifier
              appleTeamName
              appleTeamType
            }
          }
        }
      }
    }
  }`)

  const teams = result.data?.account?.byName?.appleTeamsPaginated?.edges || []
  const team = teams.find(
    (edge) => edge.node.appleTeamIdentifier === CONFIG.appleTeamIdentifier
  )?.node

  if (!team) {
    throw new Error(
      `Apple Team ${CONFIG.appleTeamIdentifier} not found in Expo account. ` +
        `Available teams: ${teams.map((e) => e.node.appleTeamIdentifier).join(', ') || 'none'}`
    )
  }

  console.log(`  Found: ${team.appleTeamName} (${team.appleTeamIdentifier})`)
  console.log(`  Expo Team ID: ${team.id}`)

  return team
}

/**
 * Step 4: Find the existing Distribution Certificate.
 */
async function findDistributionCertificate(accountName) {
  console.log('\nStep 4: Finding Distribution Certificate...')

  const result = await graphql(`{
    account {
      byName(accountName: "${accountName}") {
        appleDistributionCertificatesPaginated(first: 20) {
          edges {
            node {
              id
              serialNumber
              developerPortalIdentifier
              validityNotBefore
              validityNotAfter
            }
          }
        }
      }
    }
  }`)

  const certs =
    result.data?.account?.byName?.appleDistributionCertificatesPaginated?.edges || []
  const cert = certs.find(
    (edge) =>
      edge.node.developerPortalIdentifier === CONFIG.distributionCertDeveloperPortalId
  )?.node

  if (!cert) {
    throw new Error(
      `Distribution Certificate ${CONFIG.distributionCertDeveloperPortalId} not found. ` +
        `Available certs: ${certs.map((e) => `${e.node.developerPortalIdentifier} (${e.node.serialNumber})`).join(', ') || 'none'}`
    )
  }

  const validUntil = new Date(cert.validityNotAfter)
  const now = new Date()
  if (validUntil < now) {
    throw new Error(
      `Distribution Certificate ${cert.developerPortalIdentifier} expired on ${cert.validityNotAfter}`
    )
  }

  console.log(`  Found: ${cert.developerPortalIdentifier}`)
  console.log(`  Serial: ${cert.serialNumber}`)
  console.log(`  Valid until: ${cert.validityNotAfter}`)
  console.log(`  Expo Cert ID: ${cert.id}`)

  return cert
}

/**
 * Step 5: Find or create AppleAppIdentifier for the bundle ID.
 */
async function findOrCreateAppleAppIdentifier(accountId, accountName, appleTeamId) {
  console.log('\nStep 5: Finding or creating Apple App Identifier...')

  // Check if it already exists
  const result = await graphql(`{
    account {
      byName(accountName: "${accountName}") {
        appleAppIdentifiers(bundleIdentifier: "${CONFIG.bundleIdentifier}") {
          id
          bundleIdentifier
          appleTeam {
            id
            appleTeamIdentifier
          }
        }
      }
    }
  }`)

  const existing = result.data?.account?.byName?.appleAppIdentifiers || []

  if (existing.length > 0) {
    const identifier = existing[0]
    console.log(`  Found existing: ${identifier.bundleIdentifier} (${identifier.id})`)
    if (identifier.appleTeam) {
      console.log(`  Linked to team: ${identifier.appleTeam.appleTeamIdentifier}`)
    } else {
      console.log('  Not linked to any Apple Team (this is normal for EAS-managed)')
    }
    return identifier
  }

  // Create new
  console.log(`  Not found. Creating Apple App Identifier for ${CONFIG.bundleIdentifier}...`)

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would create AppleAppIdentifier')
    return { id: 'dry-run-apple-app-identifier-id', bundleIdentifier: CONFIG.bundleIdentifier }
  }

  const createResult = await graphql(
    `mutation CreateAppleAppIdentifier($input: AppleAppIdentifierInput!, $accountId: ID!) {
      appleAppIdentifier {
        createAppleAppIdentifier(appleAppIdentifierInput: $input, accountId: $accountId) {
          id
          bundleIdentifier
          appleTeam {
            id
            appleTeamIdentifier
          }
        }
      }
    }`,
    {
      input: {
        bundleIdentifier: CONFIG.bundleIdentifier,
        appleTeamId: appleTeamId,
      },
      accountId: accountId,
    }
  )

  const created = createResult.data?.appleAppIdentifier?.createAppleAppIdentifier
  if (!created) {
    throw new Error(
      'Failed to create Apple App Identifier: ' + JSON.stringify(createResult, null, 2)
    )
  }

  console.log(`  Created: ${created.bundleIdentifier} (${created.id})`)
  return created
}

/**
 * Step 6: Create IosAppCredentials.
 */
async function createIosAppCredentials(appId, appleAppIdentifierId, appleTeamId) {
  console.log('\nStep 6: Creating iOS App Credentials...')

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would create IosAppCredentials')
    console.log(`    appId: ${appId}`)
    console.log(`    appleAppIdentifierId: ${appleAppIdentifierId}`)
    console.log(`    appleTeamId: ${appleTeamId}`)
    return { id: 'dry-run-ios-app-credentials-id' }
  }

  const result = await graphql(
    `mutation CreateIosAppCredentials(
      $input: IosAppCredentialsInput!,
      $appId: ID!,
      $appleAppIdentifierId: ID!
    ) {
      iosAppCredentials {
        createIosAppCredentials(
          iosAppCredentialsInput: $input,
          appId: $appId,
          appleAppIdentifierId: $appleAppIdentifierId
        ) {
          id
          appleTeam {
            id
            appleTeamIdentifier
          }
          appleAppIdentifier {
            id
            bundleIdentifier
          }
        }
      }
    }`,
    {
      input: {
        appleTeamId: appleTeamId,
      },
      appId: appId,
      appleAppIdentifierId: appleAppIdentifierId,
    }
  )

  const created = result.data?.iosAppCredentials?.createIosAppCredentials
  if (!created) {
    throw new Error('Failed to create iOS App Credentials: ' + JSON.stringify(result, null, 2))
  }

  console.log(`  Created iOS App Credentials: ${created.id}`)
  console.log(`  Bundle ID: ${created.appleAppIdentifier.bundleIdentifier}`)
  return created
}

/**
 * Step 7: Upload provisioning profile (if provided).
 */
async function uploadProvisioningProfile(accountId, appleAppIdentifierId) {
  if (!PROVISIONING_PROFILE_PATH) {
    console.log('\nStep 7: Skipping provisioning profile upload (no --provisioning-profile flag)')
    console.log(
      '  NOTE: EAS Build will auto-generate a provisioning profile during the first build.'
    )
    console.log(
      '  If you want to upload one manually, re-run with --provisioning-profile <path>'
    )
    return null
  }

  console.log('\nStep 7: Uploading provisioning profile...')

  const profilePath = path.resolve(PROVISIONING_PROFILE_PATH)
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Provisioning profile not found: ${profilePath}`)
  }

  const profileData = fs.readFileSync(profilePath)
  const profileBase64 = profileData.toString('base64')
  console.log(`  File: ${profilePath}`)
  console.log(`  Size: ${profileData.length} bytes`)

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would upload provisioning profile')
    return { id: 'dry-run-provisioning-profile-id' }
  }

  const result = await graphql(
    `mutation CreateProvisioningProfile(
      $input: AppleProvisioningProfileInput!,
      $accountId: ID!,
      $appleAppIdentifierId: ID!
    ) {
      appleProvisioningProfile {
        createAppleProvisioningProfile(
          appleProvisioningProfileInput: $input,
          accountId: $accountId,
          appleAppIdentifierId: $appleAppIdentifierId
        ) {
          id
          appleUUID
          status
          expiration
          developerPortalIdentifier
        }
      }
    }`,
    {
      input: {
        appleProvisioningProfile: profileBase64,
      },
      accountId: accountId,
      appleAppIdentifierId: appleAppIdentifierId,
    }
  )

  const created = result.data?.appleProvisioningProfile?.createAppleProvisioningProfile
  if (!created) {
    throw new Error(
      'Failed to upload provisioning profile: ' + JSON.stringify(result, null, 2)
    )
  }

  console.log(`  Uploaded: ${created.appleUUID}`)
  console.log(`  Status: ${created.status}`)
  console.log(`  Expires: ${created.expiration}`)
  console.log(`  Expo Profile ID: ${created.id}`)

  return created
}

/**
 * Step 8: Create IosAppBuildCredentials linking cert (and optionally provisioning profile).
 */
async function createIosAppBuildCredentials(
  iosAppCredentialsId,
  distributionCertificateId,
  provisioningProfileId
) {
  console.log('\nStep 8: Creating iOS App Build Credentials...')

  if (!provisioningProfileId) {
    console.log(
      '  No provisioning profile available. Creating build credentials without one.'
    )
    console.log(
      '  EAS Build will auto-generate a provisioning profile during the first build.'
    )

    // We cannot create IosAppBuildCredentials without a provisioning profile
    // because the input requires provisioningProfileId as NON_NULL.
    // Instead, we just set the distribution certificate on the existing credentials.
    // Actually, looking at the schema: IosAppBuildCredentialsInput requires both
    // distributionCertificateId and provisioningProfileId as required fields.
    // So we need to skip this step and let EAS handle it.

    console.log(
      '\n  IMPORTANT: IosAppBuildCredentials requires both a distribution certificate')
    console.log(
      '  AND a provisioning profile. Since no provisioning profile was provided,')
    console.log(
      '  this step will be completed automatically during the first EAS build.')
    console.log(
      '  The distribution certificate (28T88DA5Q5) is already in the Expo account')
    console.log(
      '  and EAS will automatically select it during the build process.')

    return null
  }

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would create IosAppBuildCredentials')
    console.log(`    iosAppCredentialsId: ${iosAppCredentialsId}`)
    console.log(`    distributionCertificateId: ${distributionCertificateId}`)
    console.log(`    provisioningProfileId: ${provisioningProfileId}`)
    return { id: 'dry-run-build-credentials-id' }
  }

  const result = await graphql(
    `mutation CreateIosAppBuildCredentials(
      $input: IosAppBuildCredentialsInput!,
      $iosAppCredentialsId: ID!
    ) {
      iosAppBuildCredentials {
        createIosAppBuildCredentials(
          iosAppBuildCredentialsInput: $input,
          iosAppCredentialsId: $iosAppCredentialsId
        ) {
          id
          iosDistributionType
          distributionCertificate {
            id
            developerPortalIdentifier
            serialNumber
          }
          provisioningProfile {
            id
            appleUUID
            status
            expiration
          }
        }
      }
    }`,
    {
      input: {
        iosDistributionType: 'APP_STORE',
        distributionCertificateId: distributionCertificateId,
        provisioningProfileId: provisioningProfileId,
      },
      iosAppCredentialsId: iosAppCredentialsId,
    }
  )

  const created = result.data?.iosAppBuildCredentials?.createIosAppBuildCredentials
  if (!created) {
    throw new Error(
      'Failed to create iOS App Build Credentials: ' + JSON.stringify(result, null, 2)
    )
  }

  console.log(`  Created Build Credentials: ${created.id}`)
  console.log(`  Distribution Type: ${created.iosDistributionType}`)
  console.log(`  Certificate: ${created.distributionCertificate.developerPortalIdentifier}`)
  console.log(`  Profile UUID: ${created.provisioningProfile.appleUUID}`)
  console.log(`  Profile Status: ${created.provisioningProfile.status}`)

  return created
}

/**
 * Step 9: Verify the final state.
 */
async function verifyFinalState() {
  console.log('\nStep 9: Verifying final state...')

  const result = await graphql(`{
    app {
      byId(appId: "${CONFIG.projectId}") {
        id
        fullName
        iosAppCredentials {
          id
          appleTeam {
            id
            appleTeamIdentifier
          }
          appleAppIdentifier {
            id
            bundleIdentifier
          }
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            distributionCertificate {
              id
              serialNumber
              developerPortalIdentifier
            }
            provisioningProfile {
              id
              appleUUID
              status
              expiration
            }
          }
        }
      }
    }
  }`)

  const app = result.data?.app?.byId
  if (!app) {
    throw new Error('Failed to fetch app for verification')
  }

  console.log(`\n  App: ${app.fullName}`)
  console.log(`  iOS App Credentials: ${app.iosAppCredentials.length}`)

  for (const cred of app.iosAppCredentials) {
    console.log(`\n  Credentials ID: ${cred.id}`)
    console.log(`    Bundle ID: ${cred.appleAppIdentifier.bundleIdentifier}`)
    console.log(
      `    Apple Team: ${cred.appleTeam?.appleTeamIdentifier || 'not linked (normal for EAS-managed)'}`
    )
    console.log(`    Build Credentials: ${cred.iosAppBuildCredentialsList.length}`)

    for (const bc of cred.iosAppBuildCredentialsList) {
      console.log(`\n    Build Credentials ID: ${bc.id}`)
      console.log(`      Distribution Type: ${bc.iosDistributionType}`)
      console.log(
        `      Certificate: ${bc.distributionCertificate?.developerPortalIdentifier || 'none'} (${bc.distributionCertificate?.serialNumber || 'none'})`
      )
      if (bc.provisioningProfile) {
        console.log(`      Profile UUID: ${bc.provisioningProfile.appleUUID}`)
        console.log(`      Profile Status: ${bc.provisioningProfile.status}`)
        console.log(`      Profile Expires: ${bc.provisioningProfile.expiration}`)
      } else {
        console.log('      Profile: none (will be auto-generated by EAS Build)')
      }
    }
  }

  return app
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70))
  console.log(' Setup iOS Build Credentials for 1GoShop')
  console.log(' Expo GraphQL API - Non-Interactive')
  console.log('='.repeat(70))
  console.log()
  console.log(`  Project ID:   ${CONFIG.projectId}`)
  console.log(`  Bundle ID:    ${CONFIG.bundleIdentifier}`)
  console.log(`  Apple Team:   ${CONFIG.appleTeamIdentifier}`)
  console.log(`  Dist Cert:    ${CONFIG.distributionCertDeveloperPortalId}`)
  console.log(`  Profile:      ${PROVISIONING_PROFILE_PATH || 'none (EAS will auto-generate)'}`)
  console.log()

  try {
    // Step 1: Verify auth
    const { accountId, accountName } = await verifyAuth()

    // Step 2: Fetch app info
    const app = await fetchAppInfo()

    // Check if credentials already exist
    const existingCred = app.iosAppCredentials.find(
      (c) => c.appleAppIdentifier.bundleIdentifier === CONFIG.bundleIdentifier
    )

    if (existingCred) {
      console.log(
        `\n  iOS App Credentials already exist for ${CONFIG.bundleIdentifier}`
      )

      const hasAppStoreBuildCreds = existingCred.iosAppBuildCredentialsList.some(
        (bc) => bc.iosDistributionType === 'APP_STORE'
      )

      if (hasAppStoreBuildCreds) {
        console.log('  APP_STORE build credentials already configured.')
        console.log('  Nothing to do. Verifying final state...')
        await verifyFinalState()
        console.log('\n  DONE - Credentials are already set up.')
        return
      }

      console.log('  But no APP_STORE build credentials found. Continuing setup...')

      // Step 3-4: Find team and cert (still needed for build credentials)
      const appleTeam = await findAppleTeam(accountName)
      const distCert = await findDistributionCertificate(accountName)

      // Step 7: Upload provisioning profile if provided
      const provProfile = await uploadProvisioningProfile(
        accountId,
        existingCred.appleAppIdentifier.id
      )

      // Step 8: Create build credentials
      await createIosAppBuildCredentials(
        existingCred.id,
        distCert.id,
        provProfile?.id || null
      )

      // Step 9: Verify
      await verifyFinalState()

      console.log('\n  DONE - Build credentials added to existing iOS App Credentials.')
      return
    }

    // Step 3: Find Apple Team
    const appleTeam = await findAppleTeam(accountName)

    // Step 4: Find Distribution Certificate
    const distCert = await findDistributionCertificate(accountName)

    // Step 5: Find or create Apple App Identifier
    const appleAppIdentifier = await findOrCreateAppleAppIdentifier(
      accountId,
      accountName,
      appleTeam.id
    )

    // Step 6: Create iOS App Credentials
    const iosAppCredentials = await createIosAppCredentials(
      app.id,
      appleAppIdentifier.id,
      appleTeam.id
    )

    // Step 7: Upload provisioning profile if provided
    const provProfile = await uploadProvisioningProfile(accountId, appleAppIdentifier.id)

    // Step 8: Create build credentials
    await createIosAppBuildCredentials(
      iosAppCredentials.id,
      distCert.id,
      provProfile?.id || null
    )

    // Step 9: Verify final state
    await verifyFinalState()

    console.log('\n' + '='.repeat(70))
    console.log(' SETUP COMPLETE')
    console.log('='.repeat(70))

    if (!provProfile) {
      console.log('\n  Next Steps:')
      console.log('  1. Run your first iOS build:')
      console.log(
        '     npx eas-cli build --platform ios --profile production --non-interactive'
      )
      console.log(
        '  2. EAS will automatically generate a provisioning profile during the build.'
      )
      console.log(
        '  3. It will use the existing distribution certificate (28T88DA5Q5).'
      )
      console.log(
        '\n  Alternatively, generate a provisioning profile from Apple Developer Portal')
      console.log('  and re-run this script with:')
      console.log(
        '     node scripts/setup-credentials-api.mjs --provisioning-profile <path>'
      )
    } else {
      console.log('\n  All credentials are configured. You can now build:')
      console.log(
        '     npx eas-cli build --platform ios --profile production --non-interactive'
      )
    }
  } catch (error) {
    console.error('\n  ERROR:', error.message)

    if (error.message.includes('Authentication failed')) {
      console.error('\n  Your Expo session may have expired.')
      console.error('  Run: npx expo login')
      console.error('  Then update the sessionSecret in this script or ~/.expo/state.json')
    }

    process.exit(1)
  }
}

main()
