import { spawn } from 'node-pty';
import path from 'path';

const projectDir = path.resolve('.');
console.log('Starting EAS Android build in:', projectDir);

const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
const args = process.platform === 'win32'
  ? ['/c', 'npx eas-cli build --platform android --profile production']
  : ['-c', 'npx eas-cli build --platform android --profile production'];

const ptyProcess = spawn(shell, args, {
  name: 'xterm-color',
  cols: 120,
  rows: 30,
  cwd: projectDir,
  env: { ...process.env, FORCE_COLOR: '1' },
});

let output = '';

ptyProcess.onData((data) => {
  output += data;
  process.stdout.write(data);

  // Auto-answer "Generate a new Android Keystore?" with yes
  if (data.includes('Generate a new Android Keystore')) {
    setTimeout(() => {
      console.log('\n>>> AUTO-ANSWERING: y');
      ptyProcess.write('y\r');
    }, 1000);
  }

  // Auto-answer billing warning
  if (data.includes('pay-as-you-go') && data.includes('?')) {
    setTimeout(() => {
      console.log('\n>>> AUTO-ANSWERING: y');
      ptyProcess.write('y\r');
    }, 1000);
  }
});

ptyProcess.onExit(({ exitCode }) => {
  console.log(`\nProcess exited with code: ${exitCode}`);

  // Extract build URL if present
  const buildUrlMatch = output.match(/https:\/\/expo\.dev\/accounts\/[^\s]+\/builds\/[a-f0-9-]+/);
  if (buildUrlMatch) {
    console.log('\nBuild URL:', buildUrlMatch[0]);
  }

  process.exit(exitCode);
});
