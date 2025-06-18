import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

async function fixAdminLogin() {
  try {
    console.log('🔧 Fixing admin login...')
    
    // Create a password hash for 'admin123'
    const password = 'admin123'
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Check if admin user exists by username or email
    const existingAdminByUsername = await prisma.user.findUnique({
      where: { username: 'admin' }
    })
    
    const existingAdminByEmail = await prisma.user.findUnique({
      where: { email: 'admin@enxi.com' }
    })
    
    if (existingAdminByUsername || existingAdminByEmail) {
      // Update the existing admin user
      const adminToUpdate = existingAdminByUsername || existingAdminByEmail
      await prisma.user.update({
        where: { id: adminToUpdate!.id },
        data: {
          email: 'admin@enxi.com',
          username: 'admin',
          password: hashedPassword,
          isActive: true,
          role: 'ADMIN'
        }
      })
      console.log('✅ Updated existing admin user')
      console.log(`   Previous email: ${adminToUpdate!.email}`)
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email: 'admin@enxi.com',
          username: 'admin',
          password: hashedPassword,
          isActive: true,
          role: 'ADMIN',
          profile: {
            create: {
              firstName: 'Admin',
              lastName: 'User',
              phone: '+971501234567',
            }
          }
        }
      })
      console.log('✅ Created new admin user')
    }
    
    console.log('\n📧 Admin Login Credentials:')
    console.log('   Email: admin@enxi.com')
    console.log('   Username: admin')
    console.log('   Password: admin123')
    
    // Also create a test user
    const testUserEmail = 'test@enxi.com'
    const existingTest = await prisma.user.findUnique({
      where: { email: testUserEmail }
    })
    
    if (!existingTest) {
      await prisma.user.create({
        data: {
          email: testUserEmail,
          username: 'test',
          password: hashedPassword,
          isActive: true,
          role: 'VIEWER',
          profile: {
            create: {
              firstName: 'Test',
              lastName: 'User',
              phone: '+971502345678',
            }
          }
        }
      })
      console.log('\n✅ Created test user')
      console.log('   Email: test@enxi.com')
      console.log('   Username: test')
      console.log('   Password: admin123')
    }
    
    // List all active users
    console.log('\n📋 All active users in database:')
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    })
    
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.username || 'no username'}) - Role: ${user.role}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminLogin()