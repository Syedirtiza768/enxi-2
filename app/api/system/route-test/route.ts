import { NextRequest, NextResponse } from 'next/server';
import { routeDiscovery } from '@/lib/testing/route-discovery';
import { routeTester } from '@/lib/testing/route-tester';
import { routeFixer } from '@/lib/testing/route-fixer';
import { getUserFromRequest } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication (optional - could be admin only)
    let user;
    try {
      user = await getUserFromRequest(request);
      console.warn('Route testing initiated by user', { userId: user.id });
    } catch {
      // Allow in development mode
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({
          error: 'Authentication required',
          message: 'Route testing requires authentication'
        }, { status: 401 });
      }
      console.warn('Route testing initiated in development mode');
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'test'; // test, fix, full
    const includePages = searchParams.get('includePages') === 'true';
    const category = searchParams.get('category'); // Filter by category

    console.warn('Starting comprehensive route testing', {
      mode,
      includePages,
      category,
      userId: user?.id
    });

    // Phase 1: Discovery
    const allRoutes = await routeDiscovery.discoverAllRoutes();
    let routesToTest = allRoutes.filter(r => r.type === 'api');
    
    if (includePages) {
      routesToTest = [...routesToTest, ...allRoutes.filter(r => r.type === 'page')];
    }
    
    if (category) {
      const categorizedRoutes = routeDiscovery.getRoutesByCategory();
      const categoryGroup = categorizedRoutes.find(g => g.category.toLowerCase() === category.toLowerCase());
      if (categoryGroup) {
        routesToTest = categoryGroup.routes.filter(r => 
          includePages ? true : r.type === 'api'
        );
      }
    }

    console.warn('Route discovery completed', {
      totalRoutes: allRoutes.length,
      routesToTest: routesToTest.length,
      mode,
      category
    });

    // Phase 2: Testing
    const testSummary = await routeTester.testAllRoutes(routesToTest);
    
    const response: unknown = {
      discovery: {
        totalRoutes: allRoutes.length,
        apiRoutes: allRoutes.filter(r => r.type === 'api').length,
        pageRoutes: allRoutes.filter(r => r.type === 'page').length,
        routesToTest: routesToTest.length,
        categories: routeDiscovery.getRoutesByCategory().map(g => ({
          name: g.category,
          count: g.routes.length
        }))
      },
      testing: {
        totalTests: testSummary.totalTests,
        passed: testSummary.passed,
        failed: testSummary.failed,
        successRate: Math.round((testSummary.passed / testSummary.totalTests) * 100),
        errorsByCategory: testSummary.errorsByCategory,
        averageResponseTime: Math.round(
          routeTester.getTestResults()
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.responseTime, 0) / 
          Math.max(1, routeTester.getTestResults().filter(r => r.success).length)
        )
      },
      timestamp: new Date().toISOString()
    };

    // Phase 3: Fixing (if requested)
    if ((mode === 'fix' || mode === 'full') && testSummary.failed > 0) {
      console.warn('Starting automatic fixing phase', {
        failedTests: testSummary.failed
      });

      const failedResults = routeTester.getFailedRoutes();
      const issueMap = await routeFixer.analyzeRouteIssues(failedResults);
      
      response.fixing = {
        issuesFound: Array.from(issueMap.values()).flat().length,
        autoFixableIssues: Array.from(issueMap.values()).flat().filter(i => i.autoFixable).length,
        issuesByType: {}
      };

      // Categorize issues
      const issuesByType: Record<string, number> = {};
      Array.from(issueMap.values()).flat().forEach(issue => {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      });
      response.fixing.issuesByType = issuesByType;

      if (mode === 'fix' || mode === 'full') {
        const fixResults = await routeFixer.fixAllRoutes(issueMap);
        
        response.fixing = {
          ...response.fixing,
          fixesApplied: fixResults.length,
          successfulFixes: fixResults.filter(f => f.success).length,
          failedFixes: fixResults.filter(f => !f.success).length,
          fixDetails: fixResults.map(f => ({
            route: f.route.path,
            issue: f.issue,
            fixApplied: f.fixApplied,
            success: f.success,
            error: f.error
          }))
        };

        // Re-test fixed routes
        if (response.fixing.successfulFixes > 0) {
          console.warn('Re-testing fixed routes', {
            fixedRoutes: response.fixing.successfulFixes
          });

          const fixedRoutes = fixResults
            .filter(f => f.success)
            .map(f => f.route);

          const retestSummary = await routeTester.testAllRoutes(fixedRoutes);
          
          response.retesting = {
            totalTests: retestSummary.totalTests,
            passed: retestSummary.passed,
            failed: retestSummary.failed,
            improvement: retestSummary.passed - (testSummary.failed - response.fixing.successfulFixes)
          };
        }
      }
    }

    // Performance analysis
    const successfulResults = routeTester.getTestResults().filter(r => r.success);
    if (successfulResults.length > 0) {
      const sortedByTime = [...successfulResults].sort((a, b) => b.responseTime - a.responseTime);
      
      response.performance = {
        averageResponseTime: response.testing.averageResponseTime,
        slowestRoutes: sortedByTime.slice(0, 5).map(r => ({
          path: r.route.path,
          method: r.scenario.method,
          responseTime: r.responseTime
        })),
        fastestRoutes: sortedByTime.slice(-5).reverse().map(r => ({
          path: r.route.path,
          method: r.scenario.method,
          responseTime: r.responseTime
        })),
        performanceGrade: response.testing.averageResponseTime < 500 ? 'A' :
                          response.testing.averageResponseTime < 1000 ? 'B' :
                          response.testing.averageResponseTime < 2000 ? 'C' : 'D'
      };
    }

    // Include detailed results if requested
    if (searchParams.get('includeDetails') === 'true') {
      response.detailedResults = {
        testResults: routeTester.getTestResults(),
        fixResults: routeFixer.getFixResults()
      };
    }

    // Include failed routes summary
    if (testSummary.failed > 0) {
      response.failedRoutes = routeTester.getFailedRoutes().slice(0, 10).map(r => ({
        path: r.route.path,
        method: r.scenario.method,
        statusCode: r.statusCode,
        error: r.error,
        responseTime: r.responseTime
      }));
    }

    console.warn('Route testing completed successfully', {
      mode,
      totalTests: response.testing.totalTests,
      successRate: response.testing.successRate,
      fixesApplied: response.fixing?.fixesApplied || 0,
      userId: user?.id
    });

    return NextResponse.json(response);

} catch (error) {
      console.error('Error:', error);
    }
}

