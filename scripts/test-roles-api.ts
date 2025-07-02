#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testRolesAPI() {
  console.log('🔍 Testing roles API endpoints...\n');

  // Get or create a test admin user
  let testUser = await prisma.user.findFirst({
    where: { email: 'test-admin@example.com' }
  });

  if (!testUser) {
    console.log('Creating test admin user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    testUser = await prisma.user.create({
      data: {
        email: 'test-admin@example.com',
        username: 'test-admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'Admin'
          }
        }
      }
    });
    console.log('✅ Test user created');
  } else {
    console.log('✅ Test user found');
  }

  // Create a session for the test user
  const session = await prisma.userSession.create({
    data: {
      token: 'test-token-' + Date.now(),
      userId: testUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    }
  });

  console.log(`\n📋 Session created: ${session.token}`);
  console.log('\nYou can test the API endpoints with:');
  console.log(`curl -H "Authorization: Bearer ${session.token}" http://localhost:3000/api/permissions`);
  console.log(`curl -H "Authorization: Bearer ${session.token}" http://localhost:3000/api/roles/permissions`);

  // Cleanup old sessions
  await prisma.userSession.deleteMany({
    where: {
      userId: testUser.id,
      id: { not: session.id }
    }
  });

  await prisma.$disconnect();
}

testRolesAPI().catch(console.error);