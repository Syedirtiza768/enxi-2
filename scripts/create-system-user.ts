import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

async function createSystemUser() {
  try {
    // Check if system user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'system' }
    })

    if (existingUser) {
      console.log('System user already exists')
      return
    }

    // Create system user
    const hashedPassword = await bcrypt.hash('system-password-not-for-login', 10)
    
    const systemUser = await prisma.user.create({
      data: {
        id: 'system',
        username: 'system',
        email: 'system@enxi.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    console.log('System user created successfully:', systemUser)
  } catch (error) {
    console.error('Error creating system user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSystemUser()