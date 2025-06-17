#!/usr/bin/env ts-node

/**
 * Manual testing script for sales team edge cases
 * Run with: npx ts-node scripts/test-sales-team-edge-cases.ts
 */

import { prisma } from '@/lib/db/prisma'
import { Role } from '@/lib/generated/prisma'
import { SalesTeamService } from '@/lib/services/sales-team.service'

const salesTeamService = new SalesTeamService()

// Test data
const testData = {
  managerId: '',
  salesperson1Id: '',
  salesperson2Id: '',
  customer1Id: '',
  customer2Id: '',
  nonExistentCustomerId: 'non-existent-customer-123',
  nonExistentUserId: 'non-existent-user-123',
}

async function setupTestData() {
  console.log('🔧 Setting up test data...')

  // Create test users
  const manager = await prisma.user.create({
    data: {
      username: 'test_manager_edge',
      email: 'test_manager_edge@example.com',
      password: 'hashed_password',
      role: Role.MANAGER,
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'Manager Edge',
        },
      },
    },
  })
  testData.managerId = manager.id

  const salesperson1 = await prisma.user.create({
    data: {
      username: 'test_salesperson1_edge',
      email: 'test_salesperson1_edge@example.com',
      password: 'hashed_password',
      role: Role.SALES_REP,
      managerId: manager.id,
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'Salesperson1 Edge',
        },
      },
    },
  })
  testData.salesperson1Id = salesperson1.id

  const salesperson2 = await prisma.user.create({
    data: {
      username: 'test_salesperson2_edge',
      email: 'test_salesperson2_edge@example.com',
      password: 'hashed_password',
      role: Role.SALES_REP,
      managerId: manager.id,
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'Salesperson2 Edge',
        },
      },
    },
  })
  testData.salesperson2Id = salesperson2.id

  // Create test customers
  const customer1 = await prisma.customer.create({
    data: {
      customerNumber: 'EDGE-001',
      name: 'Edge Case Customer 1',
      email: 'edge1@example.com',
      phone: '555-0001',
      status: 'active',
    },
  })
  testData.customer1Id = customer1.id

  const customer2 = await prisma.customer.create({
    data: {
      customerNumber: 'EDGE-002',
      name: 'Edge Case Customer 2',
      email: 'edge2@example.com',
      phone: '555-0002',
      status: 'active',
      assignedToId: salesperson1.id,
      assignedAt: new Date(),
      assignedBy: manager.id,
    },
  })
  testData.customer2Id = customer2.id

  console.log('✅ Test data created')
  return testData
}

