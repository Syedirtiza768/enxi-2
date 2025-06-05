import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    })

    if (existingAdmin) {
      console.warn('Admin user already exists')
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

    console.warn('Admin user created successfully:', {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    })
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

seedAdmin()