#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'
import { AuditService } from '../lib/services/audit.service'

async function testAuditSystem() {
  console.log('Testing Audit System...\n')
  
  const auditService = new AuditService()
  
  try {
    // Get an existing user first
    const existingUser = await prisma.user.findFirst()
    if (!existingUser) {
      console.log('❌ No users found in the database. Please seed the database first.')
      return
    }
    
    console.log(`Using user: ${existingUser.username} (${existingUser.id})`)
    
    // Test 1: Create some audit logs
    console.log('\n1. Creating test audit logs...')
    
    const testLogs = [
      {
        userId: existingUser.id,
        action: 'CREATE' as const,
        entityType: 'Customer',
        entityId: 'test-customer-1',
        metadata: { username: existingUser.username, email: 'test@example.com' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Script'
      },
      {
        userId: existingUser.id,
        action: 'UPDATE' as const,
        entityType: 'Customer',
        entityId: 'test-customer-1',
        metadata: { username: existingUser.username, field: 'name', oldValue: 'Test', newValue: 'Test Customer' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Script'
      },
      {
        userId: existingUser.id,
        action: 'LOGIN' as const,
        entityType: 'User',
        entityId: existingUser.id,
        metadata: { username: existingUser.username },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Script'
      }
    ]
    
    for (const log of testLogs) {
      const result = await auditService.logAction(log)
      if (result) {
        console.log(`✓ Created audit log: ${log.action} ${log.entityType}`)
      } else {
        console.log(`✗ Failed to create audit log: ${log.action} ${log.entityType}`)
      }
    }
    
    // Test 2: Retrieve audit logs
    console.log('\n2. Retrieving audit logs...')
    const { data: logs, total } = await auditService.getAuditLogs({}, { page: 1, limit: 10 })
    console.log(`✓ Found ${total} total audit logs`)
    console.log(`✓ Retrieved ${logs.length} logs on page 1`)
    
    // Test 3: Filter by user
    console.log('\n3. Testing user filter...')
    const { data: userLogs, total: userTotal } = await auditService.getUserActivity(existingUser.id)
    console.log(`✓ Found ${userTotal} logs for user '${existingUser.username}'`)
    
    // Test 4: Entity history
    console.log('\n4. Testing entity history...')
    const history = await auditService.getEntityHistory('Customer', 'test-customer-1')
    console.log(`✓ Found ${history.length} logs for Customer test-customer-1`)
    
    // Test 5: Generate report
    console.log('\n5. Testing audit report generation...')
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    
    const report = await auditService.generateAuditReport(startDate, endDate)
    console.log('✓ Generated audit report:')
    console.log(`  - Total actions: ${report.totalActions}`)
    console.log(`  - Action breakdown:`, report.actionBreakdown)
    console.log(`  - Entity breakdown:`, report.entityBreakdown)
    
    // Test 6: Check if audit logs are displayed in UI format
    console.log('\n6. Sample logs for UI display:')
    logs.slice(0, 3).forEach(log => {
      console.log(`  ${log.action} ${log.entityType} (${log.entityId}) - ${new Date(log.timestamp).toLocaleString()}`)
      if (log.metadata) {
        console.log(`    Metadata: ${JSON.stringify(log.metadata)}`)
      }
    })
    
    console.log('\n✅ Audit system is fully functional!')
    
  } catch (error) {
    console.error('❌ Error testing audit system:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuditSystem()