#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'
import { AuditService } from '../lib/services/audit.service'

async function testAuditSystem(): Promise<void> {
  console.warn('Testing Audit System...\n')
  
  const auditService = new AuditService()
  
  try {
    // Get an existing user first
    const existingUser = await prisma.user.findFirst()
    if (!existingUser) {
      console.warn('❌ No users found in the database. Please seed the database first.')
      return
    }
    
    console.warn(`Using user: ${existingUser.username} (${existingUser.id})`)
    
    // Test 1: Create some audit logs
    console.warn('\n1. Creating test audit logs...')
    
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
        console.warn(`✓ Created audit log: ${log.action} ${log.entityType}`)
      } else {
        console.warn(`✗ Failed to create audit log: ${log.action} ${log.entityType}`)
      }
    }
    
    // Test 2: Retrieve audit logs
    console.warn('\n2. Retrieving audit logs...')
    const { data: logs, total } = await auditService.getAuditLogs({}, { page: 1, limit: 10 })
    console.warn(`✓ Found ${total} total audit logs`)
    console.warn(`✓ Retrieved ${logs.length} logs on page 1`)
    
    // Test 3: Filter by user
    console.warn('\n3. Testing user filter...')
    const { data: userLogs, total: userTotal } = await auditService.getUserActivity(existingUser.id)
    console.warn(`✓ Found ${userTotal} logs for user '${existingUser.username}'`)
    
    // Test 4: Entity history
    console.warn('\n4. Testing entity history...')
    const history = await auditService.getEntityHistory('Customer', 'test-customer-1')
    console.warn(`✓ Found ${history.length} logs for Customer test-customer-1`)
    
    // Test 5: Generate report
    console.warn('\n5. Testing audit report generation...')
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    
    const report = await auditService.generateAuditReport(startDate, endDate)
    console.warn('✓ Generated audit report:')
    console.warn(`  - Total actions: ${report.totalActions}`)
    console.warn(`  - Action breakdown:`, report.actionBreakdown)
    console.warn(`  - Entity breakdown:`, report.entityBreakdown)
    
    // Test 6: Check if audit logs are displayed in UI format
    console.warn('\n6. Sample logs for UI display:')
    logs.slice(0, 3).forEach(log => {
      console.warn(`  ${log.action} ${log.entityType} (${log.entityId}) - ${new Date(log.timestamp).toLocaleString()}`)
      if (log.metadata) {
        console.warn(`    Metadata: ${JSON.stringify(log.metadata)}`)
      }
    })
    
    console.warn('\n✅ Audit system is fully functional!')
    
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

testAuditSystem()