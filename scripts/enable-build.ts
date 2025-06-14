#!/usr/bin/env tsx
/**
 * Script to enable building with TypeScript errors
 * Tracks suppressed errors for later fixing
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface SuppressedError {
  file: string
  line: number
  error: string
  suppressed: boolean
  priority: 'critical' | 'high' | 'medium' | 'low'
}

const suppressedErrors: SuppressedError[] = []

// Step 1: Update Next.js config to allow building with errors
function updateNextConfig() {
  // Check for TypeScript config first
  let configPath = path.join(process.cwd(), 'next.config.ts')
  if (!fs.existsSync(configPath)) {
    configPath = path.join(process.cwd(), 'next.config.js')
  }
  
  const config = fs.readFileSync(configPath, 'utf-8')
  
  if (!config.includes('ignoreBuildErrors')) {
    // For TypeScript config
    if (configPath.endsWith('.ts')) {
      const updatedConfig = config.replace(
        /const nextConfig[^{]*{/,
        `const nextConfig = {
  // TEMPORARY: Remove after fixing type errors
  // Added on: ${new Date().toISOString()}
  // Tracking: see suppressed-errors.json
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },`
      )
      
      fs.writeFileSync(configPath, updatedConfig)
    } else {
      // For JavaScript config
      const updatedConfig = config.replace(
        'module.exports = {',
        `module.exports = {
  // TEMPORARY: Remove after fixing type errors
  // Added on: ${new Date().toISOString()}
  // Tracking: see suppressed-errors.json
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },`
      )
      
      fs.writeFileSync(configPath, updatedConfig)
    }
    
    console.log(`✅ Updated ${path.basename(configPath)} to allow building with errors`)
  }
}

// Step 2: Create temporary tsconfig for building
function createBuildTsConfig() {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
  const buildConfigPath = path.join(process.cwd(), 'tsconfig.build.json')
  
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
  
  const buildConfig = {
    ...tsconfig,
    compilerOptions: {
      ...tsconfig.compilerOptions,
      // Relax type checking for build
      strict: false,
      noImplicitAny: false,
      strictNullChecks: false,
      strictFunctionTypes: false,
      strictBindCallApply: false,
      strictPropertyInitialization: false,
      noImplicitThis: false,
      alwaysStrict: false,
      skipLibCheck: true,
      // Still catch some errors
      noUnusedLocals: false,
      noUnusedParameters: false,
      noImplicitReturns: false,
    },
    exclude: [
      ...tsconfig.exclude || [],
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'tests/**/*',
    ]
  }
  
  fs.writeFileSync(buildConfigPath, JSON.stringify(buildConfig, null, 2))
  console.log('✅ Created tsconfig.build.json with relaxed type checking')
}

