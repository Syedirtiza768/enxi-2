import { NextRequest, NextResponse } from 'next/server';
import { globalErrorHandler } from '@/lib/utils/global-error-handler';

export interface RouteHealthMetrics {
  route: string;
  method: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastHealthCheck: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  errors: Array<{
    timestamp: string;
    statusCode: number;
    errorType: string;
    message: string;
  }>;
}

export interface HealthCheckResult {
  route: string;
  method: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  error?: string;
}

class RouteHealthMonitor {
  private routeMetrics: Map<string, RouteHealthMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private generateRouteKey(route: string, method: string): string {
    return `${method}:${route}`;
  }

  initializeMetrics(route: string, method: string): RouteHealthMetrics {
    return {
      route,
      method,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      lastHealthCheck: new Date().toISOString(),
      status: 'healthy',
      errors: []
    };
  }

  recordRequest(
    route: string,
    method: string,
    responseTime: number,
    statusCode: number,
    error?: Error
  ): void {
    const key = this.generateRouteKey(route, method);
    let metrics = this.routeMetrics.get(key);

    if (!metrics) {
      metrics = this.initializeMetrics(route, method);
      this.routeMetrics.set(key, metrics);
    }

    metrics.totalRequests++;
    
    // Update response time (simple moving average)
    metrics.avgResponseTime = (
      (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) /
      metrics.totalRequests
    );

    if (statusCode >= 200 && statusCode < 400) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
      
      // Record error details (keep last 10 errors)
      if (error) {
        metrics.errors.push({
          timestamp: new Date().toISOString(),
          statusCode,
          errorType: error.constructor.name,
          message: error.message
        });
        
        // Keep only last 10 errors
        if (metrics.errors.length > 10) {
          metrics.errors = metrics.errors.slice(-10);
        }
      }
    }

    // Calculate health status
    const errorRate = metrics.errorCount / metrics.totalRequests;
    const slowResponseThreshold = 5000; // 5 seconds

    if (errorRate > 0.5 || metrics.avgResponseTime > slowResponseThreshold) {
      metrics.status = 'unhealthy';
    } else if (errorRate > 0.2 || metrics.avgResponseTime > 2000) {
      metrics.status = 'degraded';
    } else {
      metrics.status = 'healthy';
    }

    metrics.lastHealthCheck = new Date().toISOString();

