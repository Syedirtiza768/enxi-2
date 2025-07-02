import { AuthService } from '@/lib/services/auth.service'
import { prisma } from '@/lib/db/prisma'

async function testAuth() {
  try {
    console.log('🔍 Testing authentication system...')
    
    // Check JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET
    console.log('\n1. JWT_SECRET configured:', jwtSecret ? 'Yes' : 'No')
    if (jwtSecret) {
      console.log('   JWT_SECRET length:', jwtSecret.length)
      console.log('   JWT_SECRET preview:', jwtSecret.substring(0, 10) + '...')
    }
    
    // Initialize AuthService
    console.log('\n2. Initializing AuthService...')
    const authService = new AuthService()
    console.log('   ✅ AuthService initialized successfully')
    
    // Test user validation
    console.log('\n3. Testing user validation...')
    const validUser = await authService.validateUser('admin', 'demo123')
    
    if (validUser) {
      console.log('   ✅ User validation successful!')
      console.log('   User ID:', validUser.id)
      console.log('   Username:', validUser.username)
      console.log('   Email:', validUser.email)
      console.log('   Role:', validUser.role)
      
      // Test token generation
      console.log('\n4. Testing token generation...')
      const token = authService.generateToken(validUser)
      console.log('   ✅ Token generated successfully')
      console.log('   Token length:', token.length)
      console.log('   Token preview:', token.substring(0, 20) + '...')
      
      // Test token verification
      console.log('\n5. Testing token verification...')
      const verifiedUser = authService.verifyToken(token)
      console.log('   ✅ Token verified successfully')
      console.log('   Verified user ID:', verifiedUser?.id)
      
    } else {
      console.log('   ❌ User validation failed!')
      
      // Check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { username: 'admin' }
      })
      
      if (dbUser) {
        console.log('\n   Debug info:')
        console.log('   User found in database: Yes')
        console.log('   User active:', dbUser.isActive)
        console.log('   Password hash length:', dbUser.password.length)
        console.log('   Password hash preview:', dbUser.password.substring(0, 20) + '...')
      } else {
        console.log('\n   Debug info:')
        console.log('   User found in database: No')
      }
    }
    
    // Test invalid credentials
    console.log('\n6. Testing invalid credentials...')
    const invalidUser = await authService.validateUser('admin', 'wrongpassword')
    console.log('   Invalid password result:', invalidUser ? 'User returned (ERROR)' : 'null (correct)')
    
    const nonExistentUser = await authService.validateUser('nonexistent', 'password')
    console.log('   Non-existent user result:', nonExistentUser ? 'User returned (ERROR)' : 'null (correct)')
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuth()