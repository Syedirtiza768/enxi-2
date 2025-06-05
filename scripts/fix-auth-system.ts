#!/usr/bin/env npx tsx

async function fixAuthSystem() {
  console.warn('🔧 Fixing Authentication System\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // Step 1: Test basic server connectivity
    console.warn('🌐 Step 1: Testing server connectivity...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/test-auth`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (healthResponse.ok) {
        console.warn('✅ Server is running and responding');
      } else {
        console.warn(`⚠️ Server responding with status: ${healthResponse.status}`);
      }
} catch (error) {
      console.error('Error:', error);
      // Step 2: Test authentication endpoint with detailed logging
    console.warn('\n🔐 Step 2: Testing authentication in detail...');
    
    try {
      const loginResponse = await fetch(`${BASE_URL
    }/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'AuthFixTool/1.0'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'demo123'
        })
      });

      console.warn(`Login response status: ${loginResponse.status}`);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.warn('✅ Login successful');
        console.warn(`Token received: ${loginData.token?.substring(0, 30)}...`);
        
        // Step 3: Test token validation
        console.warn('\n🔍 Step 3: Testing token validation...');
        
        const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.warn(`Validation response status: ${validateResponse.status}`);
        
        if (validateResponse.ok) {
          const validateData = await validateResponse.json();
          console.warn('✅ Token validation successful');
          console.warn(`User: ${validateData.user?.username}`);
        } else {
          const errorData = await validateResponse.text();
          console.warn('❌ Token validation failed');
          console.warn(`Error: ${errorData}`);
        }
        
        // Step 4: Test protected routes
        console.warn('\n🛡️ Step 4: Testing protected routes...');
        
        const protectedRoutes = [
          '/api/leads',
          '/api/customers',
          '/api/system/health'
        ];
        
        for (const route of protectedRoutes) {
          try {
            const testResponse = await fetch(`${BASE_URL}${route}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (testResponse.ok) {
              console.warn(`✅ ${route} - Working`);
            } else {
              console.warn(`❌ ${route} - Status ${testResponse.status}`);
              
              // Try to get error details
              try {
                const errorText = await testResponse.text();
                console.warn(`   Error: ${errorText.substring(0, 100)}...`);
              } catch (error) {
                console.warn('   Error: Could not read error response');
    }
              }
            }
} catch {          }
        }
        
      } else {
        console.warn('❌ Login failed');
        const errorText = await loginResponse.text();
        console.warn(`Error response: ${errorText}`);
        
        // Check if it's a database issue
        if (errorText.includes('database') || errorText.includes('prisma')) {
          console.warn('\n💾 Database Issue Detected');
          console.warn('Possible solutions:');
          console.warn('1. Check if database is running');
          console.warn('2. Run: npx prisma db push');
          console.warn('3. Run: npx prisma generate');
          console.warn('4. Check DATABASE_URL in .env');
        }
      }
      
} catch (error) {
    // Step 5: Test our enhanced error handling system
    console.warn('\n🔬 Step 5: Testing enhanced error handling...');
    
    try {
    }
      const debugResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=10`);
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.warn('✅ Debug logging system operational');
        console.warn(`   Recent logs: ${debugData.count || 0}`);
        
        // Look for auth-related errors
        if (debugData.logs) {
          const authErrors = debugData.logs.filter((log: any) => 
            log.message?.toLowerCase().includes('auth') || 
            log.message?.toLowerCase().includes('token')
          );
          
          if (authErrors.length > 0) {
            console.warn('🔍 Recent auth-related log entries:');
            authErrors.slice(0, 3).forEach((log: any) => {
              console.warn(`   [${log.level}] ${log.message}`);
            });
          }
        }
      } else {
        console.warn('⚠️ Debug logging system not accessible');
      }
} catch (error) {
      console.error('Error:', error);
      // Step 6: Test auto-fix capabilities
    console.warn('\n🛠️ Step 6: Testing auto-fix system...');
    
    try {
      const autoFixResponse = await fetch(`${BASE_URL
    }/api/system/auto-fix`, {
        method: 'GET'
      });
      
      if (autoFixResponse.ok) {
        const autoFixData = await autoFixResponse.json();
        console.warn('✅ Auto-fix system operational');
        console.warn(`   Available fixes: ${autoFixData.stats?.autoFixable || 0}`);
        console.warn(`   Pending fixes: ${autoFixData.stats?.pendingFixes || 0}`);
        
        if (autoFixData.stats?.pendingFixes > 0) {
          console.warn('\n🔧 Running available auto-fixes...');
          
          const runFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`, {
            method: 'POST'
          });
          
          if (runFixResponse.ok) {
            const fixResults = await runFixResponse.json();
            console.warn(`✅ Auto-fix completed: ${fixResults.successCount || 0} successful`);
          }
        }
      } else {
        console.warn('⚠️ Auto-fix system not accessible');
      }
} catch (error) {
    // Step 7: Recommendations
    console.warn('\n💡 RECOMMENDATIONS:');
    console.warn('1. Check server logs for detailed error information');
    console.warn('2. Verify database connection and schema');
    console.warn('3. Ensure all environment variables are set');
    console.warn('4. Run: npm run dev (if not already running)');
    console.warn('5. Check: npx prisma studio (to verify database)');
    
    console.warn('\n🔧 QUICK FIXES TO TRY:');
    console.warn('1. Restart the development server');
    console.warn('2. Clear node_modules and reinstall: rm -rf node_modules && npm install');
    console.warn('3. Reset database: npx prisma db push --force-reset');
    console.warn('4. Check .env file for missing variables');
    
    console.warn('\n🎯 NEXT STEPS:');
    console.warn('1. Fix identified issues');
    console.warn('2. Re-run comprehensive route testing');
    console.warn('3. Monitor system health dashboard');
    console.warn('4. Set up continuous monitoring');
    
    }
  } catch (error: any) {
    console.error('\n❌ AUTH FIX FAILED:', error.message);
    console.error('\nThis could be due to:');
    console.error('1. Server not running (npm run dev)');
    console.error('2. Database connection issues');
    console.error('3. Missing environment variables');
    console.error('4. Port conflicts or firewall issues');
  }
  
  console.warn('\n🎉 Authentication System Analysis Complete!');
}

fixAuthSystem();