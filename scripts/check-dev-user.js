#!/usr/bin/env node

const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkDevUser() {
  try {
    console.log('Checking for dev-user...');
    
    // Check if dev-user exists
    const devUser = await prisma.user.findUnique({
      where: { id: 'dev-user' }
    });
    
    if (devUser) {
      console.log('✓ dev-user exists:', {
        id: devUser.id,
        username: devUser.username,
        email: devUser.email,
        role: devUser.role,
        isActive: devUser.isActive
      });
    } else {
      console.log('✗ dev-user does not exist');
      
      // Create dev-user
      console.log('Creating dev-user...');
      const newUser = await prisma.user.create({
        data: {
          id: 'dev-user',
          username: 'devuser',
          email: 'dev@example.com',
          password: 'hashed-password', // This won't be used for authentication
          role: 'ADMIN',
          isActive: true
        }
      });
      
      console.log('✓ dev-user created:', {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDevUser();