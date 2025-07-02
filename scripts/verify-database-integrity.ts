#!/usr/bin/env tsx
// Database Integrity Verification Script
// Checks data consistency and relationships

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IntegrityCheckResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details?: string;
  count?: number;
}

class DatabaseIntegrityChecker {
  private results: IntegrityCheckResult[] = [];

  async runAllChecks() {
    console.log('🔍 Starting database integrity verification...\n');

    await this.checkDatabaseConnection();
    await this.checkRequiredTables();
    await this.checkUserIntegrity();
    await this.checkFinancialIntegrity();
    await this.checkInventoryIntegrity();
    await this.checkRelationshipIntegrity();
    await this.checkDataConsistency();
    
    this.printResults();
    
    const hasFailures = this.results.some(r => r.status === 'FAIL');
    return !hasFailures;
  }

  private async checkDatabaseConnection() {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      this.addResult('Database Connection', 'PASS');
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', `Connection failed: ${error}`);
    }
  }

  private async checkRequiredTables() {
    const requiredTables = [
      'User', 'CompanySettings', 'Customer', 'Supplier', 
      'Item', 'SalesOrder', 'Invoice', 'Payment'
    ];

    for (const table of requiredTables) {
      try {
        const count = await (prisma as any)[table.toLowerCase()].count();
        this.addResult(`Table: ${table}`, 'PASS', `${count} records`);
      } catch (error) {
        this.addResult(`Table: ${table}`, 'FAIL', 'Table not accessible');
      }
    }
  }

  private async checkUserIntegrity() {
    console.log('👤 Checking user integrity...');

    // Check for admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (adminUser) {
      this.addResult('Admin User Exists', 'PASS');
    } else {
      this.addResult('Admin User Exists', 'FAIL', 'No admin user found');
    }

    // Check for orphaned user profiles
    const orphanedProfiles = await prisma.userProfile.findMany({
      where: {
        user: null
      }
    });

    if (orphanedProfiles.length === 0) {
      this.addResult('User Profile Integrity', 'PASS');
    } else {
      this.addResult('User Profile Integrity', 'WARNING', 
        `Found ${orphanedProfiles.length} orphaned user profiles`);
    }

    // Check for users without profiles
    const usersWithoutProfiles = await prisma.user.findMany({
      where: {
        profile: null
      }
    });

    if (usersWithoutProfiles.length === 0) {
      this.addResult('Users Have Profiles', 'PASS');
    } else {
      this.addResult('Users Have Profiles', 'WARNING',
        `Found ${usersWithoutProfiles.length} users without profiles`);
    }
  }

  private async checkFinancialIntegrity() {
    console.log('💰 Checking financial integrity...');

    // Check account balances
    const accounts = await prisma.account.findMany();
    let balanceIssues = 0;

    for (const account of accounts) {
      // Calculate expected balance from transactions
      const transactions = await prisma.accountTransaction.aggregate({
        where: { accountId: account.id },
        _sum: {
          debit: true,
          credit: true
        }
      });

      const expectedBalance = (transactions._sum.debit || 0) - (transactions._sum.credit || 0);
      
      if (Math.abs(account.balance - expectedBalance) > 0.01) {
        balanceIssues++;
      }
    }

    if (balanceIssues === 0) {
      this.addResult('Account Balances', 'PASS');
    } else {
      this.addResult('Account Balances', 'FAIL',
        `${balanceIssues} accounts have balance discrepancies`);
    }

    // Check invoice payment allocations
    const invoices = await prisma.invoice.findMany({
      include: {
        payments: {
          include: {
            payment: true
          }
        }
      }
    });

    let paymentIssues = 0;
    for (const invoice of invoices) {
      const totalAllocated = invoice.payments.reduce((sum, alloc) => 
        sum + (alloc.payment.amount || 0), 0);
      
      if (invoice.status === 'PAID' && totalAllocated < invoice.totalAmount) {
        paymentIssues++;
      }
    }

    if (paymentIssues === 0) {
      this.addResult('Invoice Payments', 'PASS');
    } else {
      this.addResult('Invoice Payments', 'WARNING',
        `${paymentIssues} paid invoices have insufficient payment allocations`);
    }
  }

  private async checkInventoryIntegrity() {
    console.log('📦 Checking inventory integrity...');

    // Check for items without units of measure
    const itemsWithoutUOM = await prisma.item.count({
      where: { unitOfMeasureId: null }
    });

    if (itemsWithoutUOM === 0) {
      this.addResult('Items Have UOM', 'PASS');
    } else {
      this.addResult('Items Have UOM', 'WARNING',
        `${itemsWithoutUOM} items without unit of measure`);
    }

    // Check stock movements balance
    const items = await prisma.item.findMany();
    let stockIssues = 0;

    for (const item of items) {
      const movements = await prisma.stockMovement.aggregate({
        where: { itemId: item.id },
        _sum: { quantity: true }
      });

      const totalMovement = movements._sum.quantity || 0;
      
      // For now, just check if movements exist for items with stock
      if (item.stockQuantity > 0 && totalMovement === 0) {
        stockIssues++;
      }
    }

    if (stockIssues === 0) {
      this.addResult('Stock Movements', 'PASS');
    } else {
      this.addResult('Stock Movements', 'WARNING',
        `${stockIssues} items have stock but no movements recorded`);
    }
  }

  private async checkRelationshipIntegrity() {
    console.log('🔗 Checking relationship integrity...');

    // Check for orphaned sales orders
    const orphanedSalesOrders = await prisma.salesOrder.count({
      where: {
        OR: [
          { customerId: null },
          { customer: null }
        ]
      }
    });

    if (orphanedSalesOrders === 0) {
      this.addResult('Sales Order Relationships', 'PASS');
    } else {
      this.addResult('Sales Order Relationships', 'FAIL',
        `${orphanedSalesOrders} sales orders without customers`);
    }

    // Check for quotations without items
    const emptyQuotations = await prisma.quotation.findMany({
      include: {
        items: true
      },
      where: {
        items: {
          none: {}
        }
      }
    });

    if (emptyQuotations.length === 0) {
      this.addResult('Quotation Items', 'PASS');
    } else {
      this.addResult('Quotation Items', 'WARNING',
        `${emptyQuotations.length} quotations without items`);
    }
  }

  private async checkDataConsistency() {
    console.log('📊 Checking data consistency...');

    // Check company settings
    const companySettings = await prisma.companySettings.count();
    
    if (companySettings === 1) {
      this.addResult('Company Settings', 'PASS');
    } else if (companySettings === 0) {
      this.addResult('Company Settings', 'FAIL', 'No company settings found');
    } else {
      this.addResult('Company Settings', 'FAIL', 
        `Multiple company settings found (${companySettings})`);
    }

    // Check for negative stock quantities
    const negativeStock = await prisma.item.count({
      where: {
        stockQuantity: { lt: 0 }
      }
    });

    if (negativeStock === 0) {
      this.addResult('Stock Quantities', 'PASS');
    } else {
      this.addResult('Stock Quantities', 'WARNING',
        `${negativeStock} items with negative stock`);
    }

    // Check for future-dated transactions
    const futureTransactions = await prisma.accountTransaction.count({
      where: {
        date: { gt: new Date() }
      }
    });

    if (futureTransactions === 0) {
      this.addResult('Transaction Dates', 'PASS');
    } else {
      this.addResult('Transaction Dates', 'WARNING',
        `${futureTransactions} transactions with future dates`);
    }
  }

  private addResult(check: string, status: IntegrityCheckResult['status'], details?: string) {
    this.results.push({ check, status, details });
  }

  private printResults() {
    console.log('\n📋 Integrity Check Results:');
    console.log('═══════════════════════════════════════════\n');

    const passed = this.results.filter(r => r.status === 'PASS');
    const warnings = this.results.filter(r => r.status === 'WARNING');
    const failed = this.results.filter(r => r.status === 'FAIL');

    // Print failures first
    if (failed.length > 0) {
      console.log('❌ FAILED CHECKS:');
      failed.forEach(r => {
        console.log(`   ❌ ${r.check}`);
        if (r.details) console.log(`      ${r.details}`);
      });
      console.log('');
    }

    // Print warnings
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      warnings.forEach(r => {
        console.log(`   ⚠️  ${r.check}`);
        if (r.details) console.log(`      ${r.details}`);
      });
      console.log('');
    }

    // Print summary
    console.log('📊 SUMMARY:');
    console.log(`   ✅ Passed: ${passed.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   Total checks: ${this.results.length}`);
    
    console.log('\n═══════════════════════════════════════════');
    
    if (failed.length === 0) {
      console.log('✅ Database integrity check PASSED!');
    } else {
      console.log('❌ Database integrity check FAILED!');
      console.log('   Please address the failed checks above.');
    }
  }
}

// Run integrity check
async function main() {
  const checker = new DatabaseIntegrityChecker();
  
  try {
    const success = await checker.runAllChecks();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Integrity check failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseIntegrityChecker };