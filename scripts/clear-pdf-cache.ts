#!/usr/bin/env npx tsx

console.log('🧹 Clearing any potential PDF cache...')

// Note: Since PDFs are generated dynamically, there's no server-side cache
// The issue might be browser cache or CDN cache

console.log('\nTo ensure you get the latest PDF:')
console.log('1. Clear your browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)')
console.log('2. Try opening the PDF URLs in an incognito/private window')
console.log('3. Add a timestamp to the URL: ?view=client&t=' + Date.now())

console.log('\nTest URLs with cache busting:')
const quotationId = 'cmccf4dwo0001v2c981x2a5tm'
const timestamp = Date.now()

console.log(`\nClient View:`)
console.log(`http://localhost:3000/api/quotations/${quotationId}/pdf?view=client&t=${timestamp}`)

console.log(`\nInternal View:`)
console.log(`http://localhost:3000/api/quotations/${quotationId}/pdf?view=internal&t=${timestamp}`)

console.log('\n✅ Done!')