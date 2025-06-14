#!/usr/bin/env tsx

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

interface FixedFile {
  file: string
  changes: number
}

async function fixArrowFunctionSyntax(): Promise<FixedFile[]> {
  const fixedFiles: FixedFile[] = []
  
  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '.turbo/**',
      'scripts/fix-arrow-function-syntax.ts'
    ]
  })

  console.log(`Checking ${files.length} files for malformed arrow function syntax...`)

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      let updatedContent = content
      let changes = 0

      // Fix pattern: const funcName: () => Promise<Type>= async() => {
      // Should be: const funcName = async (): Promise<Type> => {
      const arrowFunctionRegex = /(\s+const\s+\w+):\s*\(\)\s*=>\s*(Promise<[^>]+>)=\s*async\(\)\s*=>\s*\{/g

      updatedContent = updatedContent.replace(arrowFunctionRegex, (match, funcDecl, promiseType) => {
        changes++
        return `${funcDecl} = async (): ${promiseType} => {`
      })

      // Fix pattern for function expressions: funcName: () => Promise<Type>= async() => {
      const functionExpressionRegex = /(\s+\w+):\s*\(\)\s*=>\s*(Promise<[^>]+>)=\s*async\(\)\s*=>\s*\{/g
      
      updatedContent = updatedContent.replace(functionExpressionRegex, (match, funcName, promiseType) => {
        changes++
        return `${funcName} = async (): ${promiseType} => {`
      })

      // Fix specific patterns like Promise<Promise<T>>
      const doublePromiseRegex = /Promise<(Promise<[^>]+>)>/g
      updatedContent = updatedContent.replace(doublePromiseRegex, (match, innerPromise) => {
        changes++
        return innerPromise
      })

      if (changes > 0) {
        await fs.writeFile(file, updatedContent)
        fixedFiles.push({ file, changes })
        console.log(`Fixed ${changes} issues in ${file}`)
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
    }
  }

  return fixedFiles
}

async function main() {
  console.log('🔧 Fixing malformed arrow function syntax...\n')
  
  const fixedFiles = await fixArrowFunctionSyntax()
  
  if (fixedFiles.length === 0) {
    console.log('✅ No issues found!')
  } else {
    console.log(`\n✅ Fixed syntax issues in ${fixedFiles.length} files`)
    
    const totalChanges = fixedFiles.reduce((sum, file) => sum + file.changes, 0)
    console.log(`📊 Total fixes applied: ${totalChanges}`)
    
    // Show summary
    console.log('\n📝 Files modified:')
    fixedFiles.forEach(({ file, changes }) => {
      console.log(`  ${file}: ${changes} fixes`)
    })
  }
}

main().catch(console.error)