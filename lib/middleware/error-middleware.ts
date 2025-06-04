/**
 * Error Handling Middleware for API Routes
 * Automatically catches and handles errors in API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '../utils/error-handler'

// Type for API route handler
type ApiHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse

// Type for API route handler with params
type ApiHandlerWithParams = (
  request: NextRequest,
  context: { params: any }
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper function that adds error handling to API routes
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      // Add request context for better error logging
      const errorContext = {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: new Date().toISOString(),
        params: context?.params
      }
      
      return handleApiError(error, errorContext)
    }
  }
}

/**
 * Wrapper function for API routes with params
 */
export function withErrorHandlerParams(handler: ApiHandlerWithParams): ApiHandlerWithParams {
  return async (request: NextRequest, context: { params: any }) => {
    try {
      return await handler(request, context)
    } catch (error) {
      // Add request context for better error logging
      const errorContext = {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: new Date().toISOString(),
        params: context.params
      }
      
      return handleApiError(error, errorContext)
    }
  }
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceMonitoring(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now()
    
    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime
      
      // Log slow requests (> 2 seconds)
      if (duration > 2000) {
        console.warn('🐌 Slow API request detected:', {
          method: request.method,
          url: request.url,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        })
      }
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ API request failed:', {
        method: request.method,
        url: request.url,
        duration: `${duration}ms`,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      })
      
      throw error
    }
  }
}

/**
 * Combined wrapper with error handling and performance monitoring
 */
export function withApiWrapper(handler: ApiHandler): ApiHandler {
  return withErrorHandler(withPerformanceMonitoring(handler))
}

/**
 * Combined wrapper with params
 */
export function withApiWrapperParams(handler: ApiHandlerWithParams): ApiHandlerWithParams {
  return withErrorHandlerParams(handler)
}

// Export convenience functions for different HTTP methods
export const withGET = withApiWrapper
export const withPOST = withApiWrapper
export const withPUT = withApiWrapper
export const withDELETE = withApiWrapper
export const withPATCH = withApiWrapper

export const withGETParams = withApiWrapperParams
export const withPOSTParams = withApiWrapperParams
export const withPUTParams = withApiWrapperParams
export const withDELETEParams = withApiWrapperParams
export const withPATCHParams = withApiWrapperParams