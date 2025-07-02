#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client"
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'

const prisma = new PrismaClient()

async function setupAccounts(): Promise<number> {
  try {
    const accounts = await prisma.account.findMany({ select: { code: true, name: true } })
    console.warn(`Existing accounts: ${accounts.length}`)
    
    if (accounts.length === 0) {
      console.warn('Creating standard chart of accounts...')
      const service = new ChartOfAccountsService()
      const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
      if (adminUser) {
        await service.createStandardCOA('USD', adminUser.id)
        console.warn('✅ Chart of accounts created')
      } else {
        console.error('❌ Admin user not found')
      }
    } else {
      const inventoryAccount = accounts.find(a => a.code === '1130')
      console.warn(`Inventory account exists: ${inventoryAccount ? 'Yes' : 'No'}`)
      if (inventoryAccount) {
        console.warn(`  - ${inventoryAccount.name}`)
      }
    }
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

setupAccounts()