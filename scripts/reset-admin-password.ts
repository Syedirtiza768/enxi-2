import { PrismaClient } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdminPassword() {
  console.log('🔐 Resetting admin password...\n')

  try {
    const newPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    const updatedUser = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword }
    })

    console.log('✅ Password reset successful!')
    console.log('  Username:', updatedUser.username)
    console.log('  Email:', updatedUser.email)
    console.log('  New password:', newPassword)

  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()
  .catch(console.error)