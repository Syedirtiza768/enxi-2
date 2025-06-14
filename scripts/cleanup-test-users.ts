#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'

async function cleanupTestUsers(): Promise<void> {
  console.warn('Cleaning up test data...')
  
  try {
    // Clean up test data in correct order
    const sessions = await prisma.userSession.deleteMany({})
    console.warn(`Deleted ${sessions.count} sessions`)
    
    const permissions = await prisma.userPermission.deleteMany({})
    console.warn(`Deleted ${permissions.count} user permissions`)
    
    const auditLogs = await prisma.auditLog.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test',
          },
        },
      },
    })
    console.warn(`Deleted ${auditLogs.count} audit logs`)
    
    const profiles = await prisma.userProfile.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test',
          },
        },
      },
    })
    console.warn(`Deleted ${profiles.count} user profiles`)
    
    const users = await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    })
    console.warn(`Deleted ${users.count} test users`)
    
    console.warn('✓ Cleanup complete')
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

cleanupTestUsers()