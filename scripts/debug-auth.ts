import { AuthService } from '@/lib/services/auth.service'
import { getUserFromRequest } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { NextRequest } from 'next/server'

async function debugAuth() {
  console.log('🔍 Debugging Authentication System\n')
  
  try {
    // 1. Check JWT_SECRET
    console.log('1. Environment Variables:')
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing')
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing')
    
    // 2. Check if admin user exists
    console.log('\n2. Database Check:')
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })
    
    if (adminUser) {
      console.log('   Admin user: ✅ Found')
      console.log('   - ID:', adminUser.id)
      console.log('   - Email:', adminUser.email)
      console.log('   - Role:', adminUser.role)
      console.log('   - Active:', adminUser.isActive)
    } else {
      console.log('   Admin user: ❌ Not found')
    }
    
    // 3. Test AuthService
    console.log('\n3. AuthService Test:')
    const authService = new AuthService()
    
    // Test login
    const validatedUser = await authService.validateUser('admin', 'demo123')
    if (validatedUser) {
      console.log('   Login validation: ✅ Success')
      
      // Generate token
      const token = authService.generateToken(validatedUser)
      console.log('   Token generation: ✅ Success')
      console.log('   - Token length:', token.length)
      
      // Verify token
      const verifiedUser = authService.verifyToken(token)
      console.log('   Token verification:', verifiedUser ? '✅ Success' : '❌ Failed')
      
      // 4. Test getUserFromRequest
      console.log('\n4. getUserFromRequest Test:')
      
      // Create mock request with token in header
      const mockRequestWithHeader = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': `Bearer ${token}`
        }
      })
      
      try {
        const userFromHeader = await getUserFromRequest(mockRequestWithHeader)
        console.log('   Auth header test: ✅ Success')
        console.log('   - User ID:', userFromHeader.id)
      } catch (error) {
        console.log('   Auth header test: ❌ Failed')
        console.log('   - Error:', error instanceof Error ? error.message : error)
      }
      
      // Create mock request with token in cookie
      const mockRequestWithCookie = new NextRequest('http://localhost:3000/api/test')
      mockRequestWithCookie.cookies.set('auth-token', token)
      
      try {
        const userFromCookie = await getUserFromRequest(mockRequestWithCookie)
        console.log('   Cookie test: ✅ Success')
        console.log('   - User ID:', userFromCookie.id)
      } catch (error) {
        console.log('   Cookie test: ❌ Failed')
        console.log('   - Error:', error instanceof Error ? error.message : error)
      }
      
    } else {
      console.log('   Login validation: ❌ Failed')
      console.log('   - Check if password "demo123" is correct')
    }
    
    // 5. Common issues check
    console.log('\n5. Common Issues Check:')
    
    // Check JWT_SECRET value
    if (process.env.JWT_SECRET === 'your-secret-key-here') {
      console.log('   ⚠️  JWT_SECRET is using default value - should be changed in production')
    }
    
    // Check if any users exist
    const userCount = await prisma.user.count()
    console.log('   Total users in database:', userCount)
    
    if (userCount === 0) {
      console.log('   ❌ No users found - run seed script first')
    }
    
    // List all users
    if (userCount > 0 && userCount <= 10) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true
        }
      })
      console.log('\n   All users:')
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - ${user.role} - Active: ${user.isActive}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Debug error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAuth()