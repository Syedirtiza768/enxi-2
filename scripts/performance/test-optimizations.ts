#!/usr/bin/env tsx

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface OptimizationTest {
  name: string
  description: string
  test: () => Promise<boolean>
  recommendation: string
}

const tests: OptimizationTest[] = [
  {
    name: 'Bundle Analysis',
    description: 'Check if bundle analysis tools are configured',
    test: async () => {
      const nextConfig = fs.readFileSync('next.config.ts', 'utf8')
      return nextConfig.includes('@next/bundle-analyzer')
    },
    recommendation: 'Bundle analysis tools are configured for monitoring bundle size'
  },
  
  {
    name: 'Code Splitting',
    description: 'Verify dynamic imports are implemented',
    test: async () => {
      const dynamicImportsFile = path.join(process.cwd(), 'lib/utils/dynamic-imports.ts')
      return fs.existsSync(dynamicImportsFile)
    },
    recommendation: 'Dynamic imports utility is available for route-based code splitting'
  },
  
  {
    name: 'Image Optimization',
    description: 'Check if optimized image component exists',
    test: async () => {
      const optimizedImageFile = path.join(process.cwd(), 'components/ui/optimized-image.tsx')
      return fs.existsSync(optimizedImageFile)
    },
    recommendation: 'Optimized image component is available with lazy loading and WebP support'
  },
  
  {
    name: 'Performance Monitoring',
    description: 'Verify Web Vitals monitoring is configured',
    test: async () => {
      const webVitalsFile = path.join(process.cwd(), 'components/performance/web-vitals.tsx')
      return fs.existsSync(webVitalsFile)
    },
    recommendation: 'Performance monitoring with Web Vitals is configured'
  },
  
  {
    name: 'Database Optimization',
    description: 'Check if query optimizer is available',
    test: async () => {
      const queryOptimizerFile = path.join(process.cwd(), 'lib/db/query-optimizer.ts')
      return fs.existsSync(queryOptimizerFile)
    },
    recommendation: 'Database query optimizer with caching is available'
  },
  
  {
    name: 'Lazy Loading Components',
    description: 'Verify lazy loading utilities exist',
    test: async () => {
      const lazyLoadingFile = path.join(process.cwd(), 'lib/utils/lazy-loading.tsx')
      return fs.existsSync(lazyLoadingFile)
    },
    recommendation: 'Lazy loading utilities are available for component optimization'
  },
  
  {
    name: 'Service Worker',
    description: 'Check if service worker for caching exists',
    test: async () => {
      const swFile = path.join(process.cwd(), 'public/sw.js')
      return fs.existsSync(swFile)
    },
    recommendation: 'Service worker is configured for caching and offline support'
  },
  
  {
    name: 'Build Optimizations',
    description: 'Verify Next.js optimizations are configured',
    test: async () => {
      const nextConfig = fs.readFileSync('next.config.ts', 'utf8')
      return nextConfig.includes('optimizePackageImports') && 
             nextConfig.includes('swcMinify') &&
             nextConfig.includes('compress')
    },
    recommendation: 'Build optimizations including tree shaking and compression are configured'
  },
  
  {
    name: 'Component Memoization',
    description: 'Check if optimized components use React.memo',
    test: async () => {
      const optimizedComponentsDir = path.join(process.cwd(), 'components')
      const files = fs.readdirSync(optimizedComponentsDir, { recursive: true })
      
      const memoizedFiles = files.filter(file => {
        if (typeof file !== 'string' || !file.endsWith('.tsx')) return false
        const fullPath = path.join(optimizedComponentsDir, file)
        const content = fs.readFileSync(fullPath, 'utf8')
        return content.includes('memo(') || content.includes('React.memo')
      })
      
      return memoizedFiles.length > 0
    },
    recommendation: 'Components are optimized with React.memo for reduced re-renders'
  },
  
  {
    name: 'Virtual Scrolling',
    description: 'Check if react-window is installed for large lists',
    test: async () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      return !!packageJson.dependencies['react-window']
    },
    recommendation: 'Virtual scrolling is available for large lists optimization'
  }
]

async function runOptimizationTests(): Promise<void> {
  console.log('🚀 Running Performance Optimization Tests...\n')
  
  const results = {
    passed: 0,
    failed: 0,
    total: tests.length,
    details: [] as Array<{ name: string; passed: boolean; recommendation: string }>
  }
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`)
      const passed = await test.test()
      
      if (passed) {
        console.log(`✅ ${test.name}: PASSED`)
        results.passed++
      } else {
        console.log(`❌ ${test.name}: FAILED`)
        results.failed++
      }
      
      results.details.push({
        name: test.name,
        passed,
        recommendation: test.recommendation
      })
      
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error}`)
      results.failed++
      results.details.push({
        name: test.name,
        passed: false,
        recommendation: test.recommendation
      })
    }
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log(`✅ Passed: ${results.passed}/${results.total}`)
  console.log(`❌ Failed: ${results.failed}/${results.total}`)
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`)
  
  console.log('\n💡 Optimization Status:')
  results.details.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.name}: ${result.recommendation}`)
  })
  
  // Generate optimization report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: Math.round((results.passed / results.total) * 100)
    },
    tests: results.details,
    recommendations: generateRecommendations(results)
  }
  
  const reportPath = path.join(process.cwd(), 'optimization-test-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`\n📋 Detailed report saved to: ${reportPath}`)
  
  return report
}

