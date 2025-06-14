#!/usr/bin/env tsx
/**
 * Performance analysis script for Enxi ERP
 * Identifies bottlenecks and optimization opportunities
 */

import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import * as path from 'path'
import * as fs from 'fs'

interface PerformanceIssue {
  file: string
  line: number
  type: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

const issues: PerformanceIssue[] = []

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
})

/**
 * Check for N+1 query patterns
 */
function checkForNPlusOneQueries(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath()
  
  // Look for loops with database queries
  sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement).forEach(loop => {
    const body = loop.getStatement()
    if (body?.getText().includes('prisma.') && body.getText().includes('await')) {
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: loop.getStartLineNumber(),
        type: 'N+1 Query',
        description: 'Database query inside loop - consider using include or batch operation',
        severity: 'high',
      })
    }
  })
  
  // Check for array.map with async operations
  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const text = call.getText()
    if (text.includes('.map') && text.includes('async') && text.includes('await')) {
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: call.getStartLineNumber(),
        type: 'Sequential Async',
        description: 'Sequential async operations in map - use Promise.all() for parallel execution',
        severity: 'medium',
      })
    }
  })
}

/**
 * Check for missing database indexes
 */
function checkForMissingIndexes(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath()
  
  // Look for findMany with where clauses
  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const text = call.getText()
    if (text.includes('findMany') && text.includes('where:')) {
      // Extract the where clause fields
      const whereMatch = text.match(/where:\s*{([^}]+)}/)
      if (whereMatch) {
        const whereFields = whereMatch[1].match(/(\w+):/g)
        if (whereFields && whereFields.length > 1) {
          issues.push({
            file: path.relative(process.cwd(), filePath),
            line: call.getStartLineNumber(),
            type: 'Missing Index',
            description: `Complex where clause on fields: ${whereFields.join(', ')} - consider adding database index`,
            severity: 'medium',
          })
        }
      }
    }
  })
}

/**
 * Check for unnecessary data fetching
 */
function checkForOverfetching(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath()
  
  // Look for queries without select
  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const text = call.getText()
    if ((text.includes('findMany') || text.includes('findFirst') || text.includes('findUnique')) 
        && !text.includes('select:') 
        && !text.includes('include:')) {
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: call.getStartLineNumber(),
        type: 'Overfetching',
        description: 'Query without select/include - fetching all fields when you might need only some',
        severity: 'low',
      })
    }
  })
}

/**
 * Check for missing pagination
 */
function checkForMissingPagination(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath()
  
  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const text = call.getText()
    if (text.includes('findMany') && !text.includes('take:') && !text.includes('limit:')) {
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: call.getStartLineNumber(),
        type: 'Missing Pagination',
        description: 'findMany without pagination - could return unbounded results',
        severity: 'high',
      })
    }
  })
}

/**
 * Check for inefficient imports
 */
function checkForInefficientImports(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath()
  
  sourceFile.getImportDeclarations().forEach(importDecl => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue()
    
    // Check for importing entire lodash
    if (moduleSpecifier === 'lodash' && !importDecl.getNamespaceImport()) {
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: importDecl.getStartLineNumber(),
        type: 'Bundle Size',
        description: 'Importing entire lodash - use specific imports like lodash/debounce',
        severity: 'medium',
      })
    }
    
    // Check for importing moment instead of date-fns
    if (moduleSpecifier === 'moment') {
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: importDecl.getStartLineNumber(),
        type: 'Bundle Size',
        description: 'Using moment.js - consider lighter alternatives like date-fns',
        severity: 'low',
      })
    }
  })
}

/**
 * Check for missing memoization
 */
function checkForMissingMemoization(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath()
  
  // Only check React components
  if (!filePath.includes('components/')) return
  
  sourceFile.getFunctions().forEach(func => {
    const body = func.getBodyText() || ''
    
    // Check for expensive computations without useMemo
    if (body.includes('.filter(') || body.includes('.map(') || body.includes('.reduce(')) {
      if (!body.includes('useMemo')) {
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: func.getStartLineNumber(),
          type: 'Missing Memoization',
          description: 'Expensive computation without useMemo',
          severity: 'medium',
        })
      }
    }
    
    // Check for inline functions in props
    if (body.includes('onClick={() =>') || body.includes('onChange={() =>')) {
      if (!body.includes('useCallback')) {
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: func.getStartLineNumber(),
          type: 'Missing Memoization',
          description: 'Inline function props without useCallback',
          severity: 'low',
        })
      }
    }
  })
}

/**
 * Main analysis function
 */
async function analyzePerformance() {
  console.log('🔍 Analyzing performance issues...\n')
  
  const sourceFiles = project.getSourceFiles()
    .filter(file => {
      const filePath = file.getFilePath()
      return !filePath.includes('node_modules') && 
             !filePath.includes('.next') &&
             !filePath.includes('tests/') &&
             (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))
    })
  
  console.log(`Analyzing ${sourceFiles.length} files...\n`)
  
  for (const file of sourceFiles) {
    checkForNPlusOneQueries(file)
    checkForMissingIndexes(file)
    checkForOverfetching(file)
    checkForMissingPagination(file)
    checkForInefficientImports(file)
    checkForMissingMemoization(file)
  }
  
  // Generate report
  generateReport()
}

function generateReport() {
  console.log('📊 Performance Analysis Report')
  console.log('=============================\n')
  
  // Group by severity
  const highSeverity = issues.filter(i => i.severity === 'high')
  const mediumSeverity = issues.filter(i => i.severity === 'medium')
  const lowSeverity = issues.filter(i => i.severity === 'low')
  
  console.log(`Total issues found: ${issues.length}`)
  console.log(`- High severity: ${highSeverity.length}`)
  console.log(`- Medium severity: ${mediumSeverity.length}`)
  console.log(`- Low severity: ${lowSeverity.length}`)
  console.log()
  
  // Group by type
  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('Issues by type:')
  Object.entries(issuesByType).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`)
  })
  console.log()
  
  // Show high severity issues
  if (highSeverity.length > 0) {
    console.log('🔴 High Severity Issues:')
    console.log('------------------------')
    highSeverity.forEach(issue => {
      console.log(`\n${issue.file}:${issue.line}`)
      console.log(`Type: ${issue.type}`)
      console.log(`Description: ${issue.description}`)
    })
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: issues.length,
      high: highSeverity.length,
      medium: mediumSeverity.length,
      low: lowSeverity.length,
    },
    byType: issuesByType,
    issues: issues,
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'performance-analysis.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log('\n📄 Detailed report saved to: performance-analysis.json')
  
  // Provide optimization suggestions
  console.log('\n💡 Top Optimization Suggestions:')
  console.log('--------------------------------')
  if (highSeverity.some(i => i.type === 'N+1 Query')) {
    console.log('1. Fix N+1 queries by using Prisma include or select')
  }
  if (highSeverity.some(i => i.type === 'Missing Pagination')) {
    console.log('2. Add pagination to findMany queries to prevent memory issues')
  }
  if (mediumSeverity.some(i => i.type === 'Sequential Async')) {
    console.log('3. Use Promise.all() for parallel async operations')
  }
  if (mediumSeverity.some(i => i.type === 'Missing Index')) {
    console.log('4. Add database indexes for frequently queried fields')
  }
  if (issues.some(i => i.type === 'Bundle Size')) {
    console.log('5. Optimize imports to reduce bundle size')
  }
}

// Run the analysis
analyzePerformance().catch(console.error)