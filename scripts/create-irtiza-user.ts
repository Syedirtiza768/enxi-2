import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

async function createIrtizaUser() {
  console.log('Creating user irtiza...')
  
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { username: 'irtiza' }
    })
    
    if (user) {
      user = await prisma.user.update({
        where: { username: 'irtiza' },
        data: {
          password: hashedPassword,
          isActive: true
        }
      })
      console.log('✅ Updated password for existing user:', user.username)
    } else {
      user = await prisma.user.create({
        data: {
          username: 'irtiza',
          email: 'irtiza@example.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log('✅ Created new user:', user.username)
    }
    
    console.log('Username:', user.username)
    console.log('Email:', user.email)
    console.log('Password: admin123')
    
    // Create profile if it doesn't exist
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    })
    
    if (!existingProfile) {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          firstName: 'Irtiza',
          lastName: 'Hassan',
          timezone: 'UTC',
          language: 'en'
        }
      })
      console.log('✅ Created user profile')
    } else {
      console.log('✅ User profile already exists')
    }
    
  } catch (error) {
    console.error('Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createIrtizaUser()