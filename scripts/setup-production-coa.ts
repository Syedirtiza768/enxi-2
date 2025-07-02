#!/usr/bin/env tsx
/**
 * Script to set up the production Chart of Accounts
 * Run with: npm run seed:production-coa
 */

import { seedProductionChartOfAccounts } from '../prisma/seed-production-coa';
import { prisma } from '@/lib/db/prisma';

async function main() {
  console.log('🚀 Setting up Production Chart of Accounts...\n');

  try {
    // Get or create a company
    let company = await prisma.company.findFirst({
      where: { isActive: true }
    });

    if (!company) {
      console.log('📦 Creating default company...');
      company = await prisma.company.create({
        data: {
          name: 'Production Company',
          code: 'PROD',
          registrationNumber: 'PROD-001',
          taxNumber: 'TAX-001',
          email: 'info@production.com',
          phone: '+1234567890',
          website: 'https://production.com',
          address: '123 Business St',
          city: 'Business City',
          state: 'BC',
          country: 'US',
          postalCode: '12345',
          currency: 'USD',
          fiscalYearStart: new Date(new Date().getFullYear(), 0, 1),
          logoUrl: null,
          isActive: true,
          createdBy: 'system'
        }
      });
      console.log('✅ Company created\n');
    } else {
      console.log(`📦 Using existing company: ${company.name}\n`);
    }

    // Run the seed
    await seedProductionChartOfAccounts(company.id);

    console.log('\n🎉 Production Chart of Accounts setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the created accounts in your system');
    console.log('2. Adjust account codes/names as needed for your business');
    console.log('3. Configure item-specific GL accounts for your inventory');
    console.log('4. Set up additional tax rates with appropriate GL accounts');
    console.log('5. Train users on proper GL posting procedures');

  } catch (error) {
    console.error('\n❌ Error setting up Chart of Accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();