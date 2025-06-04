#!/usr/bin/env npx tsx

async function fixAuthSystem() {
  console.log('🔧 Fixing Authentication System\n');
  
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // Step 1: Test basic server connectivity
    console.log('🌐 Step 1: Testing server connectivity...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/test-auth`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (healthResponse.ok) {
        console.log('✅ Server is running and responding');
      } else {
        console.log(`⚠️ Server responding with status: ${healthResponse.status}`);
      }
    } catch (error) {
      console.log('❌ Server connectivity issue:', error instanceof Error ? error.message : 'Unknown error');
      return;
    }

    // Step 2: Test authentication endpoint with detailed logging
    console.log('\n🔐 Step 2: Testing authentication in detail...');
    
    try {
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
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

      console.log(`Login response status: ${loginResponse.status}`);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log(`Token received: ${loginData.token?.substring(0, 30)}...`);
        
        // Step 3: Test token validation
        console.log('\n🔍 Step 3: Testing token validation...');
        
        const validateResponse = await fetch(`${BASE_URL}/api/auth/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Validation response status: ${validateResponse.status}`);
        
        if (validateResponse.ok) {
          const validateData = await validateResponse.json();
          console.log('✅ Token validation successful');
          console.log(`User: ${validateData.user?.username}`);
        } else {
          const errorData = await validateResponse.text();
          console.log('❌ Token validation failed');
          console.log(`Error: ${errorData}`);
        }
        
        // Step 4: Test protected routes
        console.log('\n🛡️ Step 4: Testing protected routes...');
        
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
              console.log(`✅ ${route} - Working`);
            } else {
              console.log(`❌ ${route} - Status ${testResponse.status}`);
              
              // Try to get error details
              try {
                const errorText = await testResponse.text();
                console.log(`   Error: ${errorText.substring(0, 100)}...`);
              } catch {
                console.log('   Error: Could not read error response');
              }
            }
          } catch (error) {
            console.log(`❌ ${route} - Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
          }
        }
        
      } else {
        console.log('❌ Login failed');
        const errorText = await loginResponse.text();
        console.log(`Error response: ${errorText}`);
        
        // Check if it's a database issue
        if (errorText.includes('database') || errorText.includes('prisma')) {
          console.log('\n💾 Database Issue Detected');
          console.log('Possible solutions:');
          console.log('1. Check if database is running');
          console.log('2. Run: npx prisma db push');
          console.log('3. Run: npx prisma generate');
          console.log('4. Check DATABASE_URL in .env');
        }
      }
      
    } catch (error) {
      console.log('❌ Authentication test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Step 5: Test our enhanced error handling system
    console.log('\n🔬 Step 5: Testing enhanced error handling...');
    
    try {
      const debugResponse = await fetch(`${BASE_URL}/api/debug-logs?limit=10`);
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('✅ Debug logging system operational');
        console.log(`   Recent logs: ${debugData.count || 0}`);
        
        // Look for auth-related errors
        if (debugData.logs) {
          const authErrors = debugData.logs.filter((log: any) => 
            log.message?.toLowerCase().includes('auth') || 
            log.message?.toLowerCase().includes('token')
          );
          
          if (authErrors.length > 0) {
            console.log('🔍 Recent auth-related log entries:');
            authErrors.slice(0, 3).forEach((log: any) => {
              console.log(`   [${log.level}] ${log.message}`);
            });
          }
        }
      } else {
        console.log('⚠️ Debug logging system not accessible');
      }
    } catch (error) {
      console.log('❌ Could not access debug logs');
    }

    // Step 6: Test auto-fix capabilities
    console.log('\n🛠️ Step 6: Testing auto-fix system...');
    
    try {
      const autoFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`, {
        method: 'GET'
      });
      
      if (autoFixResponse.ok) {
        const autoFixData = await autoFixResponse.json();
        console.log('✅ Auto-fix system operational');
        console.log(`   Available fixes: ${autoFixData.stats?.autoFixable || 0}`);
        console.log(`   Pending fixes: ${autoFixData.stats?.pendingFixes || 0}`);
        
        if (autoFixData.stats?.pendingFixes > 0) {
          console.log('\n🔧 Running available auto-fixes...');
          
          const runFixResponse = await fetch(`${BASE_URL}/api/system/auto-fix`, {
            method: 'POST'
          });
          
          if (runFixResponse.ok) {
            const fixResults = await runFixResponse.json();
            console.log(`✅ Auto-fix completed: ${fixResults.successCount || 0} successful`);
          }
        }
      } else {
        console.log('⚠️ Auto-fix system not accessible');
      }
    } catch (error) {
      console.log('❌ Could not test auto-fix system');
    }

    // Step 7: Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check server logs for detailed error information');
    console.log('2. Verify database connection and schema');
    console.log('3. Ensure all environment variables are set');
    console.log('4. Run: npm run dev (if not already running)');
    console.log('5. Check: npx prisma studio (to verify database)');
    
    console.log('\n🔧 QUICK FIXES TO TRY:');
    console.log('1. Restart the development server');
    console.log('2. Clear node_modules and reinstall: rm -rf node_modules && npm install');
    console.log('3. Reset database: npx prisma db push --force-reset');
    console.log('4. Check .env file for missing variables');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Fix identified issues');
    console.log('2. Re-run comprehensive route testing');
    console.log('3. Monitor system health dashboard');
    console.log('4. Set up continuous monitoring');
    
  } catch (error: any) {
    console.error('\n❌ AUTH FIX FAILED:', error.message);
    console.error('\nThis could be due to:');
    console.error('1. Server not running (npm run dev)');
    console.error('2. Database connection issues');
    console.error('3. Missing environment variables');
    console.error('4. Port conflicts or firewall issues');
  }
  
  console.log('\n🎉 Authentication System Analysis Complete!');
}

fixAuthSystem();