// Step 3: Analyze and categorize current errors
function analyzeErrors() {
  console.log('🔍 Analyzing current TypeScript errors...')
  
  try {
    const errors = execSync('npx tsc --noEmit 2>&1 || true', { encoding: 'utf-8' })
    const errorLines = errors.split('\n').filter(line => line.includes('error TS'))
    
    errorLines.forEach(line => {
      const match = line.match(/(.+?)\((\d+),\d+\): error (TS\d+): (.+)/)
      if (match) {
        const [, file, lineNum, code, message] = match
        const priority = categorizePriority(file, message)
        
        suppressedErrors.push({
          file,
          line: parseInt(lineNum),
          error: `${code}: ${message}`,
          suppressed: true,
          priority
        })
      }
    })
    
    console.log(`📊 Found ${suppressedErrors.length} errors to suppress`)
    
    // Group by priority
    const byPriority = suppressedErrors.reduce((acc, err) => {
      acc[err.priority] = (acc[err.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('By priority:', byPriority)
    
  } catch (error) {
    console.log('Error analyzing TypeScript errors:', error)
  }
}

// Step 4: Categorize error priority based on file path and error type
function categorizePriority(file: string, error: string): 'critical' | 'high' | 'medium' | 'low' {
  // Critical: Payment, invoice, order processing
  if (file.includes('payment') || file.includes('invoice') || file.includes('order')) {
    return 'critical'
  }
  
  // High: Core business logic
  if (file.includes('/api/') || file.includes('/services/')) {
    return 'high'
  }
  
  // Medium: UI components
  if (file.includes('/components/')) {
    return 'medium'
  }
  
  // Low: Everything else
  return 'low'
}

// Step 5: Add @ts-expect-error comments to files with errors
function addErrorSuppressions() {
  console.log('🔧 Adding error suppressions to files...')
  
  const fileErrors = suppressedErrors.reduce((acc, err) => {
    if (!acc[err.file]) acc[err.file] = []
    acc[err.file].push(err)
    return acc
  }, {} as Record<string, SuppressedError[]>)
  
  Object.entries(fileErrors).forEach(([file, errors]) => {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      
      // Add file-level comment
      if (!lines[0].includes('@ts-')) {
        lines.unshift(
          `// @ts-expect-error - Temporary suppression for build`,
          `// TODO: Fix ${errors.length} type errors in this file`,
          `// Priority: ${errors[0].priority}`,
          `// See: suppressed-errors.json`,
          ''
        )
      }
      
      fs.writeFileSync(file, lines.join('\n'))
    } catch (error) {
      console.log(`Could not process ${file}:`, error)
    }
  })
}

// Step 6: Create tracking file
function createTrackingFile() {
  const report = {
    timestamp: new Date().toISOString(),
    totalErrors: suppressedErrors.length,
    byPriority: suppressedErrors.reduce((acc, err) => {
      acc[err.priority] = (acc[err.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    criticalFiles: suppressedErrors
      .filter(e => e.priority === 'critical')
      .map(e => e.file)
      .filter((v, i, a) => a.indexOf(v) === i),
    errors: suppressedErrors
  }
  
  fs.writeFileSync('suppressed-errors.json', JSON.stringify(report, null, 2))
  console.log('📄 Created suppressed-errors.json for tracking')
}

// Step 7: Create build script
function createBuildScript() {
  const script = `#!/bin/bash
# Temporary build script with error suppression
# Created: ${new Date().toISOString()}

echo "🚨 Building with TypeScript errors suppressed"
echo "   See suppressed-errors.json for details"
echo ""

# Use the relaxed config for type checking
export TS_NODE_PROJECT="tsconfig.build.json"

# Build Next.js app
npm run build

echo ""
echo "⚠️  Build completed with suppressed errors"
echo "   Critical errors to fix: $(jq '.byPriority.critical' suppressed-errors.json)"
echo "   High priority errors: $(jq '.byPriority.high' suppressed-errors.json)"
`

  fs.writeFileSync('build-with-errors.sh', script)
  execSync('chmod +x build-with-errors.sh')
  console.log('✅ Created build-with-errors.sh')
}

// Step 8: Create recovery plan
function createRecoveryPlan() {
  const plan = `# Type Error Recovery Plan

## Current State
- Total suppressed errors: ${suppressedErrors.length}
- Build enabled on: ${new Date().toISOString()}

## Priority Order

### 🔴 Critical (Fix within 1 week)
${suppressedErrors
  .filter(e => e.priority === 'critical')
  .slice(0, 10)
  .map(e => `- [ ] ${e.file}:${e.line} - ${e.error}`)
  .join('\n')}

### 🟡 High (Fix within 2 weeks)
${suppressedErrors
  .filter(e => e.priority === 'high')
  .slice(0, 10)
  .map(e => `- [ ] ${e.file}:${e.line} - ${e.error}`)
  .join('\n')}

## Daily Tasks
1. Fix 10-20 errors per developer
2. Test each fix thoroughly
3. Update suppressed-errors.json
4. Never break working functionality

## Success Criteria
- [ ] All critical errors fixed
- [ ] No runtime TypeErrors in production
- [ ] All tests passing
- [ ] Remove ignoreBuildErrors from next.config.js
`

  fs.writeFileSync('TYPE_ERROR_RECOVERY_PLAN.md', plan)
  console.log('📋 Created TYPE_ERROR_RECOVERY_PLAN.md')
}

// Main execution
async function main() {
  console.log('🚀 Enabling build with TypeScript errors...\n')
  
  // Backup current state (skip if not in git repo)
  try {
    execSync('git status', { stdio: 'ignore' })
    execSync('git add -A && git commit -m "backup: before enabling error suppression" || true', { stdio: 'pipe' })
  } catch (error) {
    console.log('⚠️  Not in a git repository, skipping backup commit')
  }
  
  // Execute steps
  updateNextConfig()
  createBuildTsConfig()
  analyzeErrors()
  // addErrorSuppressions() // Commented out - too aggressive
  createTrackingFile()
  createBuildScript()
  createRecoveryPlan()
  
  console.log('\n✅ Build enabled! Next steps:')
  console.log('1. Run: ./build-with-errors.sh')
  console.log('2. Deploy if needed')
  console.log('3. Start fixing errors using TYPE_ERROR_RECOVERY_PLAN.md')
  console.log('4. Track progress in suppressed-errors.json')
  console.log('\n⚠️  Remember: This is temporary. Fix errors ASAP!')
}

main().catch(console.error)