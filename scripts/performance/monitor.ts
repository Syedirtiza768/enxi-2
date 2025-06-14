#!/usr/bin/env tsx

import { performanceMonitor, memoryMonitor } from '@/lib/utils/performance'

interface PerformanceMetrics {
  memoryUsage: {
    used: string
    total: string
    limit: string
  }
  loadTime: number
  renderTime: number
  apiResponseTimes: Record<string, number>
  bundleMetrics: {
    scriptCount: number
    totalSize: number
    largestScript: string
  }
}

async function collectMetrics(): Promise<PerformanceMetrics> {
  console.log('📊 Collecting performance metrics...')
  
  const metrics: PerformanceMetrics = {
    memoryUsage: {
      used: '0 MB',
      total: '0 MB',
      limit: '0 MB'
    },
    loadTime: 0,
    renderTime: 0,
    apiResponseTimes: {},
    bundleMetrics: {
      scriptCount: 0,
      totalSize: 0,
      largestScript: ''
    }
  }

  // Simulate performance monitoring
  if (typeof performance !== 'undefined') {
    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart
      metrics.renderTime = navigation.domContentLoadedEventEnd - navigation.fetchStart
    }

    // Get memory usage (Chrome only)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      metrics.memoryUsage = {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      }
    }
  }

  return metrics
}

async function analyzeScripts(): Promise<unknown> {
  console.log('🔍 Analyzing loaded scripts...')
  
  const scripts = Array.from(document.querySelectorAll('script[src]'))
  let totalSize = 0
  let largestScript = ''
  let largestSize = 0

  for (const script of scripts) {
    const src = (script as HTMLScriptElement).src
    if (src.includes('/_next/static/')) {
      try {
        const response = await fetch(src, { method: 'HEAD' })
        const size = parseInt(response.headers.get('content-length') || '0')
        totalSize += size
        
        if (size > largestSize) {
          largestSize = size
          largestScript = src.split('/').pop() || src
        }
      } catch (error) {
        console.warn('Could not fetch script size:', src)
      }
    }
  }

  return {
    scriptCount: scripts.length,
    totalSize: Math.round(totalSize / 1024), // KB
    largestScript
  }
}

async function measureAPIPerformance(): Promise<unknown> {
  console.log('🌐 Measuring API performance...')
  
  const endpoints = [
    '/api/dashboard/metrics',
    '/api/customers',
    '/api/items',
    '/api/sales-orders'
  ]

  const results: Record<string, number> = {}

  for (const endpoint of endpoints) {
    try {
      const start = performance.now()
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'HEAD'
      })
      const end = performance.now()
      
      if (response.ok) {
        results[endpoint] = Math.round(end - start)
      }
    } catch (error) {
      console.warn(`Could not measure ${endpoint}:`, error)
      results[endpoint] = -1
    }
  }

  return results
}

async function generateOptimizationSuggestions(metrics: PerformanceMetrics) {
  const suggestions: string[] = []

  if (metrics.loadTime > 3000) {
    suggestions.push('Page load time is slow (>3s). Consider code splitting and lazy loading.')
  }

  if (metrics.renderTime > 1500) {
    suggestions.push('Render time is slow (>1.5s). Optimize critical rendering path.')
  }

  if (metrics.bundleMetrics.totalSize > 1000) {
    suggestions.push('Bundle size is large (>1MB). Implement tree shaking and remove unused code.')
  }

  if (metrics.bundleMetrics.scriptCount > 20) {
    suggestions.push('Too many script files. Consider bundling and compression.')
  }

  const slowAPIs = Object.entries(metrics.apiResponseTimes)
    .filter(([, time]) => time > 500)
    .map(([endpoint]) => endpoint)

  if (slowAPIs.length > 0) {
    suggestions.push(`Slow API endpoints detected: ${slowAPIs.join(', ')}. Consider caching and optimization.`)
  }

  return suggestions
}

async function runPerformanceMonitoring(): Promise<unknown> {
  console.log('🚀 Starting performance monitoring...')
  
  const startTime = Date.now()
  
  try {
    // Collect basic metrics
    const metrics = await collectMetrics()
    
    // Analyze bundle metrics (browser only)
    if (typeof window !== 'undefined') {
      metrics.bundleMetrics = await analyzeScripts()
    }
    
    // Measure API performance
    if (typeof fetch !== 'undefined') {
      metrics.apiResponseTimes = await measureAPIPerformance()
    }
    
    // Generate suggestions
    const suggestions = await generateOptimizationSuggestions(metrics)
    
    // Create report
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      suggestions,
      executionTime: Date.now() - startTime
    }
    
    // Log results
    console.log('\n📈 Performance Report:')
    console.log('Memory Usage:', metrics.memoryUsage)
    console.log('Load Time:', `${metrics.loadTime}ms`)
    console.log('Render Time:', `${metrics.renderTime}ms`)
    console.log('Bundle Size:', `${metrics.bundleMetrics.totalSize}KB`)
    console.log('Script Count:', metrics.bundleMetrics.scriptCount)
    
    if (Object.keys(metrics.apiResponseTimes).length > 0) {
      console.log('\nAPI Response Times:')
      Object.entries(metrics.apiResponseTimes).forEach(([endpoint, time]) => {
        console.log(`  ${endpoint}: ${time}ms`)
      })
    }
    
    if (suggestions.length > 0) {
      console.log('\n💡 Optimization Suggestions:')
      suggestions.forEach((suggestion, i) => {
        console.log(`  ${i + 1}. ${suggestion}`)
      })
    }
    
    // Save report if in Node.js environment
    if (typeof require !== 'undefined') {
      const fs = require('fs')
      const path = require('path')
      
      const reportPath = path.join(process.cwd(), 'performance-monitoring-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`\nReport saved to: ${reportPath}`)
    }
    
    return report
    
  } catch (error) {
    console.error('Performance monitoring failed:', error)
    throw error
  }
}

// Memory leak detection
function detectMemoryLeaks() {
  console.log('🔍 Checking for memory leaks...')
  
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    const initialMemory = (window.performance as any).memory.usedJSHeapSize
    
    setTimeout(() => {
      const currentMemory = (window.performance as any).memory.usedJSHeapSize
      const memoryIncrease = currentMemory - initialMemory
      
      if (memoryIncrease > 10 * 1024 * 1024) { // 10MB increase
        console.warn('Potential memory leak detected:', {
          initial: `${(initialMemory / 1024 / 1024).toFixed(2)} MB`,
          current: `${(currentMemory / 1024 / 1024).toFixed(2)} MB`,
          increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`
        })
      }
    }, 30000) // Check after 30 seconds
  }
}

// Continuous monitoring
function startContinuousMonitoring(intervalMs = 60000) {
  console.log('🔄 Starting continuous performance monitoring...')
  
  detectMemoryLeaks()
  
  setInterval(async () => {
    try {
      await runPerformanceMonitoring()
    } catch (error) {
      console.error('Continuous monitoring error:', error)
    }
  }, intervalMs)
}

if (require.main === module) {
  runPerformanceMonitoring().catch(console.error)
}

export { 
  runPerformanceMonitoring, 
  startContinuousMonitoring, 
  detectMemoryLeaks,
  collectMetrics 
}