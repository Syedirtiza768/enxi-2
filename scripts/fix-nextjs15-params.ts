#!/usr/bin/env tsx

import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { resolve } from 'path'

async function fixFile(filePath: string) {
  const content = await readFile(filePath, 'utf-8')
  
  // Skip if already fixed
  if (content.includes('params: Promise<{')) {
    console.log(`✓ Already fixed: ${filePath}`)
    return
  }
  
  let modified = content
  
  // Fix function signatures - handle multiline
  modified = modified.replace(
    /export\s+async\s+function\s+(\w+)\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)/g,
    (match, method, request, paramsType) => {
      return `export async function ${method}(${request}, { params }: { params: Promise<{${paramsType}}> })`
    }
  )
  
  // Add await params at the beginning of try blocks
  modified = modified.replace(
    /\)\s*\{\s*try\s*\{/g,
    (match) => {
      const needsAwait = modified.includes('params.') || modified.includes('params[')
      if (needsAwait && !modified.includes('await params')) {
        return match + '\n    const resolvedParams = await params'
      }
      return match
    }
  )
  
  // Replace params.id with resolvedParams.id
  if (modified.includes('const resolvedParams = await params')) {
    modified = modified.replace(/params\./g, 'resolvedParams.')
    modified = modified.replace(/params\[/g, 'resolvedParams[')
  }
  
  if (modified !== content) {
    await writeFile(filePath, modified)
    console.log(`✅ Fixed: ${filePath}`)
  } else {
    console.log(`⚠️  No changes needed: ${filePath}`)
  }
}

async function main(): Promise<void> {
  const appDir = resolve(process.cwd(), 'app')
  
  // Find all route.ts files in dynamic segments
  const files = await glob('**/\\[*\\]/**/route.ts', {
    cwd: appDir,
    absolute: true
  })
  
  console.log(`Found ${files.length} dynamic route files to check...`)
  
  for (const file of files) {
    try {
      await fixFile(file)
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error)
    }
  }
  
  console.log('Done!')
}

main().catch(console.error)