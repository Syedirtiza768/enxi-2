#!/usr/bin/env tsx
/**
 * Script to systematically fix all service files
 * Ensures they extend BaseService and have proper types
 */

import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import * as path from 'path'
import * as fs from 'fs'

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
})

interface ServiceFixResult {
  file: string
  fixed: boolean
  changes: string[]
  errors: string[]
}

const results: ServiceFixResult[] = []

/**
 * Check if a service class extends BaseService
 */
function extendsBaseService(sourceFile: SourceFile): boolean {
  const classes = sourceFile.getClasses()
  if (classes.length === 0) return false
  
  const mainClass = classes[0]
  const heritage = mainClass.getHeritageClauses()
  
  return heritage.some(clause => 
    clause.getTypeNodes().some(node => 
      node.getText().includes('BaseService')
    )
  )
}

/**
 * Fix service to extend BaseService
 */
function fixServiceExtension(sourceFile: SourceFile): string[] {
  const changes: string[] = []
  
  // Check if BaseService is imported
  const imports = sourceFile.getImportDeclarations()
  const hasBaseServiceImport = imports.some(imp => 
    imp.getModuleSpecifierValue().includes('base.service') &&
    imp.getNamedImports().some(ni => ni.getName() === 'BaseService')
  )
  
  if (!hasBaseServiceImport) {
    // Add import
    const firstImport = imports[0]
    if (firstImport) {
      firstImport.insertBefore(`import { BaseService } from '../base.service'\n`)
    } else {
      sourceFile.insertStatements(0, `import { BaseService } from '../base.service'\n`)
    }
    changes.push('Added BaseService import')
  }
  
  // Fix class declaration
  const classes = sourceFile.getClasses()
  if (classes.length > 0) {
    const mainClass = classes[0]
    const className = mainClass.getName()
    
    if (!extendsBaseService(sourceFile)) {
      mainClass.setExtends('BaseService')
      changes.push(`Made ${className} extend BaseService`)
      
      // Add constructor if missing
      const constructor = mainClass.getConstructors()[0]
      if (!constructor) {
        mainClass.addConstructor({
          statements: `super('${className}')`,
        })
        changes.push('Added constructor with super call')
      } else {
        // Check if super is called
        const superCall = constructor.getStatements().find(s => 
          s.getText().includes('super(')
        )
        if (!superCall) {
          constructor.insertStatements(0, `super('${className}')`)
          changes.push('Added super call to constructor')
        }
      }
    }
  }
  
  return changes
}

/**
 * Fix method return types
 */
function fixMethodReturnTypes(sourceFile: SourceFile): string[] {
  const changes: string[] = []
  const classes = sourceFile.getClasses()
  
  if (classes.length > 0) {
    const mainClass = classes[0]
    const methods = mainClass.getInstanceMethods()
    
    methods.forEach(method => {
      // Skip constructor and private methods
      if (method.getName() === 'constructor' || method.isPrivate()) return
      
      // Check if method has return type
      if (!method.getReturnTypeNode()) {
        const isAsync = method.isAsync()
        const methodName = method.getName()
        
        // Try to infer return type from method body
        let returnType = 'Promise<unknown>'
        
        if (methodName.startsWith('get') || methodName.startsWith('find')) {
          returnType = 'Promise<unknown>'
        } else if (methodName.startsWith('create') || methodName.startsWith('update')) {
          returnType = 'Promise<unknown>'
        } else if (methodName.startsWith('delete')) {
          returnType = 'Promise<void>'
        } else if (methodName.includes('validate') || methodName.includes('check')) {
          returnType = 'Promise<boolean>'
        }
        
        if (!isAsync) {
          returnType = returnType.replace('Promise<', '').replace('>', '')
        }
        
        method.setReturnType(returnType)
        changes.push(`Added return type ${returnType} to method ${methodName}`)
      }
    })
  }
  
  return changes
}

/**
 * Wrap public methods with withLogging
 */
function wrapMethodsWithLogging(sourceFile: SourceFile): string[] {
  const changes: string[] = []
  const classes = sourceFile.getClasses()
  
  if (classes.length > 0 && extendsBaseService(sourceFile)) {
    const mainClass = classes[0]
    const methods = mainClass.getInstanceMethods()
    
    methods.forEach(method => {
      if (method.getName() === 'constructor' || method.isPrivate()) return
      
      const methodName = method.getName()
      const body = method.getBodyText()
      
      // Check if already wrapped
      if (body && !body.includes('this.withLogging')) {
        const parameters = method.getParameters().map(p => p.getText()).join(', ')
        const isAsync = method.isAsync()
        
        const newBody = `
    return this.withLogging('${methodName}', ${isAsync ? 'async ' : ''}() => {
${body}
    })
`
        
        method.setBodyText(newBody)
        changes.push(`Wrapped method ${methodName} with logging`)
      }
    })
  }
  
  return changes
}

/**
 * Process a single service file
 */
async function processServiceFile(sourceFile: SourceFile): Promise<ServiceFixResult> {
  const filePath = sourceFile.getFilePath()
  const relativePath = path.relative(process.cwd(), filePath)
  
  const result: ServiceFixResult = {
    file: relativePath,
    fixed: false,
    changes: [],
    errors: [],
  }
  
  try {
    // Skip base.service.ts and example files
    if (filePath.includes('base.service.ts') || filePath.includes('.example.')) {
      return result
    }
    
    // Apply fixes
    result.changes.push(...fixServiceExtension(sourceFile))
    result.changes.push(...fixMethodReturnTypes(sourceFile))
    
    // Only wrap with logging if it extends BaseService
    if (extendsBaseService(sourceFile)) {
      result.changes.push(...wrapMethodsWithLogging(sourceFile))
    }
    
    if (result.changes.length > 0) {
      await sourceFile.save()
      result.fixed = true
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error))
  }
  
  return result
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Fixing service files...\n')
  
  const serviceFiles = project.getSourceFiles()
    .filter(file => {
      const filePath = file.getFilePath()
      return filePath.includes('/services/') && 
             filePath.endsWith('.service.ts') &&
             !filePath.includes('node_modules')
    })
  
  console.log(`Found ${serviceFiles.length} service files\n`)
  
  for (const file of serviceFiles) {
    const result = await processServiceFile(file)
    results.push(result)
    
    if (result.fixed) {
      console.log(`✅ ${result.file}`)
      result.changes.forEach(change => console.log(`   - ${change}`))
    } else if (result.errors.length > 0) {
      console.log(`❌ ${result.file}`)
      result.errors.forEach(error => console.log(`   - Error: ${error}`))
    }
  }
  
  // Generate summary
  console.log('\n📊 Summary')
  console.log('==========')
  const fixedCount = results.filter(r => r.fixed).length
  const errorCount = results.filter(r => r.errors.length > 0).length
  
  console.log(`Total services: ${results.length}`)
  console.log(`Fixed: ${fixedCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Unchanged: ${results.length - fixedCount - errorCount}`)
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      fixed: fixedCount,
      errors: errorCount,
    },
    details: results.filter(r => r.fixed || r.errors.length > 0),
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'service-fixes-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log('\n📄 Report saved to: service-fixes-report.json')
}

// Run the script
main().catch(console.error)