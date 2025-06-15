#!/usr/bin/env tsx
/**
 * Fix API import issues across the codebase
 */

import { Project, SourceFile } from 'ts-morph'
import * as path from 'path'

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
})

async function fixApiImports() {
  console.log('🔧 Fixing API import issues...\n')
  
  const filesToFix = [
    'app/(auth)/dashboard/page.tsx',
    'app/(auth)/leads/page.tsx',
    'app/(auth)/roles/page.tsx',
    'app/(auth)/sales-team/assign/page.tsx',
    'app/(auth)/sales-team/page.tsx',
    'app/(auth)/users/[id]/edit/page.tsx',
    'app/(auth)/users/[id]/page.tsx',
    'app/(auth)/users/new/page.tsx',
    'components/sales-orders/workflow-status.tsx',
    'components/shipments/shipment-detail.tsx',
    'components/shipments/shipment-form.tsx',
    'components/shipments/shipment-list.tsx',
    'components/users/user-edit-form.tsx',
    'components/users/user-list.tsx',
    'components/error/error-boundary.tsx',
  ]
  
  let totalFixes = 0
  
  for (const filePath of filesToFix) {
    const sourceFile = project.getSourceFile(filePath)
    if (!sourceFile) {
      console.log(`⚠️  File not found: ${filePath}`)
      continue
    }
    
    const fixes = await fixFile(sourceFile)
    if (fixes > 0) {
      await sourceFile.save()
      console.log(`✅ Fixed ${filePath} (${fixes} changes)`)
      totalFixes += fixes
    }
  }
  
  console.log(`\n✅ Total fixes applied: ${totalFixes}`)
}

async function fixFile(sourceFile: SourceFile): Promise<number> {
  let fixes = 0
  const filePath = sourceFile.getFilePath()
  
  // Fix imports
  const importDecls = sourceFile.getImportDeclarations()
  for (const importDecl of importDecls) {
    const moduleSpec = importDecl.getModuleSpecifierValue()
    
    if (moduleSpec === '@/lib/api/client') {
      const namedImports = importDecl.getNamedImports()
      
      for (const namedImport of namedImports) {
        if (namedImport.getName() === 'api') {
          // Change 'api' to 'apiClient'
          namedImport.setName('apiClient')
          fixes++
        }
      }
    }
  }
  
  // Fix usage in the file
  const fileText = sourceFile.getText()
  let newText = fileText
  
  // Replace api.get/post/put/delete patterns
  const apiMethodPatterns = [
    { from: /\bapi\.get\(/g, to: 'apiClient(' },
    { from: /\bapi\.post\(/g, to: 'apiClient(' },
    { from: /\bapi\.put\(/g, to: 'apiClient(' },
    { from: /\bapi\.delete\(/g, to: 'apiClient(' },
    { from: /\bapi\.patch\(/g, to: 'apiClient(' },
  ]
  
  for (const pattern of apiMethodPatterns) {
    const matches = newText.match(pattern.from)
    if (matches) {
      newText = newText.replace(pattern.from, pattern.to)
      fixes += matches.length
    }
  }
  
  // Now we need to fix the method calls to include the method in options
  // This is more complex and needs careful handling
  
  // Replace simple GET calls (just URL)
  newText = newText.replace(
    /apiClient\(([^,)]+)\)(?!\.)/g,
    'apiClient($1)'
  )
  
  // Replace POST/PUT/DELETE calls with data
  newText = newText.replace(
    /apiClient\(([^,]+),\s*([^)]+)\)/g,
    (match, url, data) => {
      // Try to determine the method from context
      const lines = sourceFile.getText().split('\n')
      const matchLine = lines.findIndex(line => line.includes(match))
      
      if (matchLine > 0) {
        const prevLines = lines.slice(Math.max(0, matchLine - 5), matchLine).join('\n')
        
        if (prevLines.includes('.post(') || filePath.includes('create') || filePath.includes('new')) {
          return `apiClient(${url}, { method: 'POST', body: JSON.stringify(${data}) })`
        } else if (prevLines.includes('.put(') || filePath.includes('edit') || filePath.includes('update')) {
          return `apiClient(${url}, { method: 'PUT', body: JSON.stringify(${data}) })`
        } else if (prevLines.includes('.delete(')) {
          return `apiClient(${url}, { method: 'DELETE' })`
        }
      }
      
      // Default to POST for calls with data
      return `apiClient(${url}, { method: 'POST', body: JSON.stringify(${data}) })`
    }
  )
  
  // Apply the new text if changes were made
  if (newText !== fileText) {
    sourceFile.replaceWithText(newText)
  }
  
  return fixes
}

// Run the fixer
fixApiImports().catch(console.error)