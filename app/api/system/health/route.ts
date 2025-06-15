import { NextRequest, NextResponse } from 'next/server';
import { routeHealthMonitor } from '@/lib/middleware/route-health-monitor';
import { globalErrorHandler } from '@/lib/utils/global-error-handler';
import { prisma } from '@/lib/db/prisma';
import { dbHealthMonitor } from '@/lib/utils/db-health';
import { withUniversalErrorHandling } from '@/lib/middleware/universal-error-wrapper';

async function healthHandler(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeRoutes = searchParams.get('routes') === 'true';
    const includeErrors = searchParams.get('errors') === 'true';
    const performChecks = searchParams.get('checks') === 'true';

    // Basic system health
    const systemHealth = routeHealthMonitor.getSystemHealthSummary();
    const errorHealth = globalErrorHandler.getSystemHealth();

    const response: unknown = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      routes: systemHealth,
      errors: {
        total: errorHealth.totalErrors,
        unresolved: errorHealth.unresolvedErrors
      }
    };

    // Include detailed route metrics if requested
    if (includeRoutes) {
      response.routeDetails = routeHealthMonitor.getRouteMetrics();
    }

    // Include error reports if requested
    if (includeErrors) {
      response.errorReports = globalErrorHandler.getErrorReports({
        resolved: false // Only unresolved errors
      }).slice(0, 20); // Limit to 20 most recent
    }

    // Perform active health checks if requested
    if (performChecks) {
      console.warn('Performing active health checks');
      const healthChecks = await routeHealthMonitor.performAllHealthChecks();
      response.activeChecks = healthChecks;
    }

    // Test database connectivity using health monitor
    const dbHealth = await dbHealthMonitor.checkHealth();
    
    response.database = {
      status: dbHealth.isConnected ? 'connected' : 'disconnected',
      latency: dbHealth.latency,
      lastChecked: dbHealth.lastChecked,
      error: dbHealth.error
    };
    
    if (!dbHealth.isConnected) {
      response.status = 'degraded';
    }

    // Determine overall health status
    if (systemHealth.overallStatus === 'unhealthy' || 
        response.database.status === 'disconnected') {
      response.status = 'unhealthy';
    } else if (systemHealth.overallStatus === 'degraded' ||
               errorHealth.unresolvedErrors > 10) {
      response.status = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    response.responseTime = responseTime;

    console.warn('Health check completed', {
      status: response.status,
      responseTime,
      databaseStatus: response?.database.status,
      totalRoutes: systemHealth.totalRoutes,
      totalErrors: errorHealth.totalErrors
    });

    return NextResponse.json(response, {
      status: response.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'System health check failed' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}

export const GET = withUniversalErrorHandling(healthHandler, '/api/system/health', { operation: 'GET health' })

// Simple health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const systemHealth = routeHealthMonitor.getSystemHealthSummary();
    const status = systemHealth.overallStatus === 'unhealthy' ? 503 : 200;
    
    return new NextResponse(null, { 
      status,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Health-Status': systemHealth.overallStatus
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}