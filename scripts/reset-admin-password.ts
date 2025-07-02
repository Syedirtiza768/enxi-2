import { PrismaClient } from '../lib/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const newPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const updatedUser = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Admin password reset successfully!');
    console.log('Username:', updatedUser.username);
    console.log('Email:', updatedUser.email);
    console.log('New password:', newPassword);
    
    // Verify the password works
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('Password verification:', isValid ? '✓ Valid' : '✗ Invalid');
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();