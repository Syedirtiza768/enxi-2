// Utility to handle chunk preloading and error recovery
export class ChunkPreloader {
  private static instance: ChunkPreloader
  private failedChunks: Set<string> = new Set()
  private retryAttempts: Map<string, number> = new Map()
  private maxRetries = 3

  static getInstance(): ChunkPreloader {
    if (!ChunkPreloader.instance) {
      ChunkPreloader.instance = new ChunkPreloader()
    }
    return ChunkPreloader.instance
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupErrorHandlers()
    }
  }

  private setupErrorHandlers() {
    // Intercept dynamic import errors
    const originalImport = window.System?.import || ((url: string) => import(url))
    
    if (window.System) {
      window.System.import = async (url: string) => {
        try {
          return await originalImport(url)
        } catch (error) {
          return this.handleChunkError(url, error, originalImport)
        }
      }
    }

    // Handle unhandled promise rejections for dynamic imports
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isChunkError(event.reason)) {
        event.preventDefault()
        console.warn('Chunk loading error intercepted:', event.reason)
        
        // Attempt recovery
        this.attemptRecovery()
      }
    })
  }

  private isChunkError(error: any): boolean {
    if (!error) return false
    
    const errorMessage = error.message || error.toString()
    return (
      error.name === 'ChunkLoadError' ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Unable to preload CSS') ||
      errorMessage.includes('Failed to import') ||
      errorMessage.includes('ChunkLoadError')
    )
  }

  private async handleChunkError(url: string, error: any, originalImport: Function): Promise<any> {
    const attempts = this.retryAttempts.get(url) || 0
    
    if (attempts >= this.maxRetries) {
      this.failedChunks.add(url)
      console.error(`Failed to load chunk after ${this.maxRetries} attempts:`, url)
      throw error
    }

    console.warn(`Retrying chunk load (attempt ${attempts + 1}/${this.maxRetries}):`, url)
    this.retryAttempts.set(url, attempts + 1)

    // Wait before retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000))

    try {
      // Clear any cached failure
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        )
      }

      // Retry the import
      const result = await originalImport(url)
      
      // Success - reset retry count
      this.retryAttempts.delete(url)
      return result
    } catch (retryError) {
      return this.handleChunkError(url, retryError, originalImport)
    }
  }

  private attemptRecovery() {
    // Check if we have too many failed chunks
    if (this.failedChunks.size > 5) {
      console.error('Too many chunk loading failures, recommending page reload')
      
      if (typeof window !== 'undefined') {
        const message = 'The application is having trouble loading. Would you like to refresh the page?'
        if (window.confirm(message)) {
          this.clearCacheAndReload()
        }
      }
    }
  }

  async clearCacheAndReload() {
    if (typeof window === 'undefined') return

    try {
      // Clear service worker caches
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
      }

      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      // Clear local storage
      localStorage.clear()
      sessionStorage.clear()

      // Force reload
      window.location.reload()
    } catch (error) {
      console.error('Error during cache clear:', error)
      // Fallback to simple reload
      window.location.reload()
    }
  }

  // Preload critical chunks
  async preloadChunks(chunkUrls: string[]) {
    const preloadPromises = chunkUrls.map(async (url) => {
      try {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'script'
        link.href = url
        document.head.appendChild(link)
        
        // Also attempt to fetch to warm the cache
        await fetch(url, { 
          mode: 'no-cors',
          cache: 'force-cache'
        })
      } catch (error) {
        console.warn('Failed to preload chunk:', url, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  // Get diagnostics
  getDiagnostics() {
    return {
      failedChunks: Array.from(this.failedChunks),
      retryAttempts: Array.from(this.retryAttempts.entries()),
      totalFailures: this.failedChunks.size
    }
  }
}

// Initialize on import
if (typeof window !== 'undefined') {
  ChunkPreloader.getInstance()
}

// Export utility functions
export const chunkPreloader = ChunkPreloader.getInstance()

export function withChunkErrorHandling<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  componentName?: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await asyncFn(...args)
    } catch (error) {
      if (chunkPreloader['isChunkError'](error)) {
        console.error(`Chunk loading error in ${componentName || 'component'}:`, error)
        
        // Attempt recovery
        chunkPreloader['attemptRecovery']()
        
        // Re-throw for error boundary to catch
        throw new Error(`Failed to load required resources for ${componentName || 'this component'}. Please refresh the page.`)
      }
      
      throw error
    }
  }) as T
}