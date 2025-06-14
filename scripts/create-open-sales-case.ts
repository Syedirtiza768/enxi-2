#!/usr/bin/env npx tsx

import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

async function createOpenSalesCase(): Promise<void> {
  try {
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: 'SC-TEST-' + Date.now(),
        customerId: 'cmbq9uzpq0007v2i99d4dljtx', // Abu Dhabi Marine Services
        title: 'Test Sales Case for Workflow',
        description: 'Test case for complete workflow testing',
        status: 'OPEN',
        estimatedValue: 30000,
        createdBy: 'cmbq9uzoo0000v2i9nscot0vo', // admin user
        assignedTo: 'cmbq9uzoo0000v2i9nscot0vo'
      }
    });
    console.log('✅ Created sales case:', salesCase.caseNumber);
  } catch (error) {
    console.error('❌ Error creating sales case:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOpenSalesCase();