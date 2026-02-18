// Search Apple's API documentation for privacy-related endpoints
const tocUrl = 'https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi.json'
const res = await fetch(tocUrl)
const data = await res.json()
const text = JSON.stringify(data)

const matches = []
const regex = /[A-Za-z_]*(?:privacy|datausage|data_usage|datacollect|nutrition)[A-Za-z_]*/gi
let match
while ((match = regex.exec(text)) !== null) {
  if (!matches.includes(match[0])) matches.push(match[0])
}
console.log('Privacy-related identifiers found in Apple API docs:')
for (const m of matches) {
  console.log('  ' + m)
}

// Also search for specific doc URLs related to privacy
const urlMatches = []
const urlRegex = /doc:\/\/[^"]*(?:privacy|datausage|data-usage)[^"]*/gi
while ((match = urlRegex.exec(text)) !== null) {
  if (!urlMatches.includes(match[0])) urlMatches.push(match[0])
}
console.log('\nPrivacy-related doc URLs:')
for (const u of urlMatches) {
  console.log('  ' + u)
}
