#!/usr/bin/env tsx
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function testAuthEndpoint() {
  console.log('🔍 Testing authentication endpoint...\n');
  
  try {
    // Check database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected\n');
    
    // Check if admin user exists
    console.log('2. Checking admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      
      // Create admin user for testing
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@test.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          createdBy: 'system'
        }
      });
      console.log('✅ Admin user created\n');
    } else {
      console.log('✅ Admin user exists');
      console.log(`   - Username: ${adminUser.username}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Role: ${adminUser.role}`);
      console.log(`   - Active: ${adminUser.isActive}\n`);
      
      // Verify password
      console.log('3. Verifying password...');
      const isValidPassword = await bcrypt.compare('admin123', adminUser.password);
      console.log(`   Password valid: ${isValidPassword}\n`);
    }
    
    // Test the login endpoint
    console.log('4. Testing login endpoint...');
    console.log('   Making POST request to /api/auth/login');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log(`   Response status: ${response.status}`);
    console.log(`   Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`   Response body: ${responseText}`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ Login successful!');
      console.log('   Token:', data.token?.substring(0, 20) + '...');
      console.log('   User:', data.user);
    } else {
      console.log('\n❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if JWT_SECRET is set
console.log('Environment check:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('\n');

testAuthEndpoint();