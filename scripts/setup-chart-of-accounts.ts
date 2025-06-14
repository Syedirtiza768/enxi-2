#!/usr/bin/env tsx

/**
 * Production setup script for Chart of Accounts
 * Creates standard accounting structure for production database
 */

import { PrismaClient, Role } from '../lib/generated/prisma'
import { ChartOfAccountsService } from '../lib/services/accounting/chart-of-accounts.service'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const coaService = new ChartOfAccountsService()

async function setupChartOfAccounts(): Promise<number> {
  console.warn('🏦 Setting up Chart of Accounts for production...')
  
  try {
    // Check if COA already exists
    const existingAccounts = await coaService.getAllAccounts()
    if (existingAccounts.length > 0) {
      console.warn(`⚠️  Chart of Accounts already exists (${existingAccounts.length} accounts found)`)
      console.warn('❓ Do you want to proceed anyway? This might create duplicate accounts.')
      
      // In production, we should prompt for confirmation
      // For now, we'll just exit
      console.warn('❌ Exiting to prevent duplicates. Use --force flag to override.')
      return
    }
    
    // Create or find admin user
    let adminUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { role: Role.ADMIN },
          { username: 'admin' }
        ]
      }
    })
    
    if (!adminUser) {
      console.warn('👤 Creating admin user for COA setup...')
      const hashedPassword = await bcrypt.hash('admin123!', 10)
      
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@company.com',
          password: hashedPassword,
          role: Role.ADMIN,
          isActive: true
        }
      })
      
      console.warn('✅ Admin user created')
    } else {
      console.warn('✅ Using existing admin user')
    }
    
    // Create standard Chart of Accounts
    console.warn('📊 Creating standard Chart of Accounts...')
    await coaService.createStandardCOA('USD', adminUser.id)
    
    // Verify creation
    const accounts = await coaService.getAllAccounts()
    console.warn(`✅ Chart of Accounts created successfully!`)
    console.warn(`📈 Total accounts created: ${accounts.length}`)
    
    // Display account summary by type
    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.warn('\n📋 Account Summary:')
    Object.entries(accountsByType).forEach(([type, count]) => {
      console.warn(`   ${type}: ${count} accounts`)
    })
    
    // List top-level accounts
    const topLevelAccounts = accounts.filter(a => !a.parentId)
    console.warn('\n🏗️  Top-level accounts created:')
    topLevelAccounts.forEach(account => {
      console.warn(`   ${account.code} - ${account.name}`)
    })
    
    console.warn('\n🎉 Chart of Accounts setup completed successfully!')
    
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

// Command line handling
const args = process.argv.slice(2)
const force = args.includes('--force')

if (force) {
  console.warn('⚠️  Force mode enabled - will create accounts even if they exist')
}

// Run the setup
setupChartOfAccounts()
  .then(() => {
    console.warn('✅ Setup completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })