#!/usr/bin/env tsx
/**
 * Automated Code Quality Checks
 * Ensures code meets quality standards beyond type safety
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Project, SourceFile, SyntaxKind } from 'ts-morph'

interface QualityIssue {
  file: string
  line: number
  type: 'any-type' | 'no-error-handling' | 'console-log' | 'todo-comment' | 'complex-function' | 'no-types'
  message: string
  severity: 'error' | 'warning' | 'info'
}

interface QualityReport {
  totalIssues: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  files: Array<{
    path: string
    issues: number
    score: number
  }>
}

export class CodeQualityChecker {
  private project: Project
  private issues: QualityIssue[] = []

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
    })
  }

  async checkCodeQuality(targetPath?: string): Promise<QualityReport> {
    console.log('🔍 Running code quality checks...\n')
    
    const sourceFiles = targetPath 
      ? this.project.getSourceFiles(`${targetPath}/**/*.{ts,tsx}`)
      : this.project.getSourceFiles('**/*.{ts,tsx}')
        .filter(f => !f.getFilePath().includes('node_modules'))
        .filter(f => !f.getFilePath().includes('.next'))
    
    for (const sourceFile of sourceFiles) {
      await this.checkFile(sourceFile)
    }
    
    return this.generateReport()
  }

  private async checkFile(sourceFile: SourceFile): Promise<void> {
    const filePath = sourceFile.getFilePath()
    
    // Skip test files and generated files
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('.d.ts')) {
      return
    }
    
    // Check for 'any' types
    this.checkAnyTypes(sourceFile)
    
    // Check for error handling
    this.checkErrorHandling(sourceFile)
    
    // Check for console.log statements
    this.checkConsoleLogs(sourceFile)
    
    // Check for TODO comments
    this.checkTodoComments(sourceFile)
    
    // Check function complexity
    this.checkFunctionComplexity(sourceFile)
    
    // Check for missing type annotations
    this.checkMissingTypes(sourceFile)
  }

  private checkAnyTypes(sourceFile: SourceFile): void {
    const anyTypes = sourceFile.getDescendantsOfKind(SyntaxKind.AnyKeyword)
    
    anyTypes.forEach(anyType => {
      const line = anyType.getStartLineNumber()
      const parent = anyType.getParent()
      
      // Allow 'any' in type assertions (as any)
      if (parent?.getKind() === SyntaxKind.AsExpression) {
        return
      }
      
      this.issues.push({
        file: sourceFile.getFilePath(),
        line,
        type: 'any-type',
        message: 'Avoid using "any" type',
        severity: 'warning'
      })
    })
  }

  private checkErrorHandling(sourceFile: SourceFile): void {
    const tryStatements = sourceFile.getDescendantsOfKind(SyntaxKind.TryStatement)
    
    tryStatements.forEach(tryStatement => {
      const catchClause = tryStatement.getCatchClause()
      if (catchClause) {
        const block = catchClause.getBlock()
        const statements = block.getStatements()
        
        // Check if catch block is empty or only has console.log
        if (statements.length === 0) {
          this.issues.push({
            file: sourceFile.getFilePath(),
            line: catchClause.getStartLineNumber(),
            type: 'no-error-handling',
            message: 'Empty catch block',
            severity: 'error'
          })
        } else if (statements.length === 1 && statements[0].getText().includes('console.')) {
          this.issues.push({
            file: sourceFile.getFilePath(),
            line: catchClause.getStartLineNumber(),
            type: 'no-error-handling',
            message: 'Catch block only logs error',
            severity: 'warning'
          })
        }
      }
    })
  }

  private checkConsoleLogs(sourceFile: SourceFile): void {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    
    callExpressions.forEach(call => {
      const expression = call.getExpression()
      if (expression.getText().startsWith('console.')) {
        this.issues.push({
          file: sourceFile.getFilePath(),
          line: call.getStartLineNumber(),
          type: 'console-log',
          message: 'Remove console statement',
          severity: 'warning'
        })
      }
    })
  }

  private checkTodoComments(sourceFile: SourceFile): void {
    const comments = sourceFile.getDescendantStatements()
    const text = sourceFile.getText()
    const lines = text.split('\n')
    
    lines.forEach((line, index) => {
      if (line.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/i)) {
        this.issues.push({
          file: sourceFile.getFilePath(),
          line: index + 1,
          type: 'todo-comment',
          message: 'Unresolved TODO comment',
          severity: 'info'
        })
      }
    })
  }

  private checkFunctionComplexity(sourceFile: SourceFile): void {
    const functions = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration)
    ]
    
    functions.forEach(func => {
      const statements = func.getDescendantStatements()
      const complexity = this.calculateCyclomaticComplexity(func)
      
      if (complexity > 10) {
        this.issues.push({
          file: sourceFile.getFilePath(),
          line: func.getStartLineNumber(),
          type: 'complex-function',
          message: `Function has high complexity (${complexity})`,
          severity: 'warning'
        })
      }
    })
  }

  private checkMissingTypes(sourceFile: SourceFile): void {
    // Check function parameters without types
    const parameters = sourceFile.getDescendantsOfKind(SyntaxKind.Parameter)
    
    parameters.forEach(param => {
      if (!param.getTypeNode() && !param.getInitializer()) {
        const func = param.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration)
          || param.getFirstAncestorByKind(SyntaxKind.ArrowFunction)
          || param.getFirstAncestorByKind(SyntaxKind.MethodDeclaration)
        
        if (func && !func.getName()?.startsWith('_')) {
          this.issues.push({
            file: sourceFile.getFilePath(),
            line: param.getStartLineNumber(),
            type: 'no-types',
            message: `Parameter "${param.getName()}" lacks type annotation`,
            severity: 'warning'
          })
        }
      }
    })
  }

  private calculateCyclomaticComplexity(node: any): number {
    let complexity = 1
    
    const countComplexity = (n: any) => {
      if (n.getKind) {
        const kind = n.getKind()
        if ([
          SyntaxKind.IfStatement,
          SyntaxKind.ConditionalExpression,
          SyntaxKind.CaseClause,
          SyntaxKind.WhileStatement,
          SyntaxKind.ForStatement,
          SyntaxKind.ForInStatement,
          SyntaxKind.ForOfStatement,
        ].includes(kind)) {
          complexity++
        }
      }
      
      n.forEachChild?.(countComplexity)
    }
    
    countComplexity(node)
    return complexity
  }

  private generateReport(): QualityReport {
    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const fileIssues: Record<string, number> = {}
    
    this.issues.forEach(issue => {
      byType[issue.type] = (byType[issue.type] || 0) + 1
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1
      fileIssues[issue.file] = (fileIssues[issue.file] || 0) + 1
    })
    
    const files = Object.entries(fileIssues).map(([path, issues]) => ({
      path: path.replace(process.cwd() + '/', ''),
      issues,
      score: Math.max(0, 100 - (issues * 5))
    }))
    
    return {
      totalIssues: this.issues.length,
      byType,
      bySeverity,
      files: files.sort((a, b) => a.score - b.score).slice(0, 20)
    }
  }

  generateMarkdownReport(): string {
    const report = this.generateReport()
    
    let md = '# Code Quality Report\n\n'
    md += `Generated: ${new Date().toISOString()}\n\n`
    
    md += '## Summary\n'
    md += `- Total Issues: ${report.totalIssues}\n`
    md += `- Errors: ${report.bySeverity.error || 0}\n`
    md += `- Warnings: ${report.bySeverity.warning || 0}\n`
    md += `- Info: ${report.bySeverity.info || 0}\n\n`
    
    md += '## Issues by Type\n'
    Object.entries(report.byType).forEach(([type, count]) => {
      md += `- ${this.formatIssueType(type)}: ${count}\n`
    })
    
    md += '\n## Files Needing Attention\n'
    report.files.slice(0, 10).forEach(file => {
      md += `- ${file.path} (${file.issues} issues, score: ${file.score}/100)\n`
    })
    
    return md
  }

  private formatIssueType(type: string): string {
    const labels: Record<string, string> = {
      'any-type': 'Any Types',
      'no-error-handling': 'Poor Error Handling',
      'console-log': 'Console Statements',
      'todo-comment': 'TODO Comments',
      'complex-function': 'Complex Functions',
      'no-types': 'Missing Types'
    }
    return labels[type] || type
  }
}

// Main execution
if (require.main === module) {
  const checker = new CodeQualityChecker()
  const targetPath = process.argv[2]
  
  checker.checkCodeQuality(targetPath).then(report => {
    console.log('\n📊 Code Quality Report\n')
    console.log(`Total Issues: ${report.totalIssues}`)
    console.log('\nBy Type:')
    Object.entries(report.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    
    console.log('\nBy Severity:')
    Object.entries(report.bySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity}: ${count}`)
    })
    
    console.log('\nWorst Files:')
    report.files.slice(0, 5).forEach(file => {
      console.log(`  ${file.path}: ${file.issues} issues (score: ${file.score}/100)`)
    })
    
    // Generate markdown report
    const mdReport = checker.generateMarkdownReport()
    fs.writeFileSync('CODE_QUALITY_REPORT.md', mdReport)
    console.log('\n✅ Full report saved to CODE_QUALITY_REPORT.md')
    
    // Exit with error if too many issues
    if (report.bySeverity.error > 0) {
      process.exit(1)
    }
  })
}