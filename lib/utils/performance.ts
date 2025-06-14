// Performance utilities for monitoring and optimization

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Mark performance points
  mark(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(name)
      this.marks.set(name, performance.now())
    }
  }

  // Measure performance between two marks
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (typeof performance === 'undefined') return null

    try {
      const startTime = this.marks.get(startMark)
      const endTime = endMark ? this.marks.get(endMark) : performance.now()
      
      if (startTime !== undefined && endTime !== undefined) {
        const duration = endTime - startTime
        this.measures.set(name, duration)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
        }
        
        return duration
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error)
    }
    
    return null
  }

  // Get all measurements
  getAllMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures)
  }

  // Clear all marks and measures
  clear(): void {
    this.marks.clear()
    this.measures.clear()
    
    if (typeof performance !== 'undefined') {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }
}

// Bundle size monitoring
export const bundleAnalyzer = {
  logChunkSizes: () => {
    if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
      const buildId = window.__NEXT_DATA__.buildId
      console.log('Build ID:', buildId)
      
      // Log loaded scripts
      const scripts = document.querySelectorAll('script[src]')
      scripts.forEach((script) => {
        const src = (script as HTMLScriptElement).src
        if (src.includes('/_next/static/')) {
          console.log('Loaded script:', src)
        }
      })
    }
  },

  // Monitor chunk loading
  monitorChunkLoading: () => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const [url] = args
        const isChunk = typeof url === 'string' && url.includes('/_next/static/chunks/')
        
        if (isChunk) {
          const start = performance.now()
          const response = await originalFetch(...args)
          const end = performance.now()
          
          console.log(`Chunk loaded: ${url} (${(end - start).toFixed(2)}ms)`)
          return response
        }
        
        return originalFetch(...args)
      }
    }
  }
}

// Component performance tracking
export function withPerformanceTracking<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
) {
  const PerformanceTrackedComponent = (props: T) => {
    const monitor = PerformanceMonitor.getInstance()
    
    React.useEffect(() => {
      monitor.mark(`${componentName}-mount-start`)
      
      return () => {
        monitor.mark(`${componentName}-unmount`)
        monitor.measure(
          `${componentName}-total-lifetime`,
          `${componentName}-mount-start`,
          `${componentName}-unmount`
        )
      }
    }, [monitor])

    return React.createElement(WrappedComponent, props)
  }

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${componentName})`
  return PerformanceTrackedComponent
}

// Database query performance monitoring
export class QueryPerformanceMonitor {
  private static queries: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map()

  static trackQuery(queryName: string, duration: number): void {
    const existing = this.queries.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 }
    
    existing.count += 1
    existing.totalTime += duration
    existing.avgTime = existing.totalTime / existing.count
    
    this.queries.set(queryName, existing)

    if (process.env.NODE_ENV === 'development') {
      console.log(`Query: ${queryName} took ${duration.toFixed(2)}ms (avg: ${existing.avgTime.toFixed(2)}ms)`)
    }
  }

  static getQueryStats(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.queries)
  }

  static getSlowestQueries(limit = 10): Array<{ name: string; avgTime: number; count: number }> {
    return Array.from(this.queries.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit)
  }
}

// Memory usage monitoring
export const memoryMonitor = {
  logMemoryUsage: () => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      console.log('Memory usage:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      })
    }
  },

  // Track component memory leaks
  trackComponentMemory: (componentName: string) => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      const memoryUsed = memory.usedJSHeapSize
      
      console.log(`${componentName} memory: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`)
      return memoryUsed
    }
    return 0
  }
}

// API response caching
export class ResponseCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  static set(key: string, data: any, ttlMs = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  static get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cached.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  static clear(): void {
    this.cache.clear()
  }

  static size(): number {
    return this.cache.size
  }
}

// Debounced search utility
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Component render optimization
export const renderOptimizations = {
  // Shallow comparison for props
  shallowEqual: (obj1: any, obj2: any): boolean => {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false
      }
    }

    return true
  },

  // Memoize expensive calculations
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map()
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args)
      
      if (cache.has(key)) {
        return cache.get(key)
      }
      
      const result = fn(...args)
      cache.set(key, result)
      return result
    }) as T
  }
}

// Export performance monitoring instance
export const performanceMonitor = PerformanceMonitor.getInstance()