    // Log health status changes
    if (metrics.status !== 'healthy') {
      console.warn('Route health degraded', {
        route,
        method,
        status: metrics.status,
        errorRate: Math.round(errorRate * 100),
        avgResponseTime: Math.round(metrics.avgResponseTime),
        totalRequests: metrics.totalRequests
      });
    }
  }

  async performHealthCheck(route: string, method: string = 'GET'): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Construct full URL for health check
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const url = `${baseUrl}${route}`;
      
      // Skip health checks for certain routes to avoid infinite loops
      if (route.includes('/health') || route.includes('/debug') || route.includes('/api/system')) {
        return {
          route,
          method,
          status: 'healthy',
          responseTime: 0,
          timestamp: new Date().toISOString(),
          error: 'Skipped health check for system route'
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RouteHealthMonitor/1.0'
        },
        timeout: 10000 // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      const status = response.ok ? 'healthy' : 'degraded';

      console.log('Health check completed', {
        route,
        method,
        status,
        responseTime,
        statusCode: response.status
      });

      return {
        route,
        method,
        status,
        responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('Health check failed', error, {
        route,
        method,
        responseTime
      });

      return {
        route,
        method,
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
    }
  }

  async performAllHealthChecks(): Promise<HealthCheckResult[]> {
    const routes = Array.from(this.routeMetrics.keys());
    const healthChecks: Promise<HealthCheckResult>[] = [];

    for (const routeKey of routes) {
      const [method, route] = routeKey.split(':', 2);
      
      // Only perform health checks on GET routes to avoid side effects
      if (method === 'GET') {
        healthChecks.push(this.performHealthCheck(route, method));
      }
    }

    const results = await Promise.allSettled(healthChecks);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<HealthCheckResult>).value);
  }

  startMonitoring(intervalMinutes: number = 5): void {
    if (this.isMonitoring) {
      console.warn('Route health monitoring already started');
      return;
    }

    this.isMonitoring = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.healthCheckInterval = setInterval(async () => {
      try {
        // console.log('Starting periodic health checks');
        const results = await this.performAllHealthChecks();
        
        const unhealthyRoutes = results.filter(r => r.status === 'unhealthy');
        const degradedRoutes = results.filter(r => r.status === 'degraded');

        if (unhealthyRoutes.length > 0) {
          console.error('Unhealthy routes detected', {
            count: unhealthyRoutes.length,
            routes: unhealthyRoutes.map(r => `${r.method}:${r.route}`)
          });
        }

        if (degradedRoutes.length > 0) {
          console.warn('Degraded routes detected', {
            count: degradedRoutes.length,
            routes: degradedRoutes.map(r => `${r.method}:${r.route}`)
          });
        }

        // console.log('Periodic health checks completed', {
        //   total: results.length,
        //   healthy: results.filter(r => r.status === 'healthy').length,
        //   degraded: degradedRoutes.length,
        //   unhealthy: unhealthyRoutes.length
        // });

      } catch (error) {
        console.error('Failed to perform periodic health checks', error);
      }
    }, intervalMs);

    console.log('Route health monitoring started', {
      intervalMinutes,
      totalRoutes: this.routeMetrics.size
    });
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isMonitoring = false;
    console.log('Route health monitoring stopped');
  }

  getRouteMetrics(route?: string, method?: string): RouteHealthMetrics[] {
    if (route && method) {
      const key = this.generateRouteKey(route, method);
      const metrics = this.routeMetrics.get(key);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.routeMetrics.values())
      .sort((a, b) => {
        // Sort by health status (unhealthy first), then by error rate
        if (a.status !== b.status) {
          const statusOrder = { 'unhealthy': 0, 'degraded': 1, 'healthy': 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        
        const aErrorRate = a.errorCount / a.totalRequests;
        const bErrorRate = b.errorCount / b.totalRequests;
        return bErrorRate - aErrorRate;
      });
  }

  getSystemHealthSummary(): {
    totalRoutes: number;
    healthyRoutes: number;
    degradedRoutes: number;
    unhealthyRoutes: number;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    avgResponseTime: number;
    totalRequests: number;
    totalErrors: number;
  } {
    const allMetrics = Array.from(this.routeMetrics.values());
    
    const healthyRoutes = allMetrics.filter(m => m.status === 'healthy').length;
    const degradedRoutes = allMetrics.filter(m => m.status === 'degraded').length;
    const unhealthyRoutes = allMetrics.filter(m => m.status === 'unhealthy').length;
    
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const avgResponseTime = allMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / allMetrics.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyRoutes > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedRoutes > 0) {
      overallStatus = 'degraded';
    }

    return {
      totalRoutes: allMetrics.length,
      healthyRoutes,
      degradedRoutes,
      unhealthyRoutes,
      overallStatus,
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests,
      totalErrors
    };
  }

  clearMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    let cleared = 0;

    for (const [key, metrics] of this.routeMetrics.entries()) {
      if (new Date(metrics.lastHealthCheck) < cutoffTime) {
        this.routeMetrics.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log('Cleared old route metrics', {
        cleared,
        olderThanHours,
        remaining: this.routeMetrics.size
      });
    }
  }
}

export const routeHealthMonitor = new RouteHealthMonitor();

// Middleware wrapper to automatically monitor route health
export function withHealthMonitoring<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  route: string
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const method = request.method;
    const startTime = Date.now();
    
    try {
      const response = await handler(request, ...args);
      const responseTime = Date.now() - startTime;
      
      routeHealthMonitor.recordRequest(
        route,
        method,
        responseTime,
        response.status
      );
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const statusCode = error instanceof Error && 'statusCode' in error 
        ? (error as any).statusCode 
        : 500;
      
      routeHealthMonitor.recordRequest(
        route,
        method,
        responseTime,
        statusCode,
        error as Error
      );
      
      throw error;
    }
  }) as T;
}

// Periodic health checks disabled