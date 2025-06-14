#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs')
const { glob } = require('glob')
const path = require('path')

async function fixRouteParams() {
  const pattern = '**/app/api/**/*.ts'
  const files = await glob(pattern, {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**']
  })

  let fixedCount = 0

  for (const file of files) {
    const filePath = path.resolve(file)
    let content = readFileSync(filePath, 'utf-8')
    let modified = false

    // Fix context: RouteParams pattern
    if (content.includes('context: RouteParams')) {
      // Replace function signatures
      content = content.replace(
        /export\s+async\s+function\s+(\w+)\s*\(\s*request:\s*NextRequest\s*,\s*context:\s*RouteParams\s*\)/g,
        'export async function $1(request: NextRequest, { params }: { params: Promise<{ id: string }> })'
      )

      // Replace params access
      content = content.replace(
        /const\s+params\s*=\s*await\s+context\.params/g,
        'const { id } = await params'
      )

      // Replace params.id usage
      content = content.replace(/params\.id/g, 'id')

      // Fix any remaining references
      content = content.replace(
        /const\s+resolvedParams\s*=\s*await\s+context\.params/g,
        'const { id } = await params'
      )

      // Replace resolvedParams.id usage
      content = content.replace(/resolvedParams\.id/g, 'id')

      modified = true
    }

    // Fix _user and _request typos
    if (content.includes('_user') || content.includes('_request')) {
      content = content.replace(/_user(?!name)/g, 'user')
      content = content.replace(/_request/g, 'request')
      modified = true
    }

    if (modified) {
      writeFileSync(filePath, content)
      fixedCount++
      console.log(`Fixed: ${file}`)
    }
  }

  console.log(`\nFixed ${fixedCount} files`)
}

fixRouteParams().catch(console.error)