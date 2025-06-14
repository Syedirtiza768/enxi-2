#!/usr/bin/env tsx

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

interface AsyncFunctionIssue {
  file: string
  line: number
  functionName: string
  issue: string
  suggestedFix?: string
}

async function findAsyncFunctionIssues(): Promise<AsyncFunctionIssue[]> {
  const issues: AsyncFunctionIssue[] = []
  
  // Find all TypeScript files
  const files = await glob('**/*.{ts,tsx}', {
    ignore: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '.turbo/**',
      'scripts/fix-async-return-types.ts'
    ]
  })

  console.log(`Found ${files.length} TypeScript files to analyze`)

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNum = i + 1

        // Pattern 1: async function without explicit return type
        const asyncFuncMatch = line.match(/async\s+(\w+)\s*\([^)]*\)\s*\{/)
        if (asyncFuncMatch && !line.includes(':') && !line.includes('Promise<')) {
          issues.push({
            file,
            line: lineNum,
            functionName: asyncFuncMatch[1],
            issue: 'Async function without explicit return type',
            suggestedFix: 'Add ": Promise<T>" return type'
          })
        }

        // Pattern 2: async arrow function without explicit return type
        const asyncArrowMatch = line.match(/(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/)
        if (asyncArrowMatch && !line.includes(':') && !line.includes('Promise<')) {
          // Check if the variable declaration has a type annotation
          const varName = asyncArrowMatch[1]
          const hasType = line.includes(`: `) && line.includes('Promise<')
          if (!hasType) {
            issues.push({
              file,
              line: lineNum,
              functionName: varName,
              issue: 'Async arrow function without explicit return type',
              suggestedFix: 'Add ": Promise<T>" return type'
            })
          }
        }

        // Pattern 3: Function returning promise without Promise<T> type
        if (line.includes('return') && line.includes('await') && !line.includes('Promise<')) {
          // Look backwards to find the function declaration
          for (let j = i - 1; j >= 0 && j > i - 10; j--) {
            const funcLine = lines[j]
            if (funcLine.includes('function') || funcLine.includes('=>')) {
              const hasPromiseType = funcLine.includes('Promise<')
              if (!hasPromiseType && funcLine.includes('async')) {
                const funcNameMatch = funcLine.match(/(?:async\s+)?(\w+)\s*[:(]/)
                if (funcNameMatch) {
                  issues.push({
                    file,
                    line: j + 1,
                    functionName: funcNameMatch[1],
                    issue: 'Async function returning value without Promise<T> type',
                    suggestedFix: 'Add explicit Promise<T> return type'
                  })
                }
                break
              }
            }
          }
        }

        // Pattern 4: Methods in services without proper return types
        if (file.includes('.service.ts')) {
          const methodMatch = line.match(/async\s+(\w+)\s*\([^)]*\)\s*\{/)
          if (methodMatch && !line.includes('Promise<')) {
            issues.push({
              file,
              line: lineNum,
              functionName: methodMatch[1],
              issue: 'Service method without Promise<T> return type',
              suggestedFix: 'Add explicit Promise<T> return type'
            })
          }
        }

        // Pattern 5: API route handlers without proper types
        if (file.includes('/api/') && file.endsWith('/route.ts')) {
          const routeMatch = line.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/)
          if (routeMatch && !lines[i].includes('Promise<NextResponse>') && !lines[i+1]?.includes('Promise<NextResponse>')) {
            issues.push({
              file,
              line: lineNum,
              functionName: routeMatch[1],
              issue: 'API route handler without Promise<NextResponse> return type',
              suggestedFix: 'Add ": Promise<NextResponse>" return type'
            })
          }
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
    }
  }

  return issues
}

