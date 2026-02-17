Set-Location 'c:\Users\robert.matray\1goshop'
$env:EXPO_ASC_API_KEY_PATH = 'c:\Users\robert.matray\superapp-ai-poc\internals\appstore-api\AuthKey_79PJWGG49Z.p8'
$env:EXPO_ASC_KEY_ID = '79PJWGG49Z'
$env:EXPO_ASC_ISSUER_ID = '69a6de87-7e92-47e3-e053-5b8c7c11a4d1'
$env:EXPO_APPLE_TEAM_ID = 'U5Q2UN4QKJ'
$env:EXPO_APPLE_TEAM_TYPE = 'INDIVIDUAL'
npx eas-cli submit --platform ios --latest --non-interactive
