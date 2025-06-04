#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'

async function cleanupTestUsers() {
  console.log('Cleaning up test data...')
  
  try {
    // Clean up test data in correct order
    const sessions = await prisma.userSession.deleteMany({})
    console.log(`Deleted ${sessions.count} sessions`)
    
    const permissions = await prisma.userPermission.deleteMany({})
    console.log(`Deleted ${permissions.count} user permissions`)
    
    const auditLogs = await prisma.auditLog.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test',
          },
        },
      },
    })
    console.log(`Deleted ${auditLogs.count} audit logs`)
    
    const profiles = await prisma.userProfile.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test',
          },
        },
      },
    })
    console.log(`Deleted ${profiles.count} user profiles`)
    
    const users = await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    })
    console.log(`Deleted ${users.count} test users`)
    
    console.log('✓ Cleanup complete')
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupTestUsers()