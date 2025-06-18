#!/usr/bin/env node

const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('Fetching all users...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log(`Found ${users.length} users:`);
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.username}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Created: ${user.createdAt.toISOString()}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();