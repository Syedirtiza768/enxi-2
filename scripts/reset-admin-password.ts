import { PrismaClient } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdminPassword(): Promise<void> {
  console.warn('🔐 Resetting admin password...\n')

  try {
    const newPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    const updatedUser = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword }
    })

    console.warn('✅ Password reset successful!')
    console.warn('  Username:', updatedUser.username)
    console.warn('  Email:', updatedUser.email)
    console.warn('  New password:', newPassword)

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

resetAdminPassword()
  .catch(console.error)