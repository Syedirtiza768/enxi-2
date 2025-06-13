#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Check if admin user exists
  let adminUser = await prisma.user.findFirst({
    where: { email: 'admin@enxi.com' }
  })
  
  if (!adminUser) {
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@enxi.com',
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    })
    console.log('✅ Admin user created')
  } else {
    console.log('✅ Admin user exists:', adminUser.email)
  }
  
  await prisma.$disconnect()
}

main()