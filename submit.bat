@echo off
cd /d c:\Users\robert.matray\1goshop
set EXPO_ASC_API_KEY_PATH=./internals/appstore-api/AuthKey_79PJWGG49Z.p8
set EXPO_ASC_KEY_ID=79PJWGG49Z
set EXPO_ASC_ISSUER_ID=69a6de87-7e92-47e3-e053-5b8c7c11a4d1
set EXPO_APPLE_TEAM_ID=U5Q2UN4QKJ
set EXPO_APPLE_TEAM_TYPE=INDIVIDUAL
npx eas-cli submit --platform ios --latest --non-interactive
