#!/usr/bin/env npx tsx

import { routeDiscovery } from '../lib/testing/route-discovery';
import { routeTester, RouteTester } from '../lib/testing/route-tester';
import { routeFixer, RouteFixer } from '../lib/testing/route-fixer';
import { logger } from '../lib/utils/debug-logger';
import { writeFile } from 'fs/promises';

interface ComprehensiveTestReport {
  discovery: {
    totalRoutes: number;
    apiRoutes: number;
    pageRoutes: number;
    layoutRoutes: number;
    categorizedRoutes: any[];
  };
  testing: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    errorsByCategory: Record<string, number>;
    slowRoutes: any[];
  };
  fixing: {
    issuesFound: number;
    fixesApplied: number;
    successfulFixes: number;
    failedFixes: number;
  };
  performance: {
    averageResponseTime: number;
    slowestRoutes: any[];
    fastestRoutes: any[];
  };
}

async function comprehensiveRouteTestAndFix() {
  console.log('🚀 Starting Comprehensive Route Testing and Fixing\n');
  
  const startTime = Date.now();
  const report: ComprehensiveTestReport = {
    discovery: { totalRoutes: 0, apiRoutes: 0, pageRoutes: 0, layoutRoutes: 0, categorizedRoutes: [] },
    testing: { totalTests: 0, passed: 0, failed: 0, successRate: 0, errorsByCategory: {}, slowRoutes: [] },
    fixing: { issuesFound: 0, fixesApplied: 0, successfulFixes: 0, failedFixes: 0 },
    performance: { averageResponseTime: 0, slowestRoutes: [], fastestRoutes: [] }
  };

  try {
    // Phase 1: Route Discovery
    console.log('📍 Phase 1: Discovering all routes...');
    const routes = await routeDiscovery.discoverAllRoutes();
    const categorizedRoutes = routeDiscovery.getRoutesByCategory();
    
    report.discovery = {
      totalRoutes: routes.length,
      apiRoutes: routes.filter(r => r.type === 'api').length,
      pageRoutes: routes.filter(r => r.type === 'page').length,
      layoutRoutes: routes.filter(r => r.type === 'layout').length,
      categorizedRoutes
    };
    
    console.log(`✅ Discovery Complete:`);
    console.log(`   - Total Routes: ${report.discovery.totalRoutes}`);
    console.log(`   - API Routes: ${report.discovery.apiRoutes}`);
    console.log(`   - Page Routes: ${report.discovery.pageRoutes}`);
    console.log(`   - Layout Routes: ${report.discovery.layoutRoutes}`);
    
    console.log('\n📊 Routes by Category:');
    categorizedRoutes.forEach(group => {
      console.log(`   - ${group.category}: ${group.routes.length} routes`);
    });

    // Phase 2: Comprehensive Testing
    console.log('\n🧪 Phase 2: Comprehensive route testing...');
    
    // Focus on API routes first (most critical)
    const apiRoutes = routes.filter(r => r.type === 'api');
    console.log(`Testing ${apiRoutes.length} API routes...`);
    
    const tester = new RouteTester();
    const testSummary = await tester.testAllRoutes(apiRoutes);
    
    report.testing = {
      totalTests: testSummary.totalTests,
      passed: testSummary.passed,
      failed: testSummary.failed,
      successRate: Math.round((testSummary.passed / testSummary.totalTests) * 100),
      errorsByCategory: testSummary.errorsByCategory,
      slowRoutes: tester.getTestResults()
        .filter(r => r.responseTime > 2000)
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 10)
    };
    
    console.log(`✅ Testing Complete:`);
    console.log(`   - Total Tests: ${report.testing.totalTests}`);
    console.log(`   - Passed: ${report.testing.passed}`);
    console.log(`   - Failed: ${report.testing.failed}`);
    console.log(`   - Success Rate: ${report.testing.successRate}%`);
    
    console.log('\n❌ Errors by Category:');
    Object.entries(report.testing.errorsByCategory).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} errors`);
    });

    if (report.testing.slowRoutes.length > 0) {
      console.log('\n🐌 Slowest Routes:');
      report.testing.slowRoutes.slice(0, 5).forEach((result: any) => {
        console.log(`   - ${result.route.path} (${result.scenario.method}): ${result.responseTime}ms`);
      });
    }

    // Phase 3: Error Analysis and Fixing
    console.log('\n🔧 Phase 3: Analyzing and fixing errors...');
    
    const fixer = new RouteFixer();
    const failedResults = tester.getFailedRoutes();
    
    if (failedResults.length > 0) {
      console.log(`Analyzing ${failedResults.length} failed routes...`);
      
      const issueMap = await fixer.analyzeRouteIssues(failedResults);
      report.fixing.issuesFound = Array.from(issueMap.values()).flat().length;
      
      console.log(`Found ${report.fixing.issuesFound} issues across ${issueMap.size} routes`);
      
      // Show issue breakdown
      const issueTypes: Record<string, number> = {};
      Array.from(issueMap.values()).flat().forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
      
      console.log('\n🔍 Issues by Type:');
      Object.entries(issueTypes).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} issues`);
      });
      
      // Apply automatic fixes
      console.log('\n🛠️ Applying automatic fixes...');
      const fixResults = await fixer.fixAllRoutes(issueMap);
      
      report.fixing.fixesApplied = fixResults.length;
      report.fixing.successfulFixes = fixResults.filter(f => f.success).length;
      report.fixing.failedFixes = fixResults.filter(f => !f.success).length;
      
      console.log(`✅ Fixes Applied:`);
      console.log(`   - Total Attempts: ${report.fixing.fixesApplied}`);
      console.log(`   - Successful: ${report.fixing.successfulFixes}`);
      console.log(`   - Failed: ${report.fixing.failedFixes}`);
      
      if (report.fixing.successfulFixes > 0) {
        console.log('\n✨ Successfully Fixed:');
        fixResults.filter(f => f.success).slice(0, 5).forEach(fix => {
          console.log(`   - ${fix.route.path}: ${fix.fixApplied}`);
        });
      }
      
      if (report.fixing.failedFixes > 0) {
        console.log('\n⚠️ Manual Intervention Required:');
        fixResults.filter(f => !f.success).slice(0, 5).forEach(fix => {
          console.log(`   - ${fix.route.path}: ${fix.error || 'Unknown error'}`);
        });
      }
      
    } else {
      console.log('🎉 No errors found - all routes are working correctly!');
    }

    // Phase 4: Performance Analysis
    console.log('\n⚡ Phase 4: Performance analysis...');
    
    const allResults = tester.getTestResults().filter(r => r.success);
    if (allResults.length > 0) {
      const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;
      const sortedByTime = [...allResults].sort((a, b) => b.responseTime - a.responseTime);
      
      report.performance = {
        averageResponseTime: Math.round(avgResponseTime),
        slowestRoutes: sortedByTime.slice(0, 5).map(r => ({
          path: r.route.path,
          method: r.scenario.method,
          responseTime: r.responseTime
        })),
        fastestRoutes: sortedByTime.slice(-5).reverse().map(r => ({
          path: r.route.path,
          method: r.scenario.method,
          responseTime: r.responseTime
        }))
      };
      
      console.log(`✅ Performance Analysis:`);
      console.log(`   - Average Response Time: ${report.performance.averageResponseTime}ms`);
      console.log(`   - Fastest Route: ${report.performance.fastestRoutes[0]?.path} (${report.performance.fastestRoutes[0]?.responseTime}ms)`);
      console.log(`   - Slowest Route: ${report.performance.slowestRoutes[0]?.path} (${report.performance.slowestRoutes[0]?.responseTime}ms)`);
    }

    // Phase 5: Re-test Fixed Routes
    if (report.fixing.successfulFixes > 0) {
      console.log('\n🔄 Phase 5: Re-testing fixed routes...');
      
      // Re-test only the routes that were fixed
      const fixedRoutes = fixer.getFixResults()
        .filter(f => f.success)
        .map(f => f.route);
      
      if (fixedRoutes.length > 0) {
        const retestSummary = await tester.testAllRoutes(fixedRoutes);
        const improvement = retestSummary.passed - (testSummary.failed - report.fixing.successfulFixes);
        
        console.log(`✅ Re-test Results:`);
        console.log(`   - Re-tested: ${retestSummary.totalTests} tests`);
        console.log(`   - Now Passing: ${retestSummary.passed}`);
        console.log(`   - Still Failing: ${retestSummary.failed}`);
        console.log(`   - Improvement: +${improvement} passing tests`);
      }
    }

    // Generate comprehensive report
    const totalTime = Date.now() - startTime;
    
    console.log('\n📋 COMPREHENSIVE REPORT SUMMARY');
    console.log('=' .repeat(50));
    console.log(`🎯 Overall Success Rate: ${report.testing.successRate}%`);
    console.log(`⏱️ Total Processing Time: ${Math.round(totalTime / 1000)}s`);
    console.log(`📊 Routes Discovered: ${report.discovery.totalRoutes}`);
    console.log(`🧪 Tests Executed: ${report.testing.totalTests}`);
    console.log(`🔧 Issues Fixed: ${report.fixing.successfulFixes}/${report.fixing.issuesFound}`);
    console.log(`⚡ Avg Response Time: ${report.performance.averageResponseTime}ms`);
    
    // Performance categories
    const performanceGrade = report.performance.averageResponseTime < 500 ? 'A' :
                            report.performance.averageResponseTime < 1000 ? 'B' :
                            report.performance.averageResponseTime < 2000 ? 'C' : 'D';
    
    console.log(`📈 Performance Grade: ${performanceGrade}`);
    
    // Final recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (report.testing.successRate < 80) {
      console.log('🔴 Critical: Low success rate - immediate attention required');
    } else if (report.testing.successRate < 95) {
      console.log('🟡 Warning: Success rate could be improved');
    } else {
      console.log('🟢 Excellent: High success rate maintained');
    }
    
    if (report.performance.averageResponseTime > 2000) {
      console.log('🔴 Critical: High response times - performance optimization needed');
    } else if (report.performance.averageResponseTime > 1000) {
      console.log('🟡 Warning: Response times could be optimized');
    } else {
      console.log('🟢 Good: Response times are acceptable');
    }
    
    if (report.fixing.failedFixes > 0) {
      console.log(`🔴 Manual: ${report.fixing.failedFixes} issues require manual intervention`);
    }

    // Save detailed report
    const reportPath = `./route-test-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    await writeFile(reportPath, JSON.stringify({
      ...report,
      timestamp: new Date().toISOString(),
      totalTime,
      detailedResults: {
        testResults: tester.getTestResults(),
        fixResults: fixer.getFixResults()
      }
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    
    console.log('\n🎉 Comprehensive Route Testing and Fixing Complete!');
    
    // Exit codes for CI/CD
    if (report.testing.successRate < 50) {
      console.log('\n❌ CRITICAL FAILURE - Exiting with error code 1');
      process.exit(1);
    } else if (report.testing.successRate < 80) {
      console.log('\n⚠️ WARNING - Exiting with error code 2');
      process.exit(2);
    } else {
      console.log('\n✅ SUCCESS - All systems operational');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('\n❌ COMPREHENSIVE TEST FAILED:', error.message);
    console.error('\nThis could be due to:');
    console.error('1. Server not running (start with: npm run dev)');
    console.error('2. Database connection issues');
    console.error('3. Missing dependencies or environment variables');
    console.error('4. File system permissions');
    
    logger.error('Comprehensive route test failed', error);
    process.exit(1);
  }
}

// Run the comprehensive test
comprehensiveRouteTestAndFix();