#!/usr/bin/env tsx

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

interface FileUpdate {
  file: string
  originalContent: string
  updatedContent: string
  changes: number
}

// Common return type mappings based on function names and patterns
const RETURN_TYPE_PATTERNS = {
  // Service methods
  create: 'Promise<T>',
  update: 'Promise<T>',
  delete: 'Promise<void>',
  remove: 'Promise<void>',
  get: 'Promise<T | null>',
  find: 'Promise<T[]>',
  list: 'Promise<{ data: T[], total: number }>',
  count: 'Promise<number>',
  exists: 'Promise<boolean>',
  validate: 'Promise<boolean>',
  check: 'Promise<boolean>',
  has: 'Promise<boolean>',
  save: 'Promise<T>',
  
  // Auth methods
  login: 'Promise<{ user: any, session?: any }>',
  logout: 'Promise<void>',
  authenticate: 'Promise<boolean>',
  authorize: 'Promise<boolean>',
  
  // API route handlers
  GET: 'Promise<NextResponse>',
  POST: 'Promise<NextResponse>',
  PUT: 'Promise<NextResponse>',
  DELETE: 'Promise<NextResponse>',
  PATCH: 'Promise<NextResponse>',
  
  // Test functions
  test: 'Promise<void>',
  setup: 'Promise<void>',
  teardown: 'Promise<void>',
  beforeAll: 'Promise<void>',
  afterAll: 'Promise<void>',
  beforeEach: 'Promise<void>',
  afterEach: 'Promise<void>',
}

function inferReturnType(functionName: string, fileContent: string, lineIndex: number): string {
  const lines = fileContent.split('\n')
  
  // Check for specific patterns
  for (const [pattern, returnType] of Object.entries(RETURN_TYPE_PATTERNS)) {
    if (functionName.toLowerCase().includes(pattern.toLowerCase())) {
      // Special handling for generic types
      if (returnType.includes('T')) {
        // Try to infer the actual type from the function body
        const functionBody = extractFunctionBody(lines, lineIndex)
        const inferredType = inferTypeFromBody(functionBody, functionName)
        if (inferredType) {
          return returnType.replace('T', inferredType)
        }
      }
      return returnType
    }
  }
  
  // Try to infer from function body
  const functionBody = extractFunctionBody(lines, lineIndex)
  const inferredType = inferTypeFromBody(functionBody, functionName)
  
  return inferredType || 'Promise<unknown>'
}

function extractFunctionBody(lines: string[], startIndex: number): string {
  let body = ''
  let braceCount = 0
  let started = false
  
  for (let i = startIndex; i < lines.length && i < startIndex + 100; i++) {
    const line = lines[i]
    
    if (line.includes('{')) {
      started = true
      braceCount += (line.match(/{/g) || []).length
    }
    
    if (started) {
      body += line + '\n'
    }
    
    if (line.includes('}')) {
      braceCount -= (line.match(/}/g) || []).length
      if (braceCount === 0 && started) {
        break
      }
    }
  }
  
  return body
}

function inferTypeFromBody(body: string, functionName: string): string | null {
  // Check for explicit return statements
  const returnMatches = body.matchAll(/return\s+([^;]+)/g)
  const returnTypes = new Set<string>()
  
  for (const match of returnMatches) {
    const returnStatement = match[1].trim()
    
    // Common patterns
    if (returnStatement === 'null') returnTypes.add('null')
    else if (returnStatement === 'undefined') returnTypes.add('void')
    else if (returnStatement === 'true' || returnStatement === 'false') returnTypes.add('boolean')
    else if (returnStatement.match(/^\d+$/)) returnTypes.add('number')
    else if (returnStatement.match(/^["'`]/)) returnTypes.add('string')
    else if (returnStatement.includes('NextResponse.json')) returnTypes.add('NextResponse')
    else if (returnStatement.includes('[]')) returnTypes.add('any[]')
    else if (returnStatement.includes('{}')) returnTypes.add('Record<string, any>')
    else if (returnStatement.includes('prisma.') && returnStatement.includes('.create')) {
      const model = returnStatement.match(/prisma\.(\w+)\.create/)?.[1]
      if (model) returnTypes.add(capitalize(model))
    }
    else if (returnStatement.includes('prisma.') && returnStatement.includes('.findMany')) {
      const model = returnStatement.match(/prisma\.(\w+)\.findMany/)?.[1]
      if (model) returnTypes.add(`${capitalize(model)}[]`)
    }
    else if (returnStatement.includes('prisma.') && returnStatement.includes('.findUnique')) {
      const model = returnStatement.match(/prisma\.(\w+)\.findUnique/)?.[1]
      if (model) returnTypes.add(`${capitalize(model)} | null`)
    }
    else if (returnStatement.includes('prisma.') && returnStatement.includes('.count')) {
      returnTypes.add('number')
    }
  }
  
  // If we have return types, combine them
  if (returnTypes.size > 0) {
    const types = Array.from(returnTypes)
    if (types.length === 1) {
      return `Promise<${types[0]}>`
    } else {
      return `Promise<${types.join(' | ')}>`
    }
  }
  
  // Check if it's a void function (no return statements)
  if (!body.includes('return')) {
    return 'Promise<void>'
  }
  
  return null
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function fixAsyncReturnTypes(filePath: string): Promise<FileUpdate | null> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  let updatedLines = [...lines]
  let changes = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Pattern 1: async function declarations without return type
    const asyncFuncMatch = line.match(/^(\s*)((?:export\s+)?async\s+function\s+)(\w+)(\s*\([^)]*\))(\s*)\{/)
    if (asyncFuncMatch && !line.includes(':') && !line.includes('Promise<')) {
      const [, indent, prefix, funcName, params, space] = asyncFuncMatch
      const returnType = inferReturnType(funcName, content, i)
      updatedLines[i] = `${indent}${prefix}${funcName}${params}: ${returnType}${space}{`
      changes++
      continue
    }
    
    // Pattern 2: async method declarations without return type
    const asyncMethodMatch = line.match(/^(\s*)(async\s+)(\w+)(\s*\([^)]*\))(\s*)\{/)
    if (asyncMethodMatch && !line.includes(':') && !line.includes('Promise<') && !line.includes('function')) {
      const [, indent, asyncKeyword, methodName, params, space] = asyncMethodMatch
      const returnType = inferReturnType(methodName, content, i)
      updatedLines[i] = `${indent}${asyncKeyword}${methodName}${params}: ${returnType}${space}{`
      changes++
      continue
    }
    
    // Pattern 3: arrow functions assigned to variables
    const arrowFuncMatch = line.match(/^(\s*)((?:export\s+)?const\s+)(\w+)(\s*=\s*async\s*)(\([^)]*\))(\s*=>\s*)\{/)
    if (arrowFuncMatch && !line.includes(':') && !line.includes('Promise<')) {
      const [, indent, prefix, varName, asyncPart, params, arrow] = arrowFuncMatch
      const returnType = inferReturnType(varName, content, i)
      updatedLines[i] = `${indent}${prefix}${varName}: ${params} => ${returnType}${asyncPart.trim()}${params}${arrow}{`
      changes++
      continue
    }
    
    // Pattern 4: API route handlers
    const routeHandlerMatch = line.match(/^(export\s+async\s+function\s+)(GET|POST|PUT|DELETE|PATCH)(\s*\([^)]*\))(\s*)\{/)
    if (routeHandlerMatch && !lines[i].includes('Promise<NextResponse>') && !lines[i+1]?.includes('Promise<NextResponse>')) {
      const [, prefix, method, params, space] = routeHandlerMatch
      updatedLines[i] = `${prefix}${method}${params}: Promise<NextResponse>${space}{`
      changes++
    }
  }
  
  if (changes === 0) {
    return null
  }
  
  return {
    file: filePath,
    originalContent: content,
    updatedContent: updatedLines.join('\n'),
    changes
  }
}

async function main() {
  console.log('🔧 Starting automated async return type fixes...\n')
  
  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '.turbo/**',
      'scripts/fix-async-types-automated.ts',
      'scripts/fix-async-return-types.ts'
    ]
  })
  
  console.log(`Found ${files.length} TypeScript files to process`)
  
  const updates: FileUpdate[] = []
  const errors: { file: string, error: Error }[] = []
  
  // Process files in batches to avoid overwhelming the system
  const BATCH_SIZE = 10
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    
    await Promise.all(
      batch.map(async (file) => {
        try {
          const update = await fixAsyncReturnTypes(file)
          if (update) {
            updates.push(update)
          }
        } catch (error) {
          errors.push({ file, error: error as Error })
        }
      })
    )
    
    // Show progress
    if ((i + BATCH_SIZE) % 100 === 0) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, files.length)} / ${files.length} files...`)
    }
  }
  
  console.log(`\n✅ Found ${updates.length} files requiring updates`)
  
  if (errors.length > 0) {
    console.log(`\n❌ Encountered ${errors.length} errors:`)
    errors.slice(0, 5).forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error.message}`)
    })
    if (errors.length > 5) {
      console.log(`  ... and ${errors.length - 5} more`)
    }
  }
  
  // Apply updates
  if (updates.length > 0) {
    console.log('\n📝 Applying updates...')
    
    let successCount = 0
    for (const update of updates) {
      try {
        await fs.writeFile(update.file, update.updatedContent)
        successCount++
      } catch (error) {
        console.error(`Failed to update ${update.file}:`, error)
      }
    }
    
    console.log(`\n✅ Successfully updated ${successCount} files`)
    
    // Show summary of changes
    console.log('\n📊 Summary of changes:')
    const byDirectory = new Map<string, number>()
    
    for (const update of updates) {
      const dir = path.dirname(update.file).split('/')[0]
      byDirectory.set(dir, (byDirectory.get(dir) || 0) + update.changes)
    }
    
    const sorted = Array.from(byDirectory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    for (const [dir, count] of sorted) {
      console.log(`  ${dir}: ${count} fixes`)
    }
  }
  
  // Generate detailed report
  const reportPath = path.join(process.cwd(), 'ASYNC_TYPE_FIXES_APPLIED.md')
  let report = `# Async Return Type Fixes Applied

Generated on: ${new Date().toISOString()}

Total files updated: ${updates.length}
Total fixes applied: ${updates.reduce((sum, u) => sum + u.changes, 0)}

## Files Updated

`

  for (const update of updates.slice(0, 50)) {
    report += `- **${update.file}** (${update.changes} fixes)\n`
  }
  
  if (updates.length > 50) {
    report += `\n... and ${updates.length - 50} more files\n`
  }
  
  await fs.writeFile(reportPath, report)
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
}

main().catch(console.error)