function generateRecommendations(results: any): string[] {
  const recommendations: string[] = []
  
  const failedTests = results.details.filter((test: any) => !test.passed)
  
  if (failedTests.length === 0) {
    recommendations.push('🎉 All optimization tests passed! Your application is well-optimized.')
    recommendations.push('💡 Consider running performance audits regularly to maintain optimization.')
    recommendations.push('🔄 Monitor bundle size growth during development.')
  } else {
    recommendations.push('⚡ Immediate Actions Required:')
    failedTests.forEach((test: any) => {
      recommendations.push(`  • ${test.name}: ${test.recommendation}`)
    })
  }
  
  // Additional recommendations based on results
  const passRate = results.passed / results.total
  
  if (passRate >= 0.8) {
    recommendations.push('✨ Your application has good optimization coverage.')
    recommendations.push('🎯 Focus on monitoring and maintaining current optimizations.')
  } else if (passRate >= 0.6) {
    recommendations.push('⚠️  Your application needs optimization improvements.')
    recommendations.push('🔧 Focus on implementing the failed optimizations.')
  } else {
    recommendations.push('🚨 Your application requires significant optimization work.')
    recommendations.push('📚 Consider reviewing the performance optimization guide.')
    recommendations.push('🏃‍♂️ Start with high-impact optimizations like code splitting and lazy loading.')
  }
  
  return recommendations
}

async function measureBuildPerformance(): Promise<unknown> {
  console.log('\n⏱️  Measuring build performance...')
  
  try {
    const start = Date.now()
    execSync('npm run build', { stdio: 'pipe' })
    const buildTime = Date.now() - start
    
    console.log(`🏗️  Build completed in ${(buildTime / 1000).toFixed(2)}s`)
    
    // Analyze build output
    const buildDir = path.join(process.cwd(), '.next')
    if (fs.existsSync(buildDir)) {
      const staticDir = path.join(buildDir, 'static')
      if (fs.existsSync(staticDir)) {
        const chunks = fs.readdirSync(path.join(staticDir, 'chunks'))
        const totalChunks = chunks.filter(file => file.endsWith('.js')).length
        
        console.log(`📦 Generated ${totalChunks} JavaScript chunks`)
        
        return {
          buildTime,
          totalChunks,
          buildSuccess: true
        }
      }
    }
    
    return { buildTime, buildSuccess: true }
  } catch (error) {
    console.log(`❌ Build failed: ${error}`)
    return { buildTime: -1, buildSuccess: false }
  }
}

async function runComprehensiveTest(): Promise<void> {
  console.log('🔥 Running Comprehensive Performance Optimization Test\n')
  
  // Run optimization tests
  const optimizationResults = await runOptimizationTests()
  
  // Measure build performance
  const buildResults = await measureBuildPerformance()
  
  // Generate final report
  const finalReport = {
    timestamp: new Date().toISOString(),
    optimization: optimizationResults,
    build: buildResults,
    overallScore: calculateOverallScore(optimizationResults, buildResults)
  }
  
  console.log('\n🏆 Overall Performance Score:')
  console.log(`📊 Score: ${finalReport.overallScore}/100`)
  
  if (finalReport.overallScore >= 80) {
    console.log('🥇 Excellent! Your application is well-optimized.')
  } else if (finalReport.overallScore >= 60) {
    console.log('🥈 Good! Some optimizations needed.')
  } else {
    console.log('🥉 Needs improvement. Focus on key optimizations.')
  }
  
  const finalReportPath = path.join(process.cwd(), 'comprehensive-performance-report.json')
  fs.writeFileSync(finalReportPath, JSON.stringify(finalReport, null, 2))
  
  console.log(`\n📋 Comprehensive report saved to: ${finalReportPath}`)
  
  return finalReport
}

function calculateOverallScore(optimizationResults: any, buildResults: any): number {
  let score = 0
  
  // Optimization score (70% weight)
  const optimizationScore = (optimizationResults.summary.passed / optimizationResults.summary.totalTests) * 70
  score += optimizationScore
  
  // Build performance score (30% weight)
  if (buildResults.buildSuccess) {
    let buildScore = 30
    
    // Penalize slow builds
    if (buildResults.buildTime > 60000) { // > 1 minute
      buildScore = 20
    } else if (buildResults.buildTime > 30000) { // > 30 seconds
      buildScore = 25
    }
    
    score += buildScore
  }
  
  return Math.round(score)
}

if (require.main === module) {
  runComprehensiveTest().catch(console.error)
}

export { runOptimizationTests, measureBuildPerformance, runComprehensiveTest }