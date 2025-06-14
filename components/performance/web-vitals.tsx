'use client'

import React, { useEffect } from 'react'

function sendToAnalytics(metric: unknown): void {
  // Send to your analytics service
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric)
  }
  
  // Example: Send to Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', 'Web Vitals', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    })
  }
}

export function WebVitals(): null {
  useEffect(() => {
    // Only load web-vitals in production and when available
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(sendToAnalytics)
        getFID(sendToAnalytics)
        getFCP(sendToAnalytics)
        getLCP(sendToAnalytics)
        getTTFB(sendToAnalytics)
      }).catch(() => {
        // Fallback to manual performance monitoring
        console.log('Web Vitals not available, using fallback monitoring')
        if (window.performance) {
          const observer = new PerformanceObserver((list): void => {
            list.getEntries().forEach((entry) => {
              sendToAnalytics({
                name: entry.name,
                value: entry.startTime,
                rating: 'good',
                delta: entry.duration,
                id: entry.entryType
              })
            })
          })
          
          observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] })
        }
      })
    }
  }, [])

  return null
}

// Performance monitoring hook
export function usePerformanceMonitor(): void {
  useEffect(() => {
    // Monitor bundle size
    if (typeof window !== 'undefined' && window.performance) {
      const observer = new PerformanceObserver((list): void => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navigationEntry = entry as PerformanceNavigationTiming
            console.log('Navigation timing:', {
              dns: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
              connect: navigationEntry.connectEnd - navigationEntry.connectStart,
              ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
              download: navigationEntry.responseEnd - navigationEntry.responseStart,
              domInteractive: navigationEntry.domInteractive - navigationEntry.fetchStart,
              domComplete: navigationEntry.domComplete - navigationEntry.fetchStart,
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['navigation'] })
      
      return (): void => observer.disconnect()
    }
  }, [])
}