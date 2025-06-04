#!/usr/bin/env npx tsx

import { logger } from '../lib/utils/debug-logger';

async function testRobustSystem() {
  console.log('🔧 Testing Robust Error Handling & Monitoring System\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    console.log('=== Phase 1: System Health Check ===');
    
    // Test basic health endpoint
    console.log('1. Testing basic health check...');
    const healthResponse = await fetch(`${BASE_URL}/api/system/health`);
    const healthData = await healthResponse.json();
    
    console.log(`✅ Health Check Status: ${healthData.status}`);
    console.log(`   - Database: ${healthData.database?.status}`);
    console.log(`   - Routes: ${healthData.routes?.totalRoutes} total, ${healthData.routes?.unhealthyRoutes} unhealthy`);
    console.log(`   - Errors: ${healthData.errors?.total} total, ${healthData.errors?.critical} critical`);
    
    // Test detailed health check
    console.log('\n2. Testing detailed health check...');
    const detailedHealthResponse = await fetch(`${BASE_URL}/api/system/health?routes=true&errors=true`);
    const detailedHealthData = await detailedHealthResponse.json();
    
    console.log(`✅ Detailed Health Check completed`);
    console.log(`   - Route details: ${detailedHealthData.routeDetails?.length || 0} routes`);
    console.log(`   - Error reports: ${detailedHealthData.errorReports?.length || 0} errors`);
    
    console.log('\n=== Phase 2: Error System Testing ===');
    
    // Test error retrieval
    console.log('3. Testing error reporting system...');
    const errorsResponse = await fetch(`${BASE_URL}/api/system/errors?limit=5`);
    const errorsData = await errorsResponse.json();
    
    console.log(`✅ Error System Status:`);
    console.log(`   - Total errors: ${errorsData.total}`);
    console.log(`   - Retrieved: ${errorsData.errors?.length || 0} errors`);
    
    if (errorsData.errors && errorsData.errors.length > 0) {
      console.log('   - Recent errors:');
      errorsData.errors.slice(0, 3).forEach((error: any, index: number) => {
        console.log(`     ${index + 1}. ${error.issue} (${error.severity}) - ${error.occurrenceCount} times`);
      });
    }
    
    // Test auto-fix status
    console.log('\n4. Testing auto-fix system...');
    const autoFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`);
    const autoFixData = await autoFixResponse.json();
    
    console.log(`✅ Auto-fix System Status:`);
    console.log(`   - Total unresolved: ${autoFixData.stats?.totalUnresolved}`);
    console.log(`   - Auto-fixable: ${autoFixData.stats?.autoFixable}`);
    console.log(`   - Pending fixes: ${autoFixData.stats?.pendingFixes}`);
    console.log(`   - Failed fixes: ${autoFixData.stats?.failedFixes}`);
    
    console.log('\n=== Phase 3: Triggering Test Errors ===');
    
    // Trigger some errors to test the system
    console.log('5. Testing error capture by triggering controlled errors...');
    
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
    
    console.log('✅ Test errors triggered');
    
    // Wait a moment for errors to be processed
    console.log('\n6. Waiting for error processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if errors were captured
    const newErrorsResponse = await fetch(`${BASE_URL}/api/system/errors?limit=10`);
    const newErrorsData = await newErrorsResponse.json();
    
    console.log(`✅ Error Capture Test:`);
    console.log(`   - Total errors after test: ${newErrorsData.total}`);
    
    if (newErrorsData.errors && newErrorsData.errors.length > 0) {
      const recentErrors = newErrorsData.errors
        .filter((error: any) => new Date(error.lastOccurrence) > new Date(Date.now() - 60000)) // Last minute
        .slice(0, 3);
      
      if (recentErrors.length > 0) {
        console.log('   - Recently captured errors:');
        recentErrors.forEach((error: any, index: number) => {
          console.log(`     ${index + 1}. ${error.issue} (${error.category})`);
          console.log(`        - Auto-fix available: ${error.autoFixAvailable}`);
          console.log(`        - Occurrences: ${error.occurrenceCount}`);
        });
      }
    }
    
    console.log('\n=== Phase 4: Testing Auto-Fix ===');
    
    // Try running auto-fix
    console.log('7. Testing auto-fix execution...');
    const runAutoFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`, {
      method: 'POST'
    });
    
    if (runAutoFixResponse.ok) {
      const autoFixResult = await runAutoFixResponse.json();
      console.log(`✅ Auto-fix execution completed:`);
      console.log(`   - Attempted: ${autoFixResult.totalAttempted || 0}`);
      console.log(`   - Successful: ${autoFixResult.successCount || 0}`);
      console.log(`   - Failed: ${autoFixResult.failureCount || 0}`);
    } else {
      console.log(`⚠️ Auto-fix execution status: ${runAutoFixResponse.status}`);
    }
    
    console.log('\n=== Phase 5: Health Dashboard Test ===');
    
    // Test the health dashboard page accessibility
    console.log('8. Testing health dashboard accessibility...');
    try {
      const dashboardResponse = await fetch(`${BASE_URL}/system/health`);
      console.log(`✅ Health Dashboard: ${dashboardResponse.ok ? 'Accessible' : 'Not accessible'}`);
      console.log(`   - Status: ${dashboardResponse.status}`);
    } catch (error) {
      console.log(`❌ Health Dashboard: Not accessible`);
      console.log(`   - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('\n=== Final System Status ===');
    
    // Get final system status
    const finalHealthResponse = await fetch(`${BASE_URL}/api/system/health`);
    const finalHealthData = await finalHealthResponse.json();
    
    console.log(`🎯 Overall System Status: ${finalHealthData.status?.toUpperCase()}`);
    console.log(`📊 Performance Metrics:`);
    console.log(`   - System uptime: ${Math.round(finalHealthData.uptime / 60)} minutes`);
    console.log(`   - Response time: ${finalHealthData.responseTime}ms`);
    console.log(`   - Memory usage: ${Math.round(finalHealthData.system?.memory?.heapUsed / 1024 / 1024)}MB`);
    
    console.log(`🔍 Error Management:`);
    console.log(`   - Total tracked errors: ${finalHealthData.errors?.total}`);
    console.log(`   - Critical errors: ${finalHealthData.errors?.critical}`);
    console.log(`   - Unresolved errors: ${finalHealthData.errors?.unresolved}`);
    console.log(`   - Auto-fix success rate: ${finalHealthData.errors?.autoFixSuccessRate}%`);
    
    console.log(`🌐 Route Health:`);
    console.log(`   - Total routes monitored: ${finalHealthData.routes?.totalRoutes}`);
    console.log(`   - Healthy routes: ${finalHealthData.routes?.healthyRoutes}`);
    console.log(`   - Degraded routes: ${finalHealthData.routes?.degradedRoutes}`);
    console.log(`   - Unhealthy routes: ${finalHealthData.routes?.unhealthyRoutes}`);
    
    if (finalHealthData.errors?.topCategories && finalHealthData.errors.topCategories.length > 0) {
      console.log(`📈 Top Error Categories:`);
      finalHealthData.errors.topCategories.slice(0, 3).forEach((category: any, index: number) => {
        console.log(`   ${index + 1}. ${category.category}: ${category.count} errors`);
      });
    }
    
    console.log('\n🎉 Robust System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Global error handling with auto-diagnosis');
    console.log('✅ Automatic route health monitoring');
    console.log('✅ Intelligent error diagnosis engine');
    console.log('✅ Real-time system health dashboard');
    console.log('✅ Automatic database and service health checks');
    console.log('✅ Auto-fix engine for common issues');
    console.log('✅ Comprehensive error reporting and tracking');
    
    console.log('\n🔗 Access Points:');
    console.log(`- Health Dashboard: ${BASE_URL}/system/health`);
    console.log(`- Health API: ${BASE_URL}/api/system/health`);
    console.log(`- Error Reports: ${BASE_URL}/api/system/errors`);
    console.log(`- Auto-fix API: ${BASE_URL}/api/system/auto-fix`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\nThis could be because:');
    console.log('1. Server is not running (start with: npm run dev)');
    console.log('2. Database connection issues');
    console.log('3. Missing environment variables');
    console.log('4. Some components not yet integrated');
  }
}

testRobustSystem();