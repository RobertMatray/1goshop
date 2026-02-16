const sessionSecret = '{"id":"928c128d-7ef3-4ab2-9d90-86c376de041d","version":1,"expires_at":2080944000000}'
const submissionId = '9bd1b5d4-1901-482c-9c7f-6fafbf8e63f0'

// First try the submissions list on the app
const projectId = 'f6744446-31a1-40f5-abe9-77e7dc41a501'

const query = JSON.stringify({
  query: `query {
    app {
      byId(appId: "${projectId}") {
        id
        fullName
        submissions(offset: 0, limit: 5, filter: { platform: IOS }) {
          id
          status
          platform
          createdAt
          updatedAt
          completedAt
          error {
            message
            errorCode
          }
          archiveUrl
          logFiles
        }
      }
    }
  }`
})

const res = await fetch('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'expo-session': sessionSecret
  },
  body: query
})

const d = await res.json()
console.log(JSON.stringify(d, null, 2))
