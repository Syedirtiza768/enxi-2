import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    })

    if (existingAdmin) {
      console.log('Admin user already exists')
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    })

    console.log('Admin user created successfully:', {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    })
  } catch (error) {
    console.error('Error seeding admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedAdmin()