#!/usr/bin/env -S npx tsx

/**
 * Script to find and fix unsafe object access patterns
 * This script will:
 * 1. Search for patterns like obj.prop without null checks
 * 2. Look for direct nested property access (a.b.c)
 * 3. Fix by adding optional chaining (?.)
 * 4. Add null checks where needed
 * 5. Add default values for safety
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { execSync } from 'child_process'

// Patterns to find unsafe object access
const UNSAFE_PATTERNS = [
  // Direct nested property access without optional chaining
  /(\w+)\.(\w+)\.(\w+)(?!\?)/g,
  // Array access without bounds checking
  /\[(\d+)\]\.(\w+)/g,
  // Find statements without null checks
  /\.find\([^)]+\)\.(\w+)/g,
  // Filter/map/reduce without null checks on results
  /\.(filter|map|reduce)\([^)]+\)\.(\w+)/g,
]

// Files to skip
const SKIP_FILES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'prisma/prisma',
  'coverage',
  'public',
  'scripts/fix-unsafe-object-access.ts', // Skip this file
]

// File extensions to process
const VALID_EXTENSIONS = ['.ts', '.tsx']

interface UnsafeAccess {
  file: string
  line: number
  column: number
  code: string
  suggestion: string
}

function shouldSkipPath(path: string): boolean {
  return SKIP_FILES.some(skip => path.includes(skip))
}

function findUnsafeAccess(filePath: string): UnsafeAccess[] {
  if (shouldSkipPath(filePath)) return []

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const unsafeAccesses: UnsafeAccess[] = []

    lines.forEach((line, lineIndex) => {
      // Skip comments and strings
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
      
      // Pattern 1: Direct nested property access without optional chaining
      const nestedAccessRegex = /(\w+)\.(\w+)\.(\w+)(?!\?)/g
      let match
      while ((match = nestedAccessRegex.exec(line)) !== null) {
        const [fullMatch, obj, prop1, prop2] = match
        
        // Skip if already has optional chaining
        if (line.includes(`${obj}?.${prop1}`) || line.includes(`${prop1}?.${prop2}`)) continue
        
        // Skip common safe patterns
        if (obj === 'console' || obj === 'process' || obj === 'Math' || obj === 'Date') continue
        if (obj === 'React' || obj === 'useState' || obj === 'useEffect') continue
        if (obj.startsWith('_') || obj === 'prisma') continue
        
        unsafeAccesses.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          code: line.trim(),
          suggestion: line.replace(fullMatch, `${obj}?.${prop1}?.${prop2}`)
        })
      }

      // Pattern 2: Array access without bounds checking
      const arrayAccessRegex = /(\w+)\[(\d+)\]\.(\w+)/g
      while ((match = arrayAccessRegex.exec(line)) !== null) {
        const [fullMatch, array, index, prop] = match
        
        unsafeAccesses.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          code: line.trim(),
          suggestion: line.replace(fullMatch, `${array}[${index}]?.${prop}`)
        })
      }

      // Pattern 3: Find without null check
      const findRegex = /(\w+)\.find\(([^)]+)\)\.(\w+)/g
      while ((match = findRegex.exec(line)) !== null) {
        const [fullMatch, obj, predicate, prop] = match
        
        unsafeAccesses.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          code: line.trim(),
          suggestion: line.replace(fullMatch, `${obj}.find(${predicate})?.${prop}`)
        })
      }

      // Pattern 4: Direct property access after method calls
      const methodChainRegex = /\.(filter|map|reduce|some|every)\([^)]+\)\.(\w+)(?!\?)/g
      while ((match = methodChainRegex.exec(line)) !== null) {
        const [fullMatch] = match
        
        // Skip if it's array method chaining (common and safe)
        if (fullMatch.includes('.length') || fullMatch.includes('.forEach')) continue
        
        unsafeAccesses.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          code: line.trim(),
          suggestion: 'Consider adding null check or optional chaining'
        })
      }
    })

    return unsafeAccesses
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error)
    return []
  }
}

function findAllFiles(dir: string, files: string[] = []): string[] {
  if (shouldSkipPath(dir)) return files

  try {
    const items = readdirSync(dir)
    
    for (const item of items) {
      const fullPath = join(dir, item)
      
      if (shouldSkipPath(fullPath)) continue
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        findAllFiles(fullPath, files)
      } else if (stat.isFile() && VALID_EXTENSIONS.includes(extname(fullPath))) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
  
  return files
}

function fixUnsafeAccess(unsafeAccess: UnsafeAccess): boolean {
  try {
    const content = readFileSync(unsafeAccess.file, 'utf-8')
    const lines = content.split('\n')
    const lineIndex = unsafeAccess.line - 1
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      // Apply the suggestion if it's not just a message
      if (!unsafeAccess.suggestion.startsWith('Consider')) {
        lines[lineIndex] = unsafeAccess.suggestion
        writeFileSync(unsafeAccess.file, lines.join('\n'))
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error(`Error fixing file ${unsafeAccess.file}:`, error)
    return false
  }
}

async function main(): Promise<any[]> {
  console.log('🔍 Searching for unsafe object access patterns...\n')
  
  // Get all TypeScript files
  const files = findAllFiles(process.cwd())
  console.log(`Found ${files.length} TypeScript files to analyze\n`)
  
  // Find all unsafe accesses
  let totalUnsafeAccesses: UnsafeAccess[] = []
  
  for (const file of files) {
    const unsafeAccesses = findUnsafeAccess(file)
    if (unsafeAccesses.length > 0) {
      totalUnsafeAccesses = totalUnsafeAccesses.concat(unsafeAccesses)
    }
  }
  
  if (totalUnsafeAccesses.length === 0) {
    console.log('✅ No unsafe object access patterns found!')
    return
  }
  
  console.log(`\n⚠️  Found ${totalUnsafeAccesses.length} unsafe object access patterns:\n`)
  
  // Group by file for better readability
  const byFile = totalUnsafeAccesses.reduce((acc, item) => {
    if (!acc[item.file]) acc[item.file] = []
    acc[item.file].push(item)
    return acc
  }, {} as Record<string, UnsafeAccess[]>)
  
  // Display findings
  for (const [file, accesses] of Object.entries(byFile)) {
    console.log(`\n📄 ${file.replace(process.cwd(), '.')}`)
    for (const access of accesses) {
      console.log(`  Line ${access.line}: ${access.code}`)
      if (!access.suggestion.startsWith('Consider')) {
        console.log(`    ➡️  ${access.suggestion.trim()}`)
      } else {
        console.log(`    ⚠️  ${access.suggestion}`)
      }
    }
  }
  
  // Ask for confirmation to fix
  console.log('\n')
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  
  const answer = await new Promise<string>((resolve) => {
    readline.question('Do you want to automatically fix these issues? (y/n): ', resolve)
  })
  
  readline.close()
  
  if (answer.toLowerCase() === 'y') {
    console.log('\n🔧 Fixing unsafe object access patterns...\n')
    
    let fixedCount = 0
    for (const access of totalUnsafeAccesses) {
      if (fixUnsafeAccess(access)) {
        fixedCount++
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} unsafe object access patterns!`)
    
    // Run prettier to format the fixed files
    console.log('\n🎨 Running prettier to format fixed files...')
    try {
      execSync('npm run format', { stdio: 'inherit' })
    } catch (error) {
      console.log('⚠️  Could not run prettier. Please format manually.')
    }
  } else {
    console.log('\n❌ Operation cancelled.')
  }
}

// Run the script
main().catch(console.error)