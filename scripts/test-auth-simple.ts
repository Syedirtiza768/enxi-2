import { PrismaClient } from '../lib/generated/prisma'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function testAuth(): Promise<void> {
  try {
    // Check if admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@enxi.com' }
    })
    
    if (!admin) {
      console.log('Admin user not found, creating...')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@enxi.com',
          username: 'admin',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log('Admin user created:', newAdmin.email)
    } else {
      console.log('Admin user exists:', admin.email)
      
      // Verify password
      const isValid = await bcrypt.compare('admin123', admin.password)
      console.log('Password valid:', isValid)
      
      if (!isValid) {
        // Reset password
        const hashedPassword = await bcrypt.hash('admin123', 10)
        await prisma.user.update({
          where: { id: admin.id },
          data: { password: hashedPassword }
        })
        console.log('Password reset for admin user')
      }
    }
    
    // Test direct authentication
    console.log('\nTesting authentication...')
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@enxi.com' }
    })
    
    if (testUser) {
      const passwordMatch = await bcrypt.compare('admin123', testUser.password)
      console.log('Direct auth test - Password match:', passwordMatch)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuth()