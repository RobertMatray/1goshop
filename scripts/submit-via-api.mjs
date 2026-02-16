import { readFileSync } from 'fs'

const sessionSecret = '{"id":"928c128d-7ef3-4ab2-9d90-86c376de041d","version":1,"expires_at":2080944000000}'
const projectId = 'f6744446-31a1-40f5-abe9-77e7dc41a501'
const buildId = 'ec382662-ec35-4661-ad17-7ea6b376d15e'

// Read the API key
const keyP8 = readFileSync('./internals/appstore-api/AuthKey_79PJWGG49Z.p8', 'utf8')

// Create iOS submission via Expo GraphQL API
// Note: We're NOT providing ascAppIdentifier - EAS should be able to look it up or create it
const mutation = JSON.stringify({
  query: `mutation CreateIosSubmission($input: CreateIosSubmissionInput!) {
    submission {
      createIosSubmission(input: $input) {
        submission {
          id
          status
          platform
        }
      }
    }
  }`,
  variables: {
    input: {
      appId: projectId,
      submittedBuildId: buildId,
      config: {
        ascApiKey: {
          keyP8: keyP8,
          keyIdentifier: '79PJWGG49Z',
          issuerIdentifier: '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
        },
        ascAppIdentifier: '6759269751',
        isVerboseFastlaneEnabled: true
      }
    }
  }
})

console.log('Creating iOS submission via Expo GraphQL API...')

const res = await fetch('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'expo-session': sessionSecret
  },
  body: mutation
})

const d = await res.json()
console.log(JSON.stringify(d, null, 2))

if (d.data?.submission?.createIosSubmission?.submission?.id) {
  const submissionId = d.data.submission.createIosSubmission.submission.id
  console.log('\nSubmission created! ID:', submissionId)
  console.log('Monitoring submission status...')

  // Poll for status
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 10000))

    const statusQuery = JSON.stringify({
      query: `query {
        submission {
          byId(submissionId: "${submissionId}") {
            id
            status
            error {
              message
              errorCode
            }
          }
        }
      }`
    })

    const statusRes = await fetch('https://api.expo.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'expo-session': sessionSecret
      },
      body: statusQuery
    })

    const statusData = await statusRes.json()
    const sub = statusData.data?.submission?.byId
    console.log(`[${new Date().toISOString()}] Status: ${sub?.status}`)

    if (sub?.error) {
      console.log('Error:', sub.error.message, sub.error.errorCode)
    }

    if (['FINISHED', 'ERRORED', 'CANCELED'].includes(sub?.status)) {
      console.log('\nFinal status:', sub?.status)
      break
    }
  }
}
