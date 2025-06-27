'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function ChunkErrorRecovery() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Listen for chunk loading errors
    const handleChunkError = (event: CustomEvent) => {
      console.error('Chunk loading error detected:', event.detail)
      
      // Try to recover by refreshing the router
      router.refresh()
    }

    // Listen for navigation errors
    const handleNavigationError = (error: Error) => {
      if (
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('ChunkLoadError')
      ) {
        console.warn('Navigation chunk error, attempting recovery...')
        
        // Clear module cache if possible
        if ('webpackChunkName' in window) {
          delete (window as any).webpackChunkName
        }
        
        // Attempt to navigate again after a delay
        setTimeout(() => {
          router.push(pathname)
        }, 1000)
      }
    }

    // Set up event listeners
    window.addEventListener('chunkloaderror', handleChunkError as any)
    
    // Override Next.js error handling for chunk errors
    const originalError = window.onerror
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      if (error && error.message && error.message.includes('ChunkLoadError')) {
        handleNavigationError(error)
        return true // Prevent default error handling
      }
      
      if (originalError) {
        return originalError(msg, url, lineNo, columnNo, error)
      }
      return false
    }

    return () => {
      window.removeEventListener('chunkloaderror', handleChunkError as any)
      window.onerror = originalError
    }
  }, [router, pathname])

  return null
}