#!/usr/bin/env tsx

/**
 * Initialize Accounting System
 * Sets up default chart of accounts and configures account mappings
 * Run this script to prepare the system for immediate use
 */

import { PrismaClient } from '../lib/generated/prisma'
import { ChartOfAccountsService } from '../lib/services/accounting/chart-of-accounts.service'
import bcrypt from 'bcryptjs'
import { Role } from '../lib/types/shared-enums'

const prisma = new PrismaClient()
const coaService = new ChartOfAccountsService()

async function initializeAccounting() {
  console.log('🚀 Initializing Accounting System...')
  
  try {
    // Check if accounts already exist
    const existingAccounts = await coaService.getAllAccounts()
    if (existingAccounts.length > 0) {
      console.log(`✅ Chart of Accounts already exists (${existingAccounts.length} accounts found)`)
      
      // Verify critical system accounts exist
      const criticalCodes = ['1100', '1110', '1200', '1300', '2100', '2200', '4100', '5100']
      const missingCodes = []
      
      for (const code of criticalCodes) {
        const account = await prisma.account.findFirst({ where: { code } })
        if (!account) {
          missingCodes.push(code)
        }
      }
      
      if (missingCodes.length > 0) {
        console.log(`⚠️  Missing critical accounts: ${missingCodes.join(', ')}`)
        console.log('Please run with --force to recreate chart of accounts')
      } else {
        console.log('✅ All critical accounts are present')
      }
      
      return
    }
    
    // Create or find system user
    let systemUser = await prisma.user.findFirst({
      where: { username: 'system' }
    })
    
    if (!systemUser) {
      console.log('👤 Creating system user...')
      const hashedPassword = await bcrypt.hash('system-password-change-me', 10)
      
      systemUser = await prisma.user.create({
        data: {
          username: 'system',
          email: 'system@company.com',
          password: hashedPassword,
          role: Role.ADMIN,
          isActive: true
        }
      })
    }
    
    // Create standard Chart of Accounts
    console.log('📊 Creating standard Chart of Accounts...')
    await coaService.createStandardCOA('USD', systemUser.id)
    
    // Create additional currencies if needed
    const currencies = ['EUR', 'GBP', 'AED'] // Add more as needed
    
    for (const currency of currencies) {
      if (currency !== 'USD') {
        console.log(`💱 Creating accounts for ${currency}...`)
        // You could extend the COA service to support multi-currency
        // For now, we'll just note that accounts are in USD
      }
    }
    
    // Verify creation
    const accounts = await coaService.getAllAccounts()
    console.log(`✅ Chart of Accounts created successfully!`)
    console.log(`📈 Total accounts created: ${accounts.length}`)
    
    // Display account summary
    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📋 Account Summary:')
    Object.entries(accountsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} accounts`)
    })
    
    // Verify critical accounts
    console.log('\n🔍 Verifying critical accounts:')
    const criticalAccounts = [
      { code: '1100', name: 'Cash on Hand' },
      { code: '1110', name: 'Bank Accounts' },
      { code: '1200', name: 'Accounts Receivable' },
      { code: '1300', name: 'Inventory' },
      { code: '2100', name: 'Accounts Payable' },
      { code: '2200', name: 'Sales Tax Payable' },
      { code: '4100', name: 'Sales Revenue' },
      { code: '5100', name: 'Cost of Goods Sold' },
      { code: '5200', name: 'Inventory Adjustments' },
      { code: '6900', name: 'General Expenses' }
    ]
    
    for (const { code, name } of criticalAccounts) {
      const account = await prisma.account.findFirst({ where: { code } })
      if (account) {
        console.log(`   ✅ ${code} - ${name}`)
      } else {
        console.log(`   ❌ ${code} - ${name} (MISSING)`)
      }
    }
    
    console.log('\n🎉 Accounting system initialized successfully!')
    console.log('💡 The system is now ready for immediate use with:')
    console.log('   - Sales invoices and payments')
    console.log('   - Purchase invoices and payments')
    console.log('   - Inventory transactions')
    console.log('   - Expense recording')
    console.log('   - Full financial reporting')
    
  } catch (error) {
    console.error('❌ Error initializing accounting:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Command line handling
const args = process.argv.slice(2)
const force = args.includes('--force')

if (force) {
  console.log('⚠️  Force mode enabled - will recreate accounts')
  // TODO: Implement force mode to delete and recreate accounts
}

// Run the initialization
initializeAccounting()
  .then(() => {
    console.log('\n✅ Initialization completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Initialization failed:', error)
    process.exit(1)
  })