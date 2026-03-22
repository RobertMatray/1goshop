#!/usr/bin/env node
/**
 * Deploy website to FTP with auto-synced version from app.config.ts.
 * Usage: node scripts/deploy-website.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// 1. Read version from app.config.ts
const config = readFileSync('app.config.ts', 'utf8')
const match = config.match(/version:\s*['"]([^'"]+)['"]/)
if (!match) {
  console.error('Could not find version in app.config.ts')
  process.exit(1)
}
const version = match[1]
console.log(`Version from app.config.ts: ${version}`)

// 2. Update version badge in index.html
const htmlPath = 'website/index.html'
let html = readFileSync(htmlPath, 'utf8')
const updated = html.replace(
  /<span class="version-badge">v[^<]+<\/span>/,
  `<span class="version-badge">v${version}</span>`,
)
if (updated === html) {
  console.log('Version badge already up to date or not found')
} else {
  writeFileSync(htmlPath, updated)
  console.log(`Updated version badge to v${version}`)
}

// 3. Upload to FTP
console.log('Uploading to FTP...')
try {
  execSync(
    `curl --ftp-pasv -T website/index.html ftp://ftp.realise.sk/_sub/1goshop/ --user "realise:qawsedQAWSED123"`,
    { stdio: 'inherit' },
  )
  console.log('Website deployed successfully!')
} catch (e) {
  console.error('FTP upload failed:', e.message)
  process.exit(1)
}