async function testEdgeCases() {
  console.log('\n🧪 Starting edge case tests...\n')

  // Test 1: Assign already assigned customer
  console.log('📋 Test 1: Assigning already assigned customer')
  try {
    await salesTeamService.assignCustomerToSalesperson(
      testData.customer2Id,
      testData.salesperson2Id,
      testData.managerId,
      'Reassigning for testing'
    )
    console.log('✅ Successfully reassigned customer')
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  // Test 2: Unassign customer who isn't assigned
  console.log('\n📋 Test 2: Unassigning customer who isn\'t assigned')
  try {
    await salesTeamService.unassignCustomer(
      testData.customer1Id,
      testData.managerId,
      'Testing unassignment'
    )
    console.log('✅ Successfully unassigned')
  } catch (error) {
    console.error('❌ Expected error:', error.message)
  }

  // Test 3: Invalid customer ID
  console.log('\n📋 Test 3: Assigning with invalid customer ID')
  try {
    await salesTeamService.assignCustomerToSalesperson(
      testData.nonExistentCustomerId,
      testData.salesperson1Id,
      testData.managerId
    )
    console.log('✅ Unexpected success')
  } catch (error) {
    console.error('✅ Expected error:', error.message)
  }

  // Test 4: Invalid user ID
  console.log('\n📋 Test 4: Assigning to invalid user ID')
  try {
    await salesTeamService.assignCustomerToSalesperson(
      testData.customer1Id,
      testData.nonExistentUserId,
      testData.managerId
    )
    console.log('✅ Unexpected success')
  } catch (error) {
    console.error('✅ Expected error:', error.message)
  }

  // Test 5: Permission check - salesperson trying to unassign another's customer
  console.log('\n📋 Test 5: Permission denied scenario')
  try {
    await salesTeamService.unassignCustomer(
      testData.customer2Id,
      testData.salesperson1Id, // Not a manager or admin
      'Unauthorized attempt'
    )
    console.log('✅ Unexpected success')
  } catch (error) {
    console.error('✅ Expected error:', error.message)
  }

  // Test 6: Empty data state - team with no customers
  console.log('\n📋 Test 6: Getting accessible customers for new salesperson')
  try {
    const customers = await salesTeamService.getAccessibleCustomers(testData.salesperson2Id)
    console.log(`✅ Found ${customers.length} accessible customers`)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  // Test 7: Concurrent updates simulation
  console.log('\n📋 Test 7: Simulating concurrent assignments')
  try {
    const assignments = [
      salesTeamService.assignCustomerToSalesperson(
        testData.customer1Id,
        testData.salesperson1Id,
        testData.managerId,
        'Concurrent test 1'
      ),
      salesTeamService.assignCustomerToSalesperson(
        testData.customer1Id,
        testData.salesperson2Id,
        testData.managerId,
        'Concurrent test 2'
      ),
    ]

    const results = await Promise.allSettled(assignments)
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Assignment ${index + 1} succeeded`)
      } else {
        console.log(`❌ Assignment ${index + 1} failed:`, result.reason.message)
      }
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  // Test 8: Special characters in search
  console.log('\n📋 Test 8: Search with special characters')
  try {
    const specialSearch = "O'Brien & Co. <script>alert('test')</script>"
    const results = await salesTeamService.getAccessibleCustomers(testData.managerId, {
      search: specialSearch,
    })
    console.log(`✅ Search completed safely, found ${results.length} results`)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  // Test 9: Performance metrics with zero target
  console.log('\n📋 Test 9: Performance metrics with zero sales target')
  try {
    // Create sales team member with zero target
    await prisma.salesTeamMember.create({
      data: {
        userId: testData.salesperson1Id,
        salesTarget: 0,
        currentMonthSales: 5000,
        yearToDateSales: 25000,
      },
    })

    const performance = await salesTeamService.getTeamPerformance(testData.managerId)
    console.log('✅ Target achievement:', performance.targetAchievement)
    console.log('   Total customers:', performance.totalCustomers)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  // Test 10: Assign to user with wrong role
  console.log('\n📋 Test 10: Assigning to user with wrong role')
  try {
    // Create an accountant user
    const accountant = await prisma.user.create({
      data: {
        username: 'test_accountant_edge',
        email: 'test_accountant_edge@example.com',
        password: 'hashed_password',
        role: Role.ACCOUNTANT,
      },
    })

    await salesTeamService.assignCustomerToSalesperson(
      testData.customer1Id,
      accountant.id,
      testData.managerId
    )
    console.log('✅ Unexpected success')

    // Cleanup
    await prisma.user.delete({ where: { id: accountant.id } })
  } catch (error) {
    console.error('✅ Expected error:', error.message)
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...')

  try {
    // Delete audit logs
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: testData.managerId },
          { userId: testData.salesperson1Id },
          { userId: testData.salesperson2Id },
        ],
      },
    })

    // Delete sales team members
    await prisma.salesTeamMember.deleteMany({
      where: {
        userId: {
          in: [testData.salesperson1Id, testData.salesperson2Id],
        },
      },
    })

    // Delete customers
    await prisma.customer.deleteMany({
      where: {
        id: {
          in: [testData.customer1Id, testData.customer2Id],
        },
      },
    })

    // Delete users
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testData.managerId, testData.salesperson1Id, testData.salesperson2Id],
        },
      },
    })

    console.log('✅ Test data cleaned up')
  } catch (error) {
    console.error('❌ Cleanup error:', error.message)
  }
}

async function main() {
  console.log('🚀 Sales Team Edge Cases Testing Script')
  console.log('=====================================\n')

  try {
    await setupTestData()
    await testEdgeCases()
  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await cleanupTestData()
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)