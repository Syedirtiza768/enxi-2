import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

async function seedAdmin() {
  console.log('🌱 Creating admin user...')
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    })
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists')
      return
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@erp.alsahab.me',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
        permissions: {
          create: [
            {
              resource: '*',
              action: '*',
              granted: true
            }
          ]
        }
      }
    })
    
    console.log('✅ Admin user created successfully')
    console.log('Username: admin')
    console.log('Password: admin123')
    console.log('⚠️  IMPORTANT: Change this password immediately!')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedAdmin().catch(console.error)