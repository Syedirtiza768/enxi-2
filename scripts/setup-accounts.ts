#!/usr/bin/env tsx

import { PrismaClient } from '@/lib/generated/prisma'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'

const prisma = new PrismaClient()

async function setupAccounts() {
  try {
    const accounts = await prisma.account.findMany({ select: { code: true, name: true } })
    console.log(`Existing accounts: ${accounts.length}`)
    
    if (accounts.length === 0) {
      console.log('Creating standard chart of accounts...')
      const service = new ChartOfAccountsService()
      const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
      if (adminUser) {
        await service.createStandardCOA('USD', adminUser.id)
        console.log('✅ Chart of accounts created')
      } else {
        console.error('❌ Admin user not found')
      }
    } else {
      const inventoryAccount = accounts.find(a => a.code === '1130')
      console.log(`Inventory account exists: ${inventoryAccount ? 'Yes' : 'No'}`)
      if (inventoryAccount) {
        console.log(`  - ${inventoryAccount.name}`)
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAccounts()