import { PrismaClient } from '../lib/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (admin) {
      console.log('Admin user found:', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        isActive: admin.isActive,
        passwordHash: admin.password.substring(0, 20) + '...'
      });
      
      // Test password
      const isValid = await bcrypt.compare('demo123', admin.password);
      console.log('Password demo123 is valid:', isValid);
      
      // Also check with bcrypt (non-js version)
      const bcryptModule = await import('bcrypt');
      const isValidBcrypt = await bcryptModule.default.compare('demo123', admin.password);
      console.log('Password demo123 is valid (bcrypt):', isValidBcrypt);
    } else {
      console.log('Admin user not found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();