// Get route testing status and configuration
export async function GET(request: NextRequest) {
  try {
    const routes = await routeDiscovery.discoverAllRoutes();
    const categorizedRoutes = routeDiscovery.getRoutesByCategory();
    
    return NextResponse.json({
      status: 'ready',
      discovery: {
        totalRoutes: routes.length,
        apiRoutes: routes.filter(r => r.type === 'api').length,
        pageRoutes: routes.filter(r => r.type === 'page').length,
        layoutRoutes: routes.filter(r => r.type === 'layout').length,
        categories: categorizedRoutes.map(g => ({
          name: g.category,
          count: g.routes.length,
          routes: g.routes.map(r => ({
            path: r.path,
            type: r.type,
            methods: r.methods,
            requiresAuth: r.requiresAuth,
            hasParams: r.hasParams
          }))
        }))
      },
      capabilities: {
        testing: {
          description: 'Comprehensive route testing with multiple scenarios',
          supportedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          features: ['Authentication testing', 'Validation testing', 'Performance measurement']
        },
        fixing: {
          description: 'Automatic issue detection and fixing',
          fixableIssues: ['missing_export', 'auth_error', 'validation_error', 'import_error'],
          features: ['Backup creation', 'Auto-generated handlers', 'Error handling injection']
        }
      },
      usage: {
        testOnly: '/api/system/route-test?mode=test',
        testAndFix: '/api/system/route-test?mode=fix',
        comprehensive: '/api/system/route-test?mode=full&includePages=true',
        byCategory: '/api/system/route-test?category=authentication&mode=test'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Route test failed' },
      { status: 500 }
    );
  }
}