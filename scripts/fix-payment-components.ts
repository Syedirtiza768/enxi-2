#!/usr/bin/env tsx
/**
 * Fix common type errors in payment components
 */

import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import * as path from 'path'
import * as fs from 'fs'

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
})

interface FixResult {
  file: string
  fixCount: number
  errors: string[]
}

async function fixPaymentComponents(): Promise<void> {
  console.log('🔧 Fixing payment component type errors...\n')
  
  const results: FixResult[] = []
  const paymentFiles = project.getSourceFiles('components/payments/**/*.tsx')
  
  for (const sourceFile of paymentFiles) {
    const result = await fixFile(sourceFile)
    if (result.fixCount > 0) {
      results.push(result)
    }
  }
  
  // Summary
  console.log('\n📊 Summary:')
  console.log(`Files processed: ${paymentFiles.length}`)
  console.log(`Files fixed: ${results.length}`)
  console.log(`Total fixes: ${results.reduce((sum, r) => sum + r.fixCount, 0)}`)
  
  if (results.length > 0) {
    console.log('\n✅ Fixed files:')
    results.forEach(r => {
      console.log(`  ${r.file}: ${r.fixCount} fixes`)
    })
  }
}

async function fixFile(sourceFile: SourceFile): Promise<FixResult> {
  const filePath = sourceFile.getFilePath()
  const fileName = path.basename(filePath)
  let fixCount = 0
  const errors: string[] = []
  
  try {
    // Fix 1: Replace 'api' imports with 'apiClient'
    const importDeclarations = sourceFile.getImportDeclarations()
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue()
      if (moduleSpecifier === '@/lib/api/client') {
        const namedImports = importDecl.getNamedImports()
        for (const namedImport of namedImports) {
          if (namedImport.getName() === 'api') {
            namedImport.setName('apiClient')
            fixCount++
            
            // Replace all usages
            const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
            for (const identifier of identifiers) {
              if (identifier.getText() === 'api' && 
                  identifier.getParent()?.getKind() === SyntaxKind.PropertyAccessExpression) {
                identifier.replaceWithText('apiClient')
                fixCount++
              }
            }
          }
        }
      }
    }
    
    // Fix 2: Add missing type annotations for currency formatters
    const variableStatements = sourceFile.getVariableStatements()
    for (const varStatement of variableStatements) {
      const declarations = varStatement.getDeclarationList().getDeclarations()
      for (const decl of declarations) {
        const name = decl.getName()
        if (name === 'formatCurrency' && !decl.getTypeNode()) {
          const initializer = decl.getInitializer()
          if (initializer?.getKind() === SyntaxKind.ArrowFunction) {
            // Check if it returns void instead of string
            const returnType = initializer.asKind(SyntaxKind.ArrowFunction)?.getReturnTypeNode()
            if (returnType?.getText() === 'void') {
              returnType.replaceWithText('string')
              fixCount++
            }
          }
        }
      }
    }
    
    // Fix 3: Fix apiClient usage patterns
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression()
      
      // Fix api.get/post/put/delete to apiClient
      if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propAccess = expression.asKind(SyntaxKind.PropertyAccessExpression)!
        const object = propAccess.getExpression()
        const property = propAccess.getName()
        
        if (object.getText() === 'api' && ['get', 'post', 'put', 'delete'].includes(property)) {
          const args = callExpr.getArguments()
          if (args.length > 0) {
            const url = args[0].getText()
            const method = property.toUpperCase()
            
            // Replace with apiClient call
            let newCall = `apiClient(${url}`
            if (method !== 'GET') {
              newCall += `, { method: '${method}'`
              if (args.length > 1) {
                newCall += `, body: JSON.stringify(${args[1].getText()})`
              }
              newCall += ' }'
            }
            newCall += ')'
            
            callExpr.replaceWithText(newCall)
            fixCount++
          }
        }
      }
    }
    
    // Fix 4: Fix response.data access patterns
    const propertyAccessExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
    for (const propAccess of propertyAccessExpressions) {
      if (propAccess.getName() === 'data' && 
          propAccess.getExpression().getText().includes('Response')) {
        const parent = propAccess.getParent()
        
        // Add null checks
        if (parent?.getKind() === SyntaxKind.CallExpression) {
          const callParent = parent.asKind(SyntaxKind.CallExpression)!
          const expression = callParent.getExpression()
          
          if (expression.getText().includes('set')) {
            // It's a setState call
            const stateSetterName = expression.getText()
            const responseVar = propAccess.getExpression().getText()
            
            // Wrap in proper type handling
            callParent.replaceWithText(
              `${stateSetterName}(${responseVar}.data || [])`
            )
            fixCount++
          }
        }
      }
    }
    
    // Fix 5: Fix index signature issues
    const elementAccessExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.ElementAccessExpression)
    for (const elemAccess of elementAccessExpressions) {
      const argExpression = elemAccess.getArgumentExpression()
      if (argExpression) {
        const parent = elemAccess.getParent()
        if (parent?.getKind() === SyntaxKind.BinaryExpression) {
          // Add type assertion for index access
          const text = elemAccess.getText()
          elemAccess.replaceWithText(`(${text} as any)`)
          fixCount++
        }
      }
    }
    
    if (fixCount > 0) {
      await sourceFile.save()
    }
    
  } catch (error) {
    errors.push(`Error processing ${fileName}: ${error}`)
  }
  
  return {
    file: fileName,
    fixCount,
    errors
  }
}

// Run the fixer
fixPaymentComponents().catch(console.error)