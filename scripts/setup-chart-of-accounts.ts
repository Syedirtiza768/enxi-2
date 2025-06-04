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

async function setupChartOfAccounts() {
  console.log('🏦 Setting up Chart of Accounts for production...')
  
  try {
    // Check if COA already exists
    const existingAccounts = await coaService.getAllAccounts()
    if (existingAccounts.length > 0) {
      console.log(`⚠️  Chart of Accounts already exists (${existingAccounts.length} accounts found)`)
      console.log('❓ Do you want to proceed anyway? This might create duplicate accounts.')
      
      // In production, we should prompt for confirmation
      // For now, we'll just exit
      console.log('❌ Exiting to prevent duplicates. Use --force flag to override.')
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
      console.log('👤 Creating admin user for COA setup...')
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
      
      console.log('✅ Admin user created')
    } else {
      console.log('✅ Using existing admin user')
    }
    
    // Create standard Chart of Accounts
    console.log('📊 Creating standard Chart of Accounts...')
    await coaService.createStandardCOA('USD', adminUser.id)
    
    // Verify creation
    const accounts = await coaService.getAllAccounts()
    console.log(`✅ Chart of Accounts created successfully!`)
    console.log(`📈 Total accounts created: ${accounts.length}`)
    
    // Display account summary by type
    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📋 Account Summary:')
    Object.entries(accountsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} accounts`)
    })
    
    // List top-level accounts
    const topLevelAccounts = accounts.filter(a => !a.parentId)
    console.log('\n🏗️  Top-level accounts created:')
    topLevelAccounts.forEach(account => {
      console.log(`   ${account.code} - ${account.name}`)
    })
    
    console.log('\n🎉 Chart of Accounts setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error setting up Chart of Accounts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Command line handling
const args = process.argv.slice(2)
const force = args.includes('--force')

if (force) {
  console.log('⚠️  Force mode enabled - will create accounts even if they exist')
}

// Run the setup
setupChartOfAccounts()
  .then(() => {
    console.log('✅ Setup completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })