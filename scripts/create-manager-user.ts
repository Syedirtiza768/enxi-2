#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'
import { Role } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

async function createManagerUser() {
  console.warn('👥 Creating manager user for sales team demo...\n')
  
  try {
    const hashedPassword = await bcrypt.hash('Manager123!', 10)
    
    // Create a manager user
    const manager = await prisma.user.upsert({
      where: { email: 'manager@enxi.com' },
      update: {
        role: Role.MANAGER,
        isActive: true,
      },
      create: {
        username: 'manager',
        email: 'manager@enxi.com',
        password: hashedPassword,
        role: Role.MANAGER,
        isActive: true,
        profile: {
          create: {
            firstName: 'Sales',
            lastName: 'Manager',
            department: 'Sales',
            jobTitle: 'Sales Manager',
          },
        },
        salesTeamMember: {
          create: {
            salesTarget: 100000,
            commission: 8,
            territory: 'West Coast',
            specialization: 'Enterprise Sales',
            isTeamLead: true,
          },
        },
      },
    })
    
    console.warn(`✓ Created manager user: ${manager.email}`)
    console.warn(`  Username: ${manager.username}`)
    console.warn(`  Password: Manager123!`)
    console.warn(`  Role: ${manager.role}`)
    
    // Create some sales reps under this manager
    const salesRep1 = await prisma.user.upsert({
      where: { email: 'sales1@enxi.com' },
      update: {
        managerId: manager.id,
        role: Role.SALES_REP,
        isActive: true,
      },
      create: {
        username: 'sales1',
        email: 'sales1@enxi.com',
        password: hashedPassword,
        role: Role.SALES_REP,
        isActive: true,
        managerId: manager.id,
        profile: {
          create: {
            firstName: 'John',
            lastName: 'Sales',
            department: 'Sales',
            jobTitle: 'Sales Representative',
          },
        },
        salesTeamMember: {
          create: {
            salesTarget: 60000,
            commission: 6,
            territory: 'North California',
            specialization: 'SMB Sales',
          },
        },
      },
    })
    
    const salesRep2 = await prisma.user.upsert({
      where: { email: 'sales2@enxi.com' },
      update: {
        managerId: manager.id,
        role: Role.SALES_REP,
        isActive: true,
      },
      create: {
        username: 'sales2',
        email: 'sales2@enxi.com',
        password: hashedPassword,
        role: Role.SALES_REP,
        isActive: true,
        managerId: manager.id,
        profile: {
          create: {
            firstName: 'Jane',
            lastName: 'Smith',
            department: 'Sales',
            jobTitle: 'Senior Sales Representative',
          },
        },
        salesTeamMember: {
          create: {
            salesTarget: 80000,
            commission: 7,
            territory: 'South California',
            specialization: 'Enterprise Sales',
          },
        },
      },
    })
    
    console.warn(`\n✓ Created sales team members:`)
    console.warn(`  ${salesRep1.email} (${salesRep1.username})`)
    console.warn(`  ${salesRep2.email} (${salesRep2.username})`)
    
    // Assign some customers to the sales reps
    const customers = await prisma.customer.findMany({
      where: { assignedToId: null },
      take: 3,
    })
    
    if (customers.length > 0) {
      // Assign first customer to sales rep 1
      await prisma.customer.update({
        where: { id: customers[0].id },
        data: {
          assignedToId: salesRep1.id,
          assignedAt: new Date(),
          assignedBy: manager.id,
          assignmentNotes: 'High-value customer - handle with care',
        },
      })
      
      if (customers.length > 1) {
        // Assign second customer to sales rep 2
        await prisma.customer.update({
          where: { id: customers[1].id },
          data: {
            assignedToId: salesRep2.id,
            assignedAt: new Date(),
            assignedBy: manager.id,
            assignmentNotes: 'Good growth potential',
          },
        })
      }
      
      if (customers.length > 2) {
        // Assign third customer to manager directly
        await prisma.customer.update({
          where: { id: customers[2].id },
          data: {
            assignedToId: manager.id,
            assignedAt: new Date(),
            assignedBy: manager.id,
            assignmentNotes: 'Strategic account - manager exclusive',
          },
        })
      }
      
      console.warn(`\n✓ Assigned ${Math.min(customers.length, 3)} customers to the sales team`)
    }
    
    console.warn('\n🏆 Sales team setup completed successfully!')
    console.warn('\n📝 You can now log in as:')
    console.warn('  Manager: manager@enxi.com / Manager123!')
    console.warn('  Sales Rep 1: sales1@enxi.com / Manager123!')
    console.warn('  Sales Rep 2: sales2@enxi.com / Manager123!')
    
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

// Run the script
createManagerUser().catch(console.error)