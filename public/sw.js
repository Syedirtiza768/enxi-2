// Service Worker for caching and performance optimization

const CACHE_NAME = 'enxi-erp-v1'
const STATIC_CACHE = 'enxi-static-v1'
const DYNAMIC_CACHE = 'enxi-dynamic-v1'

// Resources to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico'
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/dashboard/metrics',
  '/api/items',
  '/api/customers',
  '/api/suppliers'
]

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
}

// Route-specific cache strategies
const ROUTE_STRATEGIES = {
  '/api/dashboard': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  '/api/items': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  '/api/customers': CACHE_STRATEGIES.NETWORK_FIRST,
  '/api/sales-orders': CACHE_STRATEGIES.NETWORK_FIRST,
  '/_next/static/': CACHE_STRATEGIES.CACHE_FIRST,
  '/images/': CACHE_STRATEGIES.CACHE_FIRST
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Service Worker: Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with appropriate cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // Determine cache strategy based on route
  const strategy = getStrategyForRoute(url.pathname)

  event.respondWith(
    handleRequest(request, strategy)
  )
})

// Get cache strategy for a specific route
function getStrategyForRoute(pathname) {
  for (const [route, strategy] of Object.entries(ROUTE_STRATEGIES)) {
    if (pathname.startsWith(route)) {
      return strategy
    }
  }
  
  // Default strategy
  return CACHE_STRATEGIES.NETWORK_FIRST
}

// Handle request based on strategy
async function handleRequest(request, strategy) {
  const url = new URL(request.url)
  
  try {
    switch (strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request)
      
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request)
      
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return await staleWhileRevalidate(request)
      
      case CACHE_STRATEGIES.NETWORK_ONLY:
        return await fetch(request)
      
      case CACHE_STRATEGIES.CACHE_ONLY:
        return await caches.match(request)
      
      default:
        return await networkFirst(request)
    }
  } catch (error) {
    console.error('Service Worker: Error handling request', error)
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    
    // Return cached version if available
    return caches.match(request)
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  const networkResponse = await fetch(request)
  
  if (networkResponse.ok) {
    const cache = await caches.open(DYNAMIC_CACHE)
    cache.put(request, networkResponse.clone())
  }
  
  return networkResponse
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw error
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request)
  
  const networkResponse = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE)
        cache.then((c) => c.put(request, response.clone()))
      }
      return response
    })
    .catch(() => {
      // Network failed, return cached version
      return cachedResponse
    })
  
  return cachedResponse || networkResponse
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Retry failed requests from IndexedDB
      retryFailedRequests()
    )
  }
})

// Retry failed requests
async function retryFailedRequests() {
  // Implementation would depend on how you store failed requests
  console.log('Service Worker: Retrying failed requests')
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: data.data,
      actions: data.actions
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const data = event.notification.data
  
  event.waitUntil(
    clients.openWindow(data.url || '/')
  )
})

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_LOG') {
    console.log('Performance:', event.data.data)
  }
})

// Cache size management
async function manageCacheSize() {
  const cache = await caches.open(DYNAMIC_CACHE)
  const keys = await cache.keys()
  
  // Remove oldest entries if cache is too large
  if (keys.length > 100) {
    const oldestKeys = keys.slice(0, keys.length - 100)
    await Promise.all(oldestKeys.map(key => cache.delete(key)))
  }
}

// Run cache management periodically
setInterval(manageCacheSize, 60 * 60 * 1000) // Every hour