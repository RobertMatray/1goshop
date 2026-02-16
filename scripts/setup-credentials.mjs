import { spawn } from 'child_process'

const env = {
  ...process.env,
  EXPO_ASC_API_KEY_PATH: './internals/appstore-api/AuthKey_79PJWGG49Z.p8',
  EXPO_ASC_KEY_ID: '79PJWGG49Z',
  EXPO_ASC_ISSUER_ID: '69a6de87-7e92-47e3-e053-5b8c7c11a4d1',
  EXPO_APPLE_TEAM_ID: 'U5Q2UN4QKJ',
  EXPO_APPLE_TEAM_TYPE: 'INDIVIDUAL',
}

const child = spawn('npx', ['eas-cli', 'build', '--platform', 'ios', '--profile', 'production'], {
  cwd: process.cwd(),
  env,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
})

let output = ''

child.stdout.on('data', (data) => {
  const text = data.toString()
  output += text
  process.stdout.write(text)

  // Auto-answer prompts
  if (text.includes('Reuse this distribution certificate?') || text.includes('(Y/n)')) {
    console.log('\n>>> Sending: Y')
    child.stdin.write('Y\n')
  }
  if (text.includes('Generate a new Apple Provisioning Profile?') || text.includes('(y/N)')) {
    console.log('\n>>> Sending: Y')
    child.stdin.write('Y\n')
  }
  if (text.includes('Would you like to') && text.includes('?')) {
    console.log('\n>>> Sending: Y')
    child.stdin.write('Y\n')
  }
  if (text.includes('Choose from')) {
    // Select first option
    console.log('\n>>> Sending: 1')
    child.stdin.write('1\n')
  }
})

child.stderr.on('data', (data) => {
  const text = data.toString()
  output += text
  process.stderr.write(text)

  if (text.includes('Reuse') || text.includes('(Y/n)') || text.includes('(y/N)') || text.includes('Would you like')) {
    console.log('\n>>> Sending: Y (stderr)')
    child.stdin.write('Y\n')
  }
})

child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`)
})
