#!/usr/bin/env tsx
// Check production database status and suggest seeding order

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log('🔍 Checking production database status...\n');

  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check existing data - handle models that might not exist
    const counts: Record<string, number> = {};
    
    // Check each model separately to handle potential errors
    try { counts.users = await prisma.user.count(); } catch { counts.users = 0; }
    try { counts.accounts = await prisma.account.count(); } catch { counts.accounts = 0; }
    try { counts.companySettings = await prisma.companySettings.count(); } catch { counts.companySettings = 0; }
    try { counts.taxCategories = await prisma.taxCategory.count(); } catch { counts.taxCategories = 0; }
    try { counts.taxRates = await prisma.taxRate.count(); } catch { counts.taxRates = 0; }
    try { counts.locations = await prisma.location.count(); } catch { counts.locations = 0; }
    try { counts.permissions = await prisma.permission.count(); } catch { counts.permissions = 0; }
    try { counts.rolePermissions = await prisma.rolePermission.count(); } catch { counts.rolePermissions = 0; }
    try { counts.customers = await prisma.customer.count(); } catch { counts.customers = 0; }
    try { counts.items = await prisma.item.count(); } catch { counts.items = 0; }
    
    console.log('\n📊 Current database state:');
    console.log('-------------------------');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`${table}: ${count} records`);
    });
    
    // Determine what needs to be seeded
    console.log('\n📋 Seeding recommendations:');
    console.log('---------------------------');
    
    if (counts.accounts === 0) {
      console.log('1. Run: npm run seed:production-coa');
      console.log('   (Sets up Chart of Accounts - required for all other seeds)');
    }
    
    if (counts.companySettings === 0 || counts.permissions === 0 || counts.users === 0) {
      console.log('2. Run: npm run seed:production-core');
      console.log('   (Sets up company settings, permissions, and admin user)');
    }
    
    if (counts.accounts > 0 && counts.companySettings > 0) {
      console.log('3. Run: npm run seed:production (optional)');
      console.log('   (Adds demo data - customers, items, etc.)');
    }
    
    // Check for potential issues
    console.log('\n⚠️  Potential issues:');
    console.log('--------------------');
    
    if (counts.taxRates > 0 && counts.taxCategories === 0) {
      console.log('- Tax rates exist without tax categories (data integrity issue)');
    }
    
    if (counts.companySettings > 0) {
      const company = await prisma.companySettings.findFirst();
      if (company) {
        // Check if referenced accounts exist
        const accountChecks = [
          { field: 'defaultInventoryAccountId', value: company.defaultInventoryAccountId },
          { field: 'defaultCogsAccountId', value: company.defaultCogsAccountId },
          { field: 'defaultSalesAccountId', value: company.defaultSalesAccountId },
        ];
        
        for (const check of accountChecks) {
          if (check.value) {
            const account = await prisma.account.findUnique({
              where: { id: check.value }
            });
            if (!account) {
              console.log(`- Company settings reference non-existent account: ${check.field}`);
            }
          }
        }
      }
    }
    
    console.log('\n✨ Recommended order for fresh setup:');
    console.log('------------------------------------');
    console.log('1. npm run seed:production-coa    # Chart of Accounts first');
    console.log('2. npm run seed:production-core   # Core system data');
    console.log('3. npm run seed:production        # Demo data (optional)');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();