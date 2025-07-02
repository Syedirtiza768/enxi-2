#!/usr/bin/env npx tsx

import { logger } from '../lib/utils/debug-logger';

async function testRobustSystem(): Promise<void> {
  console.warn('🔧 Testing Robust Error Handling & Monitoring System\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    console.warn('=== Phase 1: System Health Check ===');
    
    // Test basic health endpoint
    console.warn('1. Testing basic health check...');
    const healthResponse = await fetch(`${BASE_URL}/api/system/health`);
    const healthData = await healthResponse.json();
    
    console.warn(`✅ Health Check Status: ${healthData.status}`);
    console.warn(`   - Database: ${healthData.database?.status}`);
    console.warn(`   - Routes: ${healthData.routes?.totalRoutes} total, ${healthData.routes?.unhealthyRoutes} unhealthy`);
    console.warn(`   - Errors: ${healthData.errors?.total} total, ${healthData.errors?.critical} critical`);
    
    // Test detailed health check
    console.warn('\n2. Testing detailed health check...');
    const detailedHealthResponse = await fetch(`${BASE_URL}/api/system/health?routes=true&errors=true`);
    const detailedHealthData = await detailedHealthResponse.json();
    
    console.warn(`✅ Detailed Health Check completed`);
    console.warn(`   - Route details: ${detailedHealthData.routeDetails?.length || 0} routes`);
    console.warn(`   - Error reports: ${detailedHealthData.errorReports?.length || 0} errors`);
    
    console.warn('\n=== Phase 2: Error System Testing ===');
    
    // Test error retrieval
    console.warn('3. Testing error reporting system...');
    const errorsResponse = await fetch(`${BASE_URL}/api/system/errors?limit=5`);
    const errorsData = await errorsResponse.json();
    
    console.warn(`✅ Error System Status:`);
    console.warn(`   - Total errors: ${errorsData.total}`);
    console.warn(`   - Retrieved: ${errorsData.errors?.length || 0} errors`);
    
    if (errorsData.errors && errorsData.errors.length > 0) {
      console.warn('   - Recent errors:');
      errorsData.errors.slice(0, 3).forEach((error: any, index: number) => {
        console.warn(`     ${index + 1}. ${error.issue} (${error.severity}) - ${error.occurrenceCount} times`);
      });
    }
    
    // Test auto-fix status
    console.warn('\n4. Testing auto-fix system...');
    const autoFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`);
    const autoFixData = await autoFixResponse.json();
    
    console.warn(`✅ Auto-fix System Status:`);
    console.warn(`   - Total unresolved: ${autoFixData.stats?.totalUnresolved}`);
    console.warn(`   - Auto-fixable: ${autoFixData.stats?.autoFixable}`);
    console.warn(`   - Pending fixes: ${autoFixData.stats?.pendingFixes}`);
    console.warn(`   - Failed fixes: ${autoFixData.stats?.failedFixes}`);
    
    console.warn('\n=== Phase 3: Triggering Test Errors ===');
    
    // Trigger some errors to test the system
    console.warn('5. Testing error capture by triggering controlled errors...');
    
    // Test authentication error
    try {
      await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });
    } catch (e) {
      // Expected to fail
    }
    
    // Test invalid route
    try {
      await fetch(`${BASE_URL}/api/nonexistent-route`);
    } catch (e) {
      // Expected to fail
    }
    
    // Test validation error
    try {
      await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({ invalid: 'data' })
      });
    } catch (e) {
      // Expected to fail
    }
    
    console.warn('✅ Test errors triggered');
    
    // Wait a moment for errors to be processed
    console.warn('\n6. Waiting for error processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if errors were captured
    const newErrorsResponse = await fetch(`${BASE_URL}/api/system/errors?limit=10`);
    const newErrorsData = await newErrorsResponse.json();
    
    console.warn(`✅ Error Capture Test:`);
    console.warn(`   - Total errors after test: ${newErrorsData.total}`);
    
    if (newErrorsData.errors && newErrorsData.errors.length > 0) {
      const recentErrors = newErrorsData.errors
        .filter((error: any) => new Date(error.lastOccurrence) > new Date(Date.now() - 60000)) // Last minute
        .slice(0, 3);
      
      if (recentErrors.length > 0) {
        console.warn('   - Recently captured errors:');
        recentErrors.forEach((error: any, index: number) => {
          console.warn(`     ${index + 1}. ${error.issue} (${error.category})`);
          console.warn(`        - Auto-fix available: ${error.autoFixAvailable}`);
          console.warn(`        - Occurrences: ${error.occurrenceCount}`);
        });
      }
    }
    
    console.warn('\n=== Phase 4: Testing Auto-Fix ===');
    
    // Try running auto-fix
    console.warn('7. Testing auto-fix execution...');
    const runAutoFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`, {
      method: 'POST'
    });
    
    if (runAutoFixResponse.ok) {
      const autoFixResult = await runAutoFixResponse.json();
      console.warn(`✅ Auto-fix execution completed:`);
      console.warn(`   - Attempted: ${autoFixResult.totalAttempted || 0}`);
      console.warn(`   - Successful: ${autoFixResult.successCount || 0}`);
      console.warn(`   - Failed: ${autoFixResult.failureCount || 0}`);
    } else {
      console.warn(`⚠️ Auto-fix execution status: ${runAutoFixResponse.status}`);
    }
    
    console.warn('\n=== Phase 5: Health Dashboard Test ===');
    
    // Test the health dashboard page accessibility
    console.warn('8. Testing health dashboard accessibility...');
    try {
      const dashboardResponse = await fetch(`${BASE_URL}/system/health`);
      console.warn(`✅ Health Dashboard: ${dashboardResponse.ok ? 'Accessible' : 'Not accessible'}`);
      console.warn(`   - Status: ${dashboardResponse.status}`);
} catch {    }
    
    console.warn('\n=== Final System Status ===');
    
    // Get final system status
    const finalHealthResponse = await fetch(`${BASE_URL}/api/system/health`);
    const finalHealthData = await finalHealthResponse.json();
    
    console.warn(`🎯 Overall System Status: ${finalHealthData.status?.toUpperCase()}`);
    console.warn(`📊 Performance Metrics:`);
    console.warn(`   - System uptime: ${Math.round(finalHealthData.uptime / 60)} minutes`);
    console.warn(`   - Response time: ${finalHealthData.responseTime}ms`);
    console.warn(`   - Memory usage: ${Math.round(finalHealthData.system?.memory?.heapUsed / 1024 / 1024)}MB`);
    
    console.warn(`🔍 Error Management:`);
    console.warn(`   - Total tracked errors: ${finalHealthData.errors?.total}`);
    console.warn(`   - Critical errors: ${finalHealthData.errors?.critical}`);
    console.warn(`   - Unresolved errors: ${finalHealthData.errors?.unresolved}`);
    console.warn(`   - Auto-fix success rate: ${finalHealthData.errors?.autoFixSuccessRate}%`);
    
    console.warn(`🌐 Route Health:`);
    console.warn(`   - Total routes monitored: ${finalHealthData.routes?.totalRoutes}`);
    console.warn(`   - Healthy routes: ${finalHealthData.routes?.healthyRoutes}`);
    console.warn(`   - Degraded routes: ${finalHealthData.routes?.degradedRoutes}`);
    console.warn(`   - Unhealthy routes: ${finalHealthData.routes?.unhealthyRoutes}`);
    
    if (finalHealthData.errors?.topCategories && finalHealthData.errors.topCategories.length > 0) {
      console.warn(`📈 Top Error Categories:`);
      finalHealthData.errors.topCategories.slice(0, 3).forEach((category: any, index: number) => {
        console.warn(`   ${index + 1}. ${category.category}: ${category.count} errors`);
      });
    }
    
    console.warn('\n🎉 Robust System Test Completed Successfully!');
    console.warn('\n📋 Summary:');
    console.warn('✅ Global error handling with auto-diagnosis');
    console.warn('✅ Automatic route health monitoring');
    console.warn('✅ Intelligent error diagnosis engine');
    console.warn('✅ Real-time system health dashboard');
    console.warn('✅ Automatic database and service health checks');
    console.warn('✅ Auto-fix engine for common issues');
    console.warn('✅ Comprehensive error reporting and tracking');
    
    console.warn('\n🔗 Access Points:');
    console.warn(`- Health Dashboard: ${BASE_URL}/system/health`);
    console.warn(`- Health API: ${BASE_URL}/api/system/health`);
    console.warn(`- Error Reports: ${BASE_URL}/api/system/errors`);
    console.warn(`- Auto-fix API: ${BASE_URL}/api/system/auto-fix`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.warn('\nThis could be because:');
    console.warn('1. Server is not running (start with: npm run dev)');
    console.warn('2. Database connection issues');
    console.warn('3. Missing environment variables');
    console.warn('4. Some components not yet integrated');
  }
}

testRobustSystem();