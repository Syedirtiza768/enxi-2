import { NextRequest, NextResponse } from 'next/server';
import { routeHealthMonitor } from '@/lib/middleware/route-health-monitor';
import { globalErrorHandler } from '@/lib/utils/global-error-handler';
import { PrismaClient } from '@prisma/client';
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

    let response: any = {
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
      console.log('Performing active health checks');
      const healthChecks = await routeHealthMonitor.performAllHealthChecks();
      response.activeChecks = healthChecks;
    }

    // Test database connectivity
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      await prisma.$disconnect();
      
      response.database = {
        status: 'connected',
        responseTime: Date.now() - startTime
      };
    } catch (dbError) {
      response.database = {
        status: 'disconnected',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      };
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

    console.log('Health check completed', {
      status: response.status,
      responseTime,
      databaseStatus: response.database.status,
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
    console.error('Health check failed', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - Date.now()
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
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
    return new NextResponse(null, { status: 503 });
  }
}