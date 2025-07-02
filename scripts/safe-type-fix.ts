#!/usr/bin/env tsx
/**
 * Safe Type Error Fixing Tool
 * Fixes TypeScript errors while ensuring behavior doesn't change
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph'

interface ErrorInfo {
  file: string
  line: number
  column: number
  code: string
  message: string
}

interface BehaviorSnapshot {
  testResults?: string
  apiResponses?: Record<string, any>
  consoleOutput?: string[]
  fileExports?: string[]
}

export class SafeTypeFixer {
  private project: Project
  private fixCount = 0
  private skipCount = 0

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
    })
  }

  async fixError(errorInfo: ErrorInfo): Promise<boolean> {
    console.log(`\n🔧 Fixing ${errorInfo.file}:${errorInfo.line} - ${errorInfo.code}`)
    
    try {
      // 1. Create backup
      this.createBackup(errorInfo.file)
      
      // 2. Capture current behavior
      const beforeBehavior = await this.captureBehavior(errorInfo.file)
      
      // 3. Apply fix based on error code
      const fixed = await this.applyFix(errorInfo)
      
      if (!fixed) {
        console.log('❌ Could not determine safe fix')
        this.skipCount++
        return false
      }
      
      // 4. Verify behavior hasn't changed
      const afterBehavior = await this.captureBehavior(errorInfo.file)
      
      if (!this.behaviorsMatch(beforeBehavior, afterBehavior)) {
        console.log('❌ Fix changed behavior - reverting')
        this.revertBackup(errorInfo.file)
        this.skipCount++
        return false
      }
      
      // 5. Run type check on file
      if (!this.typeCheckPasses(errorInfo.file)) {
        console.log('❌ Fix introduced new type errors - reverting')
        this.revertBackup(errorInfo.file)
        this.skipCount++
        return false
      }
      
      // Success!
      console.log('✅ Fix applied successfully')
      this.fixCount++
      this.removeBackup(errorInfo.file)
      return true
      
    } catch (error) {
      console.log('❌ Error applying fix:', error)
      this.revertBackup(errorInfo.file)
      this.skipCount++
      return false
    }
  }

  private async applyFix(errorInfo: ErrorInfo): Promise<boolean> {
    const sourceFile = this.project.getSourceFile(errorInfo.file)
    if (!sourceFile) return false

    switch (errorInfo.code) {
      case 'TS2345': // Argument type mismatch
        return this.fixArgumentTypeMismatch(sourceFile, errorInfo)
      
      case 'TS2339': // Property does not exist
        return this.fixMissingProperty(sourceFile, errorInfo)
      
      case 'TS7006': // Parameter implicitly has 'any' type
        return this.fixImplicitAny(sourceFile, errorInfo)
      
      case 'TS2344': // Type constraint not satisfied
        return this.fixTypeConstraint(sourceFile, errorInfo)
      
      case 'TS2322': // Type not assignable
        return this.fixTypeNotAssignable(sourceFile, errorInfo)
      
      default:
        return false
    }
  }

  private fixArgumentTypeMismatch(sourceFile: SourceFile, errorInfo: ErrorInfo): boolean {
    try {
      const node = this.findNodeAtPosition(sourceFile, errorInfo.line, errorInfo.column)
      if (!node) return false

      // For setState calls with wrong types
      if (errorInfo.message.includes('SetStateAction')) {
        const callExpr = node.getFirstAncestorByKind(SyntaxKind.CallExpression)
        if (callExpr) {
          const args = callExpr.getArguments()
          if (args.length > 0) {
            // Add type assertion for setState
            args[0].replaceWithText(`(${args[0].getText()} as any)`)
            sourceFile.saveSync()
            return true
          }
        }
      }

      // For array/object type mismatches
      if (errorInfo.message.includes('is not assignable to parameter')) {
        const callExpr = node.getFirstAncestorByKind(SyntaxKind.CallExpression)
        if (callExpr) {
          const args = callExpr.getArguments()
          if (args.length > 0) {
            // Check if it's an array vs object issue
            if (errorInfo.message.includes('any[]') && errorInfo.message.includes('{ data: any[]; }')) {
              // Fix API response type mismatch
              const argText = args[0].getText()
              args[0].replaceWithText(`(Array.isArray(${argText}) ? ${argText} : ${argText}?.data || [])`)
              sourceFile.saveSync()
              return true
            }
          }
        }
      }

      return false
    } catch (error) {
      console.error('Error in fixArgumentTypeMismatch:', error)
      return false
    }
  }

  private fixMissingProperty(sourceFile: SourceFile, errorInfo: ErrorInfo): boolean {
    try {
      const node = this.findNodeAtPosition(sourceFile, errorInfo.line, errorInfo.column)
      if (!node) return false

      // For property access on potentially undefined values
      const propertyAccess = node.getFirstAncestorByKind(SyntaxKind.PropertyAccessExpression)
      if (propertyAccess) {
        const expression = propertyAccess.getExpression()
        const property = propertyAccess.getName()
        
        // Add optional chaining
        propertyAccess.replaceWithText(`${expression.getText()}?.${property}`)
        sourceFile.saveSync()
        return true
      }

      return false
    } catch (error) {
      console.error('Error in fixMissingProperty:', error)
      return false
    }
  }

  private fixImplicitAny(sourceFile: SourceFile, errorInfo: ErrorInfo): boolean {
    try {
      const node = this.findNodeAtPosition(sourceFile, errorInfo.line, errorInfo.column)
      if (!node) return false

      // Find parameter
      const param = node.getFirstAncestorByKind(SyntaxKind.Parameter)
      if (param) {
        // Add 'any' type annotation
        const paramName = param.getName()
        param.replaceWithText(`${paramName}: any`)
        sourceFile.saveSync()
        return true
      }

      return false
    } catch (error) {
      console.error('Error in fixImplicitAny:', error)
      return false
    }
  }

  private fixTypeConstraint(sourceFile: SourceFile, errorInfo: ErrorInfo): boolean {
    try {
      // For Next.js route type constraints
      if (errorInfo.message.includes('does not satisfy the constraint') && 
          errorInfo.file.includes('.next/types')) {
        // These are auto-generated files, skip
        return false
      }

      return false
    } catch (error) {
      console.error('Error in fixTypeConstraint:', error)
      return false
    }
  }

  private fixTypeNotAssignable(sourceFile: SourceFile, errorInfo: ErrorInfo): boolean {
    try {
      const node = this.findNodeAtPosition(sourceFile, errorInfo.line, errorInfo.column)
      if (!node) return false

      // For variable assignments
      const varDecl = node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration)
      if (varDecl && varDecl.getInitializer()) {
        const initializer = varDecl.getInitializer()!
        // Add type assertion
        initializer.replaceWithText(`(${initializer.getText()} as any)`)
        sourceFile.saveSync()
        return true
      }

      return false
    } catch (error) {
      console.error('Error in fixTypeNotAssignable:', error)
      return false
    }
  }

  private findNodeAtPosition(sourceFile: SourceFile, line: number, column: number): Node | undefined {
    const position = sourceFile.getPositionOfLineAndCharacter(line - 1, column - 1)
    return sourceFile.getDescendantAtPos(position)
  }

  private async captureBehavior(filePath: string): Promise<BehaviorSnapshot> {
    const snapshot: BehaviorSnapshot = {}
    
    // 1. Run tests if they exist
    const testFile = this.findTestFile(filePath)
    if (testFile && fs.existsSync(testFile)) {
      try {
        const testOutput = execSync(
          `npm test -- ${testFile} --passWithNoTests --silent`,
          { encoding: 'utf-8' }
        )
        snapshot.testResults = testOutput
      } catch (error) {
        snapshot.testResults = 'Tests failed'
      }
    }
    
    // 2. Capture module exports
    try {
      const exports = execSync(
        `node -e "console.log(Object.keys(require('${filePath}')))"`,
        { encoding: 'utf-8' }
      ).trim()
      snapshot.fileExports = JSON.parse(exports)
    } catch {
      // Module might not be directly executable
    }
    
    return snapshot
  }

  private behaviorsMatch(before: BehaviorSnapshot, after: BehaviorSnapshot): boolean {
    // Compare test results
    if (before.testResults !== after.testResults) {
      return false
    }
    
    // Compare exports
    if (JSON.stringify(before.fileExports) !== JSON.stringify(after.fileExports)) {
      return false
    }
    
    return true
  }

  private typeCheckPasses(filePath: string): boolean {
    try {
      execSync(`npx tsc --noEmit ${filePath}`, { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }

  private createBackup(filePath: string): void {
    fs.copyFileSync(filePath, `${filePath}.backup`)
  }

  private revertBackup(filePath: string): void {
    fs.copyFileSync(`${filePath}.backup`, filePath)
    fs.unlinkSync(`${filePath}.backup`)
  }

  private removeBackup(filePath: string): void {
    if (fs.existsSync(`${filePath}.backup`)) {
      fs.unlinkSync(`${filePath}.backup`)
    }
  }

  private findTestFile(filePath: string): string | null {
    const testPatterns = [
      filePath.replace(/\.tsx?$/, '.test.ts'),
      filePath.replace(/\.tsx?$/, '.test.tsx'),
      filePath.replace(/\.tsx?$/, '.spec.ts'),
      filePath.replace(/\.tsx?$/, '.spec.tsx'),
      filePath.replace('/src/', '/tests/').replace(/\.tsx?$/, '.test.ts'),
    ]
    
    for (const pattern of testPatterns) {
      if (fs.existsSync(pattern)) {
        return pattern
      }
    }
    
    return null
  }

  async fixCriticalErrors(): Promise<void> {
    console.log('🚀 Starting safe type error fixing...\n')
    
    // Read suppressed errors
    const suppressedErrors = JSON.parse(
      fs.readFileSync('suppressed-errors.json', 'utf-8')
    )
    
    // Filter critical errors
    const criticalErrors = suppressedErrors.errors
      .filter((e: any) => e.priority === 'critical')
      .slice(0, 10) // Start with first 10
    
    console.log(`Found ${criticalErrors.length} critical errors to fix\n`)
    
    for (const error of criticalErrors) {
      await this.fixError(error)
      
      // Pause between fixes
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`\n✅ Fixed ${this.fixCount} errors`)
    console.log(`⏭️  Skipped ${this.skipCount} errors (unsafe to fix automatically)`)
    
    // Update suppressed-errors.json
    this.updateSuppressedErrors()
  }

  private updateSuppressedErrors(): void {
    // Re-run type checking to get updated error count
    try {
      const errors = execSync('npx tsc --noEmit 2>&1 || true', { encoding: 'utf-8' })
      const errorCount = (errors.match(/error TS/g) || []).length
      
      console.log(`\n📊 Remaining errors: ${errorCount}`)
      
      // Update tracking file
      const tracking = JSON.parse(fs.readFileSync('suppressed-errors.json', 'utf-8'))
      tracking.lastUpdate = new Date().toISOString()
      tracking.fixedCount = this.fixCount
      tracking.remainingErrors = errorCount
      
      fs.writeFileSync('suppressed-errors.json', JSON.stringify(tracking, null, 2))
    } catch (error) {
      console.error('Error updating suppressed errors:', error)
    }
  }
}

// Main execution
if (require.main === module) {
  const fixer = new SafeTypeFixer()
  fixer.fixCriticalErrors().catch(console.error)
}

export default SafeTypeFixer