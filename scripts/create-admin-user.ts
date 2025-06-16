import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@/lib/generated/prisma'

async function createAdminUser() {
  try {
    console.log('🔑 Creating admin user...')
    
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'admin' },
          { email: 'admin@enxi-erp.com' }
        ]
      }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists')
      console.log('Username:', existingAdmin.username)
      console.log('Email:', existingAdmin.email)
      return
    }

    // Create admin user with default password
    const hashedPassword = await bcrypt.hash('demo123', 10)
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Username: admin')
    console.log('Password: demo123')
    console.log('Email:', admin.email)
    console.log('Role:', admin.role)
    console.log('ID:', admin.id)
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()