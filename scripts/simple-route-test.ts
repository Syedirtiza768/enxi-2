#!/usr/bin/env npx tsx

async function simpleRouteTest() {
  console.warn('🚀 Simple Route Testing and Fixing Demo\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  // Define known routes to test
  const testRoutes = [
    { path: '/api/auth/login', method: 'POST', requiresAuth: false },
    { path: '/api/auth/validate', method: 'GET', requiresAuth: true },
    { path: '/api/leads', method: 'GET', requiresAuth: true },
    { path: '/api/leads', method: 'POST', requiresAuth: true },
    { path: '/api/customers', method: 'GET', requiresAuth: true },
    { path: '/api/inventory/categories', method: 'GET', requiresAuth: true },
    { path: '/api/inventory/items', method: 'GET', requiresAuth: true },
    { path: '/api/quotations', method: 'GET', requiresAuth: true },
    { path: '/api/sales-orders', method: 'GET', requiresAuth: true },
    { path: '/api/invoices', method: 'GET', requiresAuth: true },
    { path: '/api/system/health', method: 'GET', requiresAuth: false },
    { path: '/api/system/errors', method: 'GET', requiresAuth: false },
    { path: '/api/system/auto-fix', method: 'GET', requiresAuth: false }
  ];

  let authToken: string | null = null;
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  const errors: any[] = [];

  try {
    // Step 1: Authenticate
    console.warn('🔐 Step 1: Authenticating...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      console.warn('✅ Authentication successful');
    } else {
      console.warn('❌ Authentication failed - continuing without auth');
    }

    // Step 2: Test each route
    console.warn('\n🧪 Step 2: Testing routes...');
    
    for (const route of testRoutes) {
      totalTests++;
      const startTime = Date.now();

      try {
        const headers: any = {
          'Content-Type': 'application/json',
          'User-Agent': 'SimpleRouteTest/1.0'
        };

        if (route.requiresAuth && authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        let body = undefined;
        if (route.method === 'POST' && route.path === '/api/leads') {
          body = JSON.stringify({
            firstName: 'Test',
            lastName: 'Lead',
            email: `test-${Date.now()}@example.com`,
            phone: '+1234567890',
            company: 'Test Company',
            source: 'WEBSITE'
          });
        }

        const response = await fetch(`${BASE_URL}${route.path}`, {
          method: route.method,
          headers,
          body
        });

        const responseTime = Date.now() - startTime;
        const expectedStatus = route.requiresAuth && !authToken ? 401 : 200;
        
        if (response.status === expectedStatus || (response.status >= 200 && response.status < 300)) {
          passed++;
          console.warn(`✅ ${route.method} ${route.path} - ${response.status} (${responseTime}ms)`);
        } else {
          failed++;
          const errorText = await response.text().catch(() => 'Unknown error');
          console.warn(`❌ ${route.method} ${route.path} - ${response.status} (${responseTime}ms)`);
          
          errors.push({
            route: `${route.method} ${route.path}`,
            status: response.status,
            expected: expectedStatus,
            error: errorText,
            responseTime
          });
        }
} catch (error) {        
        errors.push({
    }
          route: `${route.method} ${route.path}`,
          status: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime
        });
      }

      // Small delay to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Test our comprehensive system
    console.warn('\n🔬 Step 3: Testing comprehensive route testing system...');
    
    try {
      const routeTestResponse = await fetch(`${BASE_URL}/api/system/route-test`, {
        method: 'GET'
      });
      
      if (routeTestResponse.ok) {
        const routeTestData = await routeTestResponse.json();
        console.warn('✅ Route testing system is operational');
        console.warn(`   - Discovered ${routeTestData.discovery.totalRoutes} total routes`);
        console.warn(`   - API routes: ${routeTestData.discovery.apiRoutes}`);
        console.warn(`   - Page routes: ${routeTestData.discovery.pageRoutes}`);
        console.warn(`   - Categories: ${routeTestData.discovery.categories.length}`);
        
        // Run a quick test
        console.warn('\n🎯 Running quick comprehensive test...');
        const quickTestResponse = await fetch(`${BASE_URL}/api/system/route-test?mode=test&category=system`, {
          method: 'POST'
        });
        
        if (quickTestResponse.ok) {
          const quickTestData = await quickTestResponse.json();
          console.warn('✅ Quick comprehensive test completed');
          console.warn(`   - Tests run: ${quickTestData.testing?.totalTests || 0}`);
          console.warn(`   - Success rate: ${quickTestData.testing?.successRate || 0}%`);
        }
      } else {
        console.warn('❌ Route testing system not accessible');
      }
} catch (error) {
      console.error('Error:', error);
      // Step 4: Results Summary
    console.warn('\n📊 RESULTS SUMMARY');
    console.warn('=' .repeat(40));
    console.warn(`Total Routes Tested: ${totalTests
    }`);
    console.warn(`Passed: ${passed}`);
    console.warn(`Failed: ${failed}`);
    console.warn(`Success Rate: ${Math.round((passed / totalTests) * 100)}%`);

    if (errors.length > 0) {
      console.warn('\n❌ FAILED ROUTES:');
      errors.forEach(error => {
        console.warn(`   - ${error.route}: Status ${error.status} (Expected ${error.expected || 'success'})`);
        if (error.error && error.error.length < 100) {
          console.warn(`     Error: ${error.error}`);
        }
      });

      // Step 5: Automatic fixing demonstration
      console.warn('\n🔧 Step 5: Demonstrating automatic fixing...');
      
      // Categorize errors
      const authErrors = errors.filter(e => e.status === 401).length;
      const notFoundErrors = errors.filter(e => e.status === 404).length;
      const serverErrors = errors.filter(e => e.status >= 500).length;
      const networkErrors = errors.filter(e => e.status === 0).length;

      console.warn('Error categorization:');
      if (authErrors > 0) console.warn(`   - Authentication errors: ${authErrors} (Auto-fixable)`);
      if (notFoundErrors > 0) console.warn(`   - Not found errors: ${notFoundErrors} (Auto-fixable)`);
      if (serverErrors > 0) console.warn(`   - Server errors: ${serverErrors} (May require manual fix)`);
      if (networkErrors > 0) console.warn(`   - Network errors: ${networkErrors} (Check server status)`);

      // Try auto-fix API
      try {
        const autoFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`, {
          method: 'GET'
        });
        
        if (autoFixResponse.ok) {
          const autoFixData = await autoFixResponse.json();
          console.warn('\n🛠️ Auto-fix system status:');
          console.warn(`   - Auto-fixable errors: ${autoFixData.stats?.autoFixable || 0}`);
          console.warn(`   - Pending fixes: ${autoFixData.stats?.pendingFixes || 0}`);
          console.warn(`   - Failed fixes: ${autoFixData.stats?.failedFixes || 0}`);
        }
} catch {    }

    // Step 6: Recommendations
    console.warn('\n💡 RECOMMENDATIONS:');
    
    const successRate = Math.round((passed / totalTests) * 100);
    
    if (successRate >= 90) {
      console.warn('🟢 Excellent: System is highly functional');
    } else if (successRate >= 70) {
      console.warn('🟡 Good: Some issues need attention');
    } else if (successRate >= 50) {
      console.warn('🟠 Warning: Multiple issues detected');
    } else {
      console.warn('🔴 Critical: System needs immediate attention');
    }

    if (authToken) {
      console.warn('✅ Authentication is working correctly');
    } else {
      console.warn('🔴 Authentication system needs investigation');
    }

    if (errors.some(e => e.status === 0)) {
      console.warn('🔴 Network connectivity issues detected');
      console.warn('   - Check if server is running: npm run dev');
      console.warn('   - Verify database connection');
      console.warn('   - Check environment variables');
    }

    console.warn('\n🎯 NEXT STEPS:');
    console.warn('1. Run the full system: npm run dev');
    console.warn('2. Visit health dashboard: http://localhost:3000/system/health');
    console.warn('3. Use comprehensive testing: POST /api/system/route-test?mode=full');
    console.warn('4. Monitor system health: GET /api/system/health');
    console.warn('5. Auto-fix issues: POST /api/system/auto-fix');

    console.warn('\n🎉 Simple Route Testing Complete!');

  } catch (error: any) {
    console.error('\n❌ TESTING FAILED:', error.message);
    console.error('\nThis is likely because:');
    console.error('1. Server is not running (start with: npm run dev)');
    console.error('2. Database connection issues');
    console.error('3. Environment variables not set');
    process.exit(1);
  }
}

simpleRouteTest();