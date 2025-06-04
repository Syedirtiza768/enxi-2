import { NextRequest, NextResponse } from 'next/server';
import { handleError } from '@/lib/utils/global-error-handler';
import { routeHealthMonitor } from './route-health-monitor';

export interface WrapperOptions {
  operation?: string;
  skipAuth?: boolean;
  skipHealthMonitoring?: boolean;
  logRequests?: boolean;
}

/**
 * Universal wrapper that adds comprehensive error handling, health monitoring,
 * and logging to ANY API route handler
 */
export function withUniversalErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  route: string,
  options: WrapperOptions = {}
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const method = request.method;
    const requestId = crypto.randomUUID();
    
    // Add request ID to headers for tracing
    const headers = new Headers();
    headers.set('X-Request-ID', requestId);

    try {
      // Log request if enabled
      if (options.logRequests !== false) {
        console.log(`${method} ${route} - Start`, {
          requestId,
          route,
          method
        });
      }

      // Execute the original handler
      const response = await handler(request, ...args);
      const responseTime = Date.now() - startTime;

      // Record successful request in health monitor
      if (!options.skipHealthMonitoring) {
        routeHealthMonitor.recordRequest(
          route,
          method,
          responseTime,
          response.status
        );
      }

      // Log successful completion
      if (options.logRequests !== false) {
        console.log(`${method} ${route} - Success`, {
          requestId,
          route,
          method,
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        });
      }

      // Add response headers
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // For authentication and validation errors, handle them simply
      if (err.message.includes('authentication') || 
          err.message.includes('No authentication token') || 
          err.message.includes('Invalid authentication token') ||
          err.message.includes('Unauthorized')) {
        
        // Record failed request in health monitor
        if (!options.skipHealthMonitoring) {
          routeHealthMonitor.recordRequest(route, method, responseTime, 401, err);
        }

        // Log auth error
        console.warn(`${method} ${route} - Authentication failed`, {
          requestId, route, method, responseTime: `${responseTime}ms`, error: err.message
        });

        const authErrorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        Object.entries(headers).forEach(([key, value]) => {
          authErrorResponse.headers.set(key, value);
        });
        return authErrorResponse;
      }

      // For validation errors (ZodError)
      if (err.name === 'ZodError' || err.message.includes('validation')) {
        // Record failed request in health monitor
        if (!options.skipHealthMonitoring) {
          routeHealthMonitor.recordRequest(route, method, responseTime, 400, err);
        }

        console.warn(`${method} ${route} - Validation failed`, {
          requestId, route, method, responseTime: `${responseTime}ms`, error: err.message
        });

        const validationErrorResponse = NextResponse.json(
          { error: 'Validation failed', message: err.message }, 
          { status: 400 }
        );
        Object.entries(headers).forEach(([key, value]) => {
          validationErrorResponse.headers.set(key, value);
        });
        return validationErrorResponse;
      }
      // Record failed request in health monitor
      if (!options.skipHealthMonitoring) {
        const statusCode = 'statusCode' in err ? (err as any).statusCode : 500;
        routeHealthMonitor.recordRequest(
          route,
          method,
          responseTime,
          statusCode,
          err
        );
      }

      // Log error
      console.error(`${method} ${route} - Error`, err, {
        requestId,
        route,
        method,
        responseTime: `${responseTime}ms`,
        operation: options.operation
      });

      // Use global error handler to create appropriate response
      const errorResponse = await handleError(err, {
        requestId,
        route,
        method,
        operation: options.operation,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || undefined
      });

      // Add response headers
      Object.entries(headers).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });

      return errorResponse;
    }
  }) as T;
}

/**
 * Quick wrapper for common API patterns
 */
export const createApiHandler = (route: string, options?: WrapperOptions) => {
  return <T extends (...args: any[]) => Promise<NextResponse>>(handler: T): T => {
    return withUniversalErrorHandling(handler, route, options);
  };
};

/**
 * Decorator pattern for auto-wrapping all methods in a route file
 */
export function wrapRouteHandlers(route: string, handlers: Record<string, any>, options?: WrapperOptions): Record<string, any> {
  const wrappedHandlers: Record<string, any> = {};
  
  for (const [method, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function' && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
      wrappedHandlers[method] = withUniversalErrorHandling(
        handler,
        route,
        { ...options, operation: `${method} ${route}` }
      );
    } else {
      wrappedHandlers[method] = handler;
    }
  }
  
  return wrappedHandlers;
}

/**
 * Auto-wrapping middleware for specific error types
 */
export function withAuthErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  route: string
): T {
  return withUniversalErrorHandling(handler, route, {
    operation: `Auth ${route}`,
    logRequests: true
  });
}

export function withDatabaseErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  route: string
): T {
  return withUniversalErrorHandling(handler, route, {
    operation: `Database ${route}`,
    logRequests: true
  });
}

export function withValidationErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  route: string
): T {
  return withUniversalErrorHandling(handler, route, {
    operation: `Validation ${route}`,
    logRequests: false // Reduce noise for validation endpoints
  });
}