async function analyzeReturnStatements(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  const returnTypes = new Set<string>()

  for (const line of lines) {
    // Find return statements
    if (line.includes('return')) {
      // Try to infer the type
      if (line.includes('NextResponse.json')) {
        returnTypes.add('NextResponse')
      } else if (line.includes('null')) {
        returnTypes.add('null')
      } else if (line.includes('undefined')) {
        returnTypes.add('undefined')
      } else if (line.includes('[]')) {
        returnTypes.add('Array')
      } else if (line.includes('{}')) {
        returnTypes.add('Object')
      } else if (line.includes('true') || line.includes('false')) {
        returnTypes.add('boolean')
      } else if (line.match(/return\s+\d+/)) {
        returnTypes.add('number')
      } else if (line.match(/return\s+["'`]/)) {
        returnTypes.add('string')
      }
    }
  }

  return Array.from(returnTypes)
}

async function generateReport(issues: AsyncFunctionIssue[]): Promise<void> {
  const reportPath = path.join(process.cwd(), 'ASYNC_RETURN_TYPE_ISSUES.md')
  
  let report = `# Async Function Return Type Issues Report

Generated on: ${new Date().toISOString()}

Total issues found: ${issues.length}

## Summary by File Type

`

  // Group by file type
  const byFileType = new Map<string, AsyncFunctionIssue[]>()
  for (const issue of issues) {
    const ext = path.extname(issue.file)
    if (!byFileType.has(ext)) {
      byFileType.set(ext, [])
    }
    byFileType.get(ext)!.push(issue)
  }

  for (const [ext, typeIssues] of byFileType) {
    report += `- ${ext}: ${typeIssues.length} issues\n`
  }

  report += `\n## Issues by Category\n\n`

  // Group by issue type
  const byIssueType = new Map<string, AsyncFunctionIssue[]>()
  for (const issue of issues) {
    if (!byIssueType.has(issue.issue)) {
      byIssueType.set(issue.issue, [])
    }
    byIssueType.get(issue.issue)!.push(issue)
  }

  for (const [issueType, typeIssues] of byIssueType) {
    report += `### ${issueType} (${typeIssues.length} occurrences)\n\n`
    
    // Group by file
    const byFile = new Map<string, AsyncFunctionIssue[]>()
    for (const issue of typeIssues) {
      if (!byFile.has(issue.file)) {
        byFile.set(issue.file, [])
      }
      byFile.get(issue.file)!.push(issue)
    }

    for (const [file, fileIssues] of byFile) {
      report += `#### ${file}\n`
      for (const issue of fileIssues) {
        report += `- Line ${issue.line}: \`${issue.functionName}\` - ${issue.suggestedFix}\n`
      }
      report += '\n'
    }
  }

  // Add high-priority fixes
  report += `## High Priority Fixes\n\n`
  report += `These are the most critical issues that should be fixed first:\n\n`

  const highPriority = issues.filter(issue => 
    issue.file.includes('.service.ts') || 
    issue.file.includes('/api/') ||
    issue.file.includes('/utils/')
  )

  for (const issue of highPriority.slice(0, 20)) {
    report += `1. **${issue.file}** (Line ${issue.line})\n`
    report += `   - Function: \`${issue.functionName}\`\n`
    report += `   - Issue: ${issue.issue}\n`
    report += `   - Fix: ${issue.suggestedFix}\n\n`
  }

  await fs.writeFile(reportPath, report)
  console.log(`\nReport generated: ${reportPath}`)
}

async function main() {
  console.log('Analyzing async functions for missing return types...\n')
  
  const issues = await findAsyncFunctionIssues()
  
  if (issues.length === 0) {
    console.log('✅ No async function return type issues found!')
    return
  }

  console.log(`\n❌ Found ${issues.length} async function return type issues\n`)

  // Generate detailed report
  await generateReport(issues)

  // Show summary
  console.log('\nTop 10 files with most issues:')
  const fileCount = new Map<string, number>()
  for (const issue of issues) {
    fileCount.set(issue.file, (fileCount.get(issue.file) || 0) + 1)
  }
  
  const sorted = Array.from(fileCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  for (const [file, count] of sorted) {
    console.log(`  ${file}: ${count} issues`)
  }

  console.log('\nRun the following command to see the full report:')
  console.log('  cat ASYNC_RETURN_TYPE_ISSUES.md')
}

main().catch(console.error)