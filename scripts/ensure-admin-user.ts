import { PrismaClient } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Ensuring admin user exists...')
  
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    // First check if admin user exists by username
    let adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    })
    
    if (!adminUser) {
      // Try by email if username not found
      adminUser = await prisma.user.findUnique({
        where: { email: 'admin@marinepoweruae.com' },
      })
    }
    
    if (adminUser) {
      // Update the password to ensure it's correct
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          password: hashedPassword,
          isActive: true,
          role: 'SUPER_ADMIN',
        }
      })
      console.log('✅ Updated admin user password')
    } else {
      // Create new admin user
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@marinepoweruae.com',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      })
      console.log('✅ Created new admin user')
    }
    
    // Ensure user profile exists
    const profile = await prisma.userProfile.findUnique({
      where: { userId: adminUser.id }
    })
    
    if (!profile) {
      await prisma.userProfile.create({
        data: {
          userId: adminUser.id,
          firstName: 'Admin',
          lastName: 'User',
          department: 'Management',
          jobTitle: 'System Administrator',
        },
      })
      console.log('✅ Created admin profile')
    } else {
      console.log('✅ Admin profile already exists')
    }
    
    console.log('\n📋 Admin credentials:')
    console.log('Username: admin')
    console.log('Password: admin123')
    console.log('Email:', adminUser.email)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })