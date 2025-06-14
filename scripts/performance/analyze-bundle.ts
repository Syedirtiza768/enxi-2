#!/usr/bin/env tsx

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface BundleStats {
  bundleSize: number
  chunkSizes: Record<string, number>
  duplicatePackages: string[]
  largestPackages: Array<{ name: string; size: number }>
  recommendations: string[]
}

async function analyzeBundleSize(): Promise<BundleStats> {
  console.log('🔍 Analyzing bundle size...')
  
  // Build the application with analysis
  console.log('Building application...')
  execSync('npm run build:analyze', { stdio: 'inherit' })
  
  const buildDir = path.join(process.cwd(), '.next/static/chunks')
  const stats: BundleStats = {
    bundleSize: 0,
    chunkSizes: {},
    duplicatePackages: [],
    largestPackages: [],
    recommendations: []
  }
  
  // Analyze chunk sizes
  if (fs.existsSync(buildDir)) {
    const files = fs.readdirSync(buildDir)
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const filePath = path.join(buildDir, file)
        const stat = fs.statSync(filePath)
        const sizeKB = Math.round(stat.size / 1024)
        
        stats.chunkSizes[file] = sizeKB
        stats.bundleSize += sizeKB
        
        console.log(`📦 ${file}: ${sizeKB}KB`)
      }
    }
  }
  
  // Analyze largest packages
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const largeDependencies = Object.keys(dependencies)
      .filter(dep => {
        // Known large packages
        const largePackages = [
          '@react-pdf/renderer',
          'html2canvas',
          'jspdf',
          'xlsx',
          'archiver'
        ]
        return largePackages.includes(dep)
      })
      .map(dep => ({ name: dep, size: 0 })) // Size would need to be calculated properly
    
    stats.largestPackages = largeDependencies
  } catch (error) {
    console.warn('Could not analyze package sizes:', error)
  }
  
  // Generate recommendations
  stats.recommendations = generateRecommendations(stats)
  
  return stats
}

function generateRecommendations(stats: BundleStats): string[] {
  const recommendations: string[] = []
  
  if (stats.bundleSize > 1000) {
    recommendations.push('Bundle size is large (>1MB). Consider code splitting.')
  }
  
  if (Object.values(stats.chunkSizes).some(size => size > 500)) {
    recommendations.push('Some chunks are large (>500KB). Consider splitting them further.')
  }
  
  if (stats.largestPackages.length > 0) {
    recommendations.push('Consider lazy loading large packages like PDF generators and Excel exporters.')
  }
  
  recommendations.push('Implement dynamic imports for heavy components.')
  recommendations.push('Use Next.js Image component for optimized images.')
  recommendations.push('Enable gzip/brotli compression on your server.')
  
  return recommendations
}

async function checkUnusedDependencies(): Promise<boolean> {
  console.log('🧹 Checking for unused dependencies...')
  
  try {
    // This would require depcheck package
    // execSync('npx depcheck', { stdio: 'inherit' })
    console.log('ℹ️  Install depcheck to analyze unused dependencies: npm install -g depcheck')
  } catch (error) {
    console.warn('Could not check unused dependencies:', error)
  }
}

async function analyzeTreeShaking(): Promise<void> {
  console.log('🌳 Analyzing tree shaking opportunities...')
  
  const opportunities = [
    'lodash - Use lodash-es or individual function imports',
    'moment - Consider switching to date-fns or dayjs',
    'material-ui - Use individual component imports',
    'antd - Use individual component imports',
    'react-icons - Use individual icon imports'
  ]
  
  console.log('Tree shaking opportunities:')
  opportunities.forEach(opp => console.log(`  • ${opp}`))
}

async function generatePerformanceReport(): Promise<void> {
  console.log('📊 Generating performance report...')
  
  const stats = await analyzeBundleSize()
  await checkUnusedDependencies()
  await analyzeTreeShaking()
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    bundleAnalysis: stats,
    summary: {
      totalBundleSize: `${stats.bundleSize}KB`,
      numberOfChunks: Object.keys(stats.chunkSizes).length,
      largestChunk: Math.max(...Object.values(stats.chunkSizes)),
      recommendations: stats.recommendations.length
    }
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'performance-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log('\n📈 Performance Report Summary:')
  console.log(`Total Bundle Size: ${report.summary.totalBundleSize}`)
  console.log(`Number of Chunks: ${report.summary.numberOfChunks}`)
  console.log(`Largest Chunk: ${report.summary.largestChunk}KB`)
  console.log(`Recommendations: ${report.summary.recommendations}`)
  console.log(`\nFull report saved to: ${reportPath}`)
  
  // Display recommendations
  if (stats.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    stats.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })
  }
}

if (require.main === module) {
  generatePerformanceReport().catch(console.error)
}

export { analyzeBundleSize, generatePerformanceReport }