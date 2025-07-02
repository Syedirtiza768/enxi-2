#!/usr/bin/env ts-node
/**
 * Automated script to fix common type errors in the codebase
 * Run with: npx ts-node scripts/fix-common-type-errors.ts
 */

import { Project, SyntaxKind, Node, SourceFile } from 'ts-morph'
import * as path from 'path'
import * as fs from 'fs'

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
})

interface FixResult {
  file: string
  fixes: string[]
  errors: string[]
}

const results: FixResult[] = []

/**
 * Fix 1: Replace 'any' types with 'unknown' or specific types
 */
function fixAnyTypes(sourceFile: SourceFile): string[] {
  const fixes: string[] = []
  
  sourceFile.getDescendantsOfKind(SyntaxKind.AnyKeyword).forEach((node) => {
    const parent = node.getParent()
    
    // Skip if it's in a type assertion or external module
    if (parent?.getKind() === SyntaxKind.TypeAssertionExpression) return
    
    // For function parameters, try to infer from usage
    if (parent?.getKind() === SyntaxKind.Parameter) {
      const param = parent.asKindOrThrow(SyntaxKind.Parameter)
      const func = param.getParentIfKindOrThrow(SyntaxKind.FunctionDeclaration)
      
      // For now, just replace with unknown
      node.replaceWithText('unknown')
      fixes.push(`Replaced 'any' with 'unknown' in parameter: ${param.getName()}`)
    } else {
      node.replaceWithText('unknown')
      fixes.push(`Replaced 'any' with 'unknown' at line ${node.getStartLineNumber()}`)
    }
  })
  
  return fixes
}

/**
 * Fix 2: Add missing return types to functions
 */
function addMissingReturnTypes(sourceFile: SourceFile): string[] {
  const fixes: string[] = []
  
  sourceFile.getFunctions().forEach((func) => {
    if (!func.getReturnTypeNode()) {
      const returnType = func.getReturnType().getText()
      
      // Skip if return type is complex or generic
      if (returnType.includes('<') || returnType.length > 50) {
        func.setReturnType('unknown')
        fixes.push(`Added return type 'unknown' to function: ${func.getName()}`)
      } else {
        func.setReturnType(returnType)
        fixes.push(`Added return type '${returnType}' to function: ${func.getName()}`)
      }
    }
  })
  
  // Also fix arrow functions
  sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction).forEach((arrow) => {
    if (!arrow.getReturnTypeNode()) {
      const parent = arrow.getParent()
      
      // Skip if it's a simple callback
      if (parent?.getKind() === SyntaxKind.CallExpression) return
      
      arrow.setReturnType('void')
      fixes.push(`Added return type 'void' to arrow function at line ${arrow.getStartLineNumber()}`)
    }
  })
  
  return fixes
}

/**
 * Fix 3: Fix common Prisma enum mismatches
 */
function fixPrismaEnums(sourceFile: SourceFile): string[] {
  const fixes: string[] = []
  
  const enumMappings: Record<string, string> = {
    'Trade Show': 'TRADE_SHOW',
    'Cold Call': 'COLD_CALL',
    'Partner Referral': 'PARTNER_REFERRAL',
    'Social Media': 'SOCIAL_MEDIA',
    'Referral': 'REFERRAL',
    'Website': 'WEBSITE',
  }
  
  sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach((node) => {
    const value = node.getLiteralValue()
    if (enumMappings[value]) {
      node.replaceWithText(`"${enumMappings[value]}"`)
      fixes.push(`Fixed enum value: "${value}" -> "${enumMappings[value]}"`)
    }
  })
  
  return fixes
}

/**
 * Fix 4: Add missing imports for common types
 */
function addMissingImports(sourceFile: SourceFile): string[] {
  const fixes: string[] = []
  
  // Check if file uses Prisma types without importing
  const hasNextRequest = sourceFile.getText().includes('NextRequest')
  const hasNextRequestImport = sourceFile.getImportDeclarations()
    .some(imp => imp.getModuleSpecifierValue() === 'next/server')
  
  if (hasNextRequest && !hasNextRequestImport) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: 'next/server',
      namedImports: ['NextRequest', 'NextResponse'],
    })
    fixes.push('Added missing import for NextRequest/NextResponse')
  }
  
  return fixes
}

/**
 * Fix 5: Fix async function return types
 */
function fixAsyncReturnTypes(sourceFile: SourceFile): string[] {
  const fixes: string[] = []
  
  sourceFile.getFunctions().forEach((func) => {
    if (func.isAsync()) {
      const returnType = func.getReturnTypeNode()
      if (returnType) {
        const returnTypeText = returnType.getText()
        // If it doesn't have Promise wrapper, add it
        if (!returnTypeText.startsWith('Promise<')) {
          returnType.replaceWithText(`Promise<${returnTypeText}>`)
          fixes.push(`Wrapped return type in Promise for async function: ${func.getName()}`)
        }
      }
    }
  })
  
  return fixes
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Starting automated type error fixes...\n')
  
  const sourceFiles = project.getSourceFiles()
    .filter(file => {
      const filePath = file.getFilePath()
      return !filePath.includes('node_modules') && 
             !filePath.includes('.next') &&
             !filePath.includes('generated') &&
             (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))
    })
  
  console.log(`Found ${sourceFiles.length} source files to process\n`)
  
  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath()
    const relativePath = path.relative(process.cwd(), filePath)
    
    const result: FixResult = {
      file: relativePath,
      fixes: [],
      errors: [],
    }
    
    try {
      // Apply fixes
      result.fixes.push(...fixAnyTypes(sourceFile))
      result.fixes.push(...addMissingReturnTypes(sourceFile))
      result.fixes.push(...fixPrismaEnums(sourceFile))
      result.fixes.push(...addMissingImports(sourceFile))
      result.fixes.push(...fixAsyncReturnTypes(sourceFile))
      
      if (result.fixes.length > 0) {
        await sourceFile.save()
        results.push(result)
        console.log(`✅ ${relativePath}: ${result.fixes.length} fixes applied`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      results.push(result)
      console.error(`❌ ${relativePath}: ${errorMessage}`)
    }
  }
  
  // Generate report
  generateReport()
}

function generateReport() {
  console.log('\n📊 Summary Report\n')
  
  const totalFixes = results.reduce((sum, r) => sum + r.fixes.length, 0)
  const filesWithFixes = results.filter(r => r.fixes.length > 0).length
  const filesWithErrors = results.filter(r => r.errors.length > 0).length
  
  console.log(`Total files processed: ${results.length}`)
  console.log(`Files with fixes applied: ${filesWithFixes}`)
  console.log(`Total fixes applied: ${totalFixes}`)
  console.log(`Files with errors: ${filesWithErrors}`)
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.length,
      filesFixed: filesWithFixes,
      totalFixes,
      filesWithErrors,
    },
    details: results,
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'type-fixes-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log('\n📄 Detailed report saved to: type-fixes-report.json')
  console.log('\n⚠️  Please run "npm run type-check" to see remaining errors')
}

// Run the script
main().catch(console.error)