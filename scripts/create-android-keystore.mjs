import fs from 'fs';
import path from 'path';
import os from 'os';

const statePath = path.join(os.homedir(), '.expo/state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const sessionSecret = state.auth?.sessionSecret;
if (!sessionSecret) {
  console.log('No Expo session found');
  process.exit(1);
}
console.log('Expo session found');

const projectId = 'f6744446-31a1-40f5-abe9-77e7dc41a501';
const applicationIdentifier = 'com.robertmatray.onegoshop';

async function checkCredentials() {
  const query = `
    query GetAndroidAppCredentials($projectId: String!, $applicationIdentifier: String!) {
      app {
        byId(appId: $projectId) {
          androidAppCredentials(filter: { applicationIdentifier: $applicationIdentifier }) {
            id
            androidKeystore {
              id
              type
              keyAlias
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'expo-session': sessionSecret,
    },
    body: JSON.stringify({
      query,
      variables: { projectId, applicationIdentifier }
    })
  });
  const data = await res.json();
  console.log('Android credentials:', JSON.stringify(data, null, 2));
  return data;
}

async function createKeystore() {
  // Step 1: Create Android keystore on EAS server
  const createKeystoreMutation = `
    mutation CreateAndroidKeystore($androidAppCredentialsId: ID!) {
      androidAppCredentials {
        createAndroidKeystore(androidAppCredentialsId: $androidAppCredentialsId) {
          id
          type
          keyAlias
        }
      }
    }
  `;

  // First, we need to ensure app credentials exist
  const createAppCredsMutation = `
    mutation CreateAndroidAppCredentials($appId: ID!, $applicationIdentifier: String!) {
      androidAppCredentials {
        createAndroidAppCredentials(
          androidAppCredentialsInput: {
            appId: $appId
            applicationIdentifier: $applicationIdentifier
          }
        ) {
          id
        }
      }
    }
  `;

  // Check if credentials already exist
  const existing = await checkCredentials();
  const creds = existing?.data?.app?.byId?.androidAppCredentials;

  if (creds && creds.length > 0 && creds[0].androidKeystore) {
    console.log('Keystore already exists:', creds[0].androidKeystore);
    return;
  }

  console.log('No keystore found. Attempting to create one via API...');
  console.log('\nNote: EAS CLI needs to generate the keystore interactively.');
  console.log('You need to run this command in a regular terminal:');
  console.log('\n  cd c:\\Users\\robert.matray\\1goshop');
  console.log('  npx eas-cli credentials:configure-build --platform android --profile production');
  console.log('\nOr run the build command:');
  console.log('  npx eas-cli build --platform android --profile production');
  console.log('\nAnd answer "y" when asked "Generate a new Android Keystore?"');
}

createKeystore().catch(e => console.error(e));
