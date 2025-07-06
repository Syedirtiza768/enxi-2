'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Text, VStack, HStack, Badge } from '@/components/design-system'
import { Activity, Wifi, WifiOff, Zap } from 'lucide-react'

interface PerformanceMetrics {
  renderTime: number
  loadTime: number
  networkStatus: 'online' | 'offline'
  connectionType: string
  isSlowConnection: boolean
  memoryUsage?: number
}

export function PerformanceMonitor({ showDetailed = false }: { showDetailed?: boolean }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    loadTime: 0,
    networkStatus: 'online',
    connectionType: 'unknown',
    isSlowConnection: false
  })

  useEffect(() => {
    const startTime = Date.now()

    // Monitor network status
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      setMetrics(prev => ({
        ...prev,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        connectionType: connection?.effectiveType || 'unknown',
        isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
        renderTime: Date.now() - startTime
      }))
    }

    // Initial check
    updateNetworkStatus()

    // Monitor performance
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        setMetrics(prev => ({
          ...prev,
          loadTime: navigation.loadEventEnd - navigation.fetchStart
        }))
      }

      // Monitor memory usage if available
      if ((performance as any).memory) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024)
        }))
      }
    }

    // Listen for network changes
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  if (!showDetailed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="p-2 shadow-lg border">
          <HStack gap="xs" align="center">
            {metrics.networkStatus === 'online' ? (
              <Wifi className={`h-4 w-4 ${metrics.isSlowConnection ? 'text-orange-500' : 'text-green-500'}`} />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            {metrics.isSlowConnection && (
              <Badge variant="secondary" size="xs">Slow</Badge>
            )}
          </HStack>
        </Card>
      </div>
    )
  }

  return (
    <Card className="p-4">
      <VStack gap="md">
        <HStack gap="sm" align="center">
          <Activity className="h-5 w-5 text-blue-500" />
          <Text weight="semibold">Performance Metrics</Text>
        </HStack>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <VStack gap="xs">
            <Text size="xs" color="secondary">Render Time</Text>
            <Text size="sm" weight="medium">{metrics.renderTime}ms</Text>
          </VStack>

          <VStack gap="xs">
            <Text size="xs" color="secondary">Load Time</Text>
            <Text size="sm" weight="medium">{metrics.loadTime}ms</Text>
          </VStack>

          <VStack gap="xs">
            <Text size="xs" color="secondary">Network</Text>
            <HStack gap="xs" align="center">
              {metrics.networkStatus === 'online' ? (
                <Wifi className={`h-4 w-4 ${metrics.isSlowConnection ? 'text-orange-500' : 'text-green-500'}`} />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Text size="sm" weight="medium" className="capitalize">
                {metrics.connectionType}
              </Text>
            </HStack>
          </VStack>

          {metrics.memoryUsage && (
            <VStack gap="xs">
              <Text size="xs" color="secondary">Memory</Text>
              <HStack gap="xs" align="center">
                <Zap className="h-4 w-4 text-purple-500" />
                <Text size="sm" weight="medium">{metrics.memoryUsage}MB</Text>
              </HStack>
            </VStack>
          )}
        </div>

        {metrics.isSlowConnection && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <HStack gap="sm" align="center">
              <WifiOff className="h-4 w-4 text-orange-600" />
              <Text size="sm" color="secondary">
                Slow connection detected. Some features may be limited.
              </Text>
            </HStack>
          </div>
        )}
      </VStack>
    </Card>
  )
}

// Hook for performance optimization based on network conditions
export function usePerformanceOptimization() {
  const [shouldOptimize, setShouldOptimize] = useState(false)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (connection) {
      const updateConnection = () => {
        const effectiveType = connection.effectiveType
        setConnectionType(effectiveType)
        setShouldOptimize(effectiveType === 'slow-2g' || effectiveType === '2g')
      }

      updateConnection()
      connection.addEventListener('change', updateConnection)

      return () => {
        connection.removeEventListener('change', updateConnection)
      }
    }
  }, [])

  return {
    shouldOptimize,
    connectionType,
    isSlowConnection: shouldOptimize,
    // Optimization strategies
    shouldPreloadImages: !shouldOptimize,
    shouldUseLazyLoading: shouldOptimize,
    shouldReduceAnimations: shouldOptimize,
    chartHeight: shouldOptimize ? 200 : 300,
    maxVisibleItems: shouldOptimize ? 5 : 10
  }
}