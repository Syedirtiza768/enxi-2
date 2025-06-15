import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

async function resetAdminPassword() {
  console.log('Resetting admin password...')
  
  try {
    const hashedPassword = await bcrypt.hash('Admin123\!', 10)
    
    const user = await prisma.user.update({
      where: { username: 'admin' },
      data: {
        password: hashedPassword
      }
    })
    
    console.log('✅ Password reset for user:', user.username)
    console.log('Email:', user.email)
    console.log('New password: Admin123\!')
    
  } catch (error) {
    console.error('Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()
EOF < /dev/null