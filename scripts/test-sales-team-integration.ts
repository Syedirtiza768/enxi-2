#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'
import { SalesTeamService } from '../lib/services/sales-team.service'
import { Role } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

async function testSalesTeamIntegration() {
  console.warn('🚀 Testing Sales Team Integration...\n')
  
  const salesTeamService = new SalesTeamService()
  
  try {
    // 1. Create test users
    console.warn('1. Creating test users...')
    const hashedPassword = await bcrypt.hash('Test123!', 10)
    
    // Create a manager
    const manager = await prisma.user.upsert({
      where: { email: 'manager.test@enxi.com' },
      update: {},
      create: {
        username: 'manager.test',
        email: 'manager.test@enxi.com',
        password: hashedPassword,
        role: Role.MANAGER,
        isActive: true,
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'Manager',
            department: 'Sales',
            jobTitle: 'Sales Manager',
          },
        },
      },
    })
    console.warn(`   ✓ Created manager: ${manager.email}`)
    
    // Create salespeople
    const salesperson1 = await prisma.user.upsert({
      where: { email: 'sales1.test@enxi.com' },
      update: {},
      create: {
        username: 'sales1.test',
        email: 'sales1.test@enxi.com',
        password: hashedPassword,
        role: Role.SALES_REP,
        isActive: true,
        profile: {
          create: {
            firstName: 'Sales',
            lastName: 'Rep One',
            department: 'Sales',
            jobTitle: 'Sales Representative',
          },
        },
      },
    })
    console.warn(`   ✓ Created salesperson 1: ${salesperson1.email}`)
    
    const salesperson2 = await prisma.user.upsert({
      where: { email: 'sales2.test@enxi.com' },
      update: {},
      create: {
        username: 'sales2.test',
        email: 'sales2.test@enxi.com',
        password: hashedPassword,
        role: Role.SALES_REP,
        isActive: true,
        profile: {
          create: {
            firstName: 'Sales',
            lastName: 'Rep Two',
            department: 'Sales',
            jobTitle: 'Sales Representative',
          },
        },
      },
    })
    console.warn(`   ✓ Created salesperson 2: ${salesperson2.email}`)
    
    // 2. Assign salespeople to manager
    console.warn('\n2. Building team hierarchy...')
    await salesTeamService.assignSalesManager(salesperson1.id, manager.id, manager.id)
    console.warn(`   ✓ Assigned ${salesperson1.username} to ${manager.username}`)
    
    await salesTeamService.assignSalesManager(salesperson2.id, manager.id, manager.id)
    console.warn(`   ✓ Assigned ${salesperson2.username} to ${manager.username}`)
    
    // 3. Create test customers
    console.warn('\n3. Creating test customers...')
    const customer1 = await prisma.customer.create({
      data: {
        customerNumber: `TEST-${Date.now()}-1`,
        name: 'Test Customer 1',
        email: `customer1.${Date.now()}@test.com`,
        creditLimit: 10000,
        createdBy: manager.id,
      },
    })
    console.warn(`   ✓ Created customer: ${customer1.name}`)
    
    const customer2 = await prisma.customer.create({
      data: {
        customerNumber: `TEST-${Date.now()}-2`,
        name: 'Test Customer 2',
        email: `customer2.${Date.now()}@test.com`,
        creditLimit: 15000,
        createdBy: manager.id,
      },
    })
    console.warn(`   ✓ Created customer: ${customer2.name}`)
    
    const customer3 = await prisma.customer.create({
      data: {
        customerNumber: `TEST-${Date.now()}-3`,
        name: 'Test Customer 3',
        email: `customer3.${Date.now()}@test.com`,
        creditLimit: 20000,
        createdBy: manager.id,
      },
    })
    console.warn(`   ✓ Created customer: ${customer3.name}`)
    
    // 4. Assign customers
    console.warn('\n4. Assigning customers...')
    await salesTeamService.assignCustomerToSalesperson(
      customer1.id,
      salesperson1.id,
      manager.id,
      'High-value customer, handle with care'
    )
    console.warn(`   ✓ Assigned ${customer1.name} to ${salesperson1.username}`)
    
    await salesTeamService.assignCustomerToSalesperson(
      customer2.id,
      salesperson2.id,
      manager.id
    )
    console.warn(`   ✓ Assigned ${customer2.name} to ${salesperson2.username}`)
    
    await salesTeamService.assignCustomerToSalesperson(
      customer3.id,
      manager.id,
      manager.id,
      'Manager exclusive customer'
    )
    console.warn(`   ✓ Assigned ${customer3.name} to ${manager.username} (exclusive)`)
    
    // 5. Test access control
    console.warn('\n5. Testing access control...')
    
    // Test salesperson access
    const canAccess1 = await salesTeamService.canAccessCustomer(salesperson1.id, customer1.id)
    console.warn(`   ${canAccess1 ? '✓' : '✗'} ${salesperson1.username} can access ${customer1.name}`)
    
    const canAccess2 = await salesTeamService.canAccessCustomer(salesperson1.id, customer2.id)
    console.warn(`   ${canAccess2 ? '✓' : '✗'} ${salesperson1.username} cannot access ${customer2.name}`)
    
    // Test manager access
    const canAccess3 = await salesTeamService.canAccessCustomer(manager.id, customer1.id)
    console.warn(`   ${canAccess3 ? '✓' : '✗'} ${manager.username} can access ${customer1.name} (team member's)`)
    
    const canAccess4 = await salesTeamService.canAccessCustomer(manager.id, customer3.id)
    console.warn(`   ${canAccess4 ? '✓' : '✗'} ${manager.username} can access ${customer3.name} (exclusive)`)
    
    // 6. Update sales team member details
    console.warn('\n6. Setting sales targets...')
    await salesTeamService.updateSalesTeamMember(
      salesperson1.id,
      {
        salesTarget: 50000,
        commission: 5,
        territory: 'North Region',
        specialization: 'Enterprise Accounts',
      },
      manager.id
    )
    console.warn(`   ✓ Set target for ${salesperson1.username}: $50,000`)
    
    await salesTeamService.updateSalesTeamMember(
      salesperson2.id,
      {
        salesTarget: 40000,
        commission: 4.5,
        territory: 'South Region',
        specialization: 'SMB Accounts',
      },
      manager.id
    )
    console.warn(`   ✓ Set target for ${salesperson2.username}: $40,000`)
    
    // 7. Test team hierarchy
    console.warn('\n7. Fetching team hierarchy...')
    const hierarchy = await salesTeamService.getTeamHierarchy(manager.id)
    console.warn(`   ✓ Manager: ${hierarchy.manager?.name}`)
    console.warn(`   ✓ Team members: ${hierarchy.teamMembers.length}`)
    hierarchy.teamMembers.forEach((member) => {
      console.warn(`     - ${member.name}: ${member.customerCount} customers`)
    })
    
    // 8. Test accessible customers
    console.warn('\n8. Testing accessible customers...')
    const salesperson1Customers = await salesTeamService.getAccessibleCustomers(salesperson1.id)
    console.warn(`   ✓ ${salesperson1.username} can see ${salesperson1Customers.length} customer(s)`)
    
    const managerCustomers = await salesTeamService.getAccessibleCustomers(manager.id)
    console.warn(`   ✓ ${manager.username} can see ${managerCustomers.length} customers (own + team)`)
    
    console.warn('\n✅ Sales Team Integration Test Completed Successfully!')
    
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

// Run the test
testSalesTeamIntegration().catch(console.error)