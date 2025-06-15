import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

async function createTestUser() {
  console.log('Creating or updating test user...')
  
  try {
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    
    // Try to update existing user first
    let user = await prisma.user.findUnique({
      where: { username: 'admin' }
    })
    
    if (user) {
      user = await prisma.user.update({
        where: { username: 'admin' },
        data: {
          password: hashedPassword
        }
      })
      console.log('✅ Updated password for existing user:', user.username)
    } else {
      user = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log('✅ Created new user:', user.username)
    }
    
    console.log('Email:', user.email)
    console.log('Password: Admin123!')
    
    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    })
    
    if (!existingProfile) {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          firstName: 'Admin',
          lastName: 'User',
          timezone: 'UTC',
          language: 'en'
        }
      })
      console.log('✅ Created user profile')
    } else {
      console.log('✅ User profile already exists')
    }
    
  } catch (error) {
    console.error('Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()