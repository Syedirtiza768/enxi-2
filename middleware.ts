import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',   // Logout endpoint
  '/api/auth/register',
  '/api/auth/validate', // Token validation endpoint
  '/api/health',        // Health check endpoint
  '/api/system/health', // System health check
  '/api/system/errors', // System error reports
  '/api/system/auto-fix', // System auto-fix
  '/api/system/route-test', // Route testing system
  '/api/test-wrapper',  // Test route
  '/api/test-auth',     // Test auth route
  '/_next',            // Next.js internals
  '/favicon.ico',      // Favicon
  '/robots.txt'        // SEO file
]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname


  // Allow public routes
  if (publicRoutes.some(route => path.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow root path to redirect to dashboard
  if (path === '/') {
    return NextResponse.next()
  }

  // Check for token in cookies OR Authorization header
  const cookieToken = request.cookies.get('auth-token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
  const token = cookieToken || bearerToken
  

  if (!token) {
    // For API routes, return 401
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // For pages, redirect to login
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  // Token exists, let the request proceed
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}