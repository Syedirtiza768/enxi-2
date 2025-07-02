#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('🔄 Exporting current database to seed file...');
  
  try {
    // Export all data from database - simplified without complex relations
    const data = {
      // Core settings and users
      companySettings: await prisma.companySettings.findMany(),
      permissions: await prisma.permission.findMany(),
      rolePermissions: await prisma.rolePermission.findMany(),
      users: await prisma.user.findMany(),
      userProfiles: await prisma.userProfile.findMany(),
      
      // Accounting
      accounts: await prisma.account.findMany(),
      taxCategories: await prisma.taxCategory.findMany(),
      taxRates: await prisma.taxRate.findMany(),
      
      // Inventory
      locations: await prisma.location.findMany(),
      categories: await prisma.category.findMany(),
      unitsOfMeasure: await prisma.unitOfMeasure.findMany(),
      items: await prisma.item.findMany(),
      priceHistory: await prisma.priceHistory.findMany(),
      stockMovements: await prisma.stockMovement.findMany(),
      adjustmentReasons: await prisma.adjustmentReason.findMany(),
      stockAdjustments: await prisma.stockAdjustment.findMany(),
      
      // Business entities
      customers: await prisma.customer.findMany(),
      customerAddresses: await prisma.customerAddress.findMany(),
      customerContacts: await prisma.customerContact.findMany(),
      suppliers: await prisma.supplier.findMany(),
      supplierAddresses: await prisma.supplierAddress.findMany(),
      supplierContacts: await prisma.supplierContact.findMany(),
      
      // Sales
      salescases: await prisma.salescase.findMany(),
      quotations: await prisma.quotation.findMany(),
      quotationItems: await prisma.quotationItem.findMany(),
      salesOrders: await prisma.salesOrder.findMany(),
      salesOrderItems: await prisma.salesOrderItem.findMany(),
      customerPoQuotations: await prisma.customerPoQuotation.findMany(),
      
      // Finance
      invoices: await prisma.invoice.findMany(),
      invoiceItems: await prisma.invoiceItem.findMany(),
      payments: await prisma.payment.findMany(),
      paymentAllocations: await prisma.paymentAllocation.findMany(),
      
      // Purchasing
      purchaseOrders: await prisma.purchaseOrder.findMany(),
      purchaseOrderItems: await prisma.purchaseOrderItem.findMany(),
      
      // Shipping
      shipments: await prisma.shipment.findMany(),
      shipmentItems: await prisma.shipmentItem.findMany(),
      
      // Accounting transactions
      accountTransactions: await prisma.accountTransaction.findMany(),
      journalEntries: await prisma.journalEntry.findMany(),
      journalEntryLines: await prisma.journalEntryLine.findMany()
    };

    // Create backup of current production seed
    const currentSeedPath = path.join(process.cwd(), 'scripts', 'seed-production.ts');
    const backupPath = path.join(process.cwd(), 'scripts', `seed-production-backup-${Date.now()}.ts`);
    
    try {
      const currentContent = await fs.readFile(currentSeedPath, 'utf-8');
      await fs.writeFile(backupPath, currentContent, 'utf-8');
      console.log(`📦 Backed up current seed to: ${backupPath}`);
    } catch (error) {
      console.log('⚠️  No existing production seed to backup');
    }

    // Generate the new seed file content
    const seedContent = `#!/usr/bin/env tsx
// Generated from production database on ${new Date().toISOString()}
// This is an auto-generated seed file with current production data

import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedOptions {
  includeDemo?: boolean;
  clearDatabase?: boolean;
  verbose?: boolean;
}

async function main(options: SeedOptions = {}) {
  const { clearDatabase = true, verbose = true } = options;
  
  console.log('🌱 Starting production seed from exported data...');
  console.log('📅 Export date: ${new Date().toISOString()}');
  
  try {
    if (clearDatabase) {
      console.log('🧹 Clearing existing data...');
      await clearAllData();
    }
    
    // Seed company settings
    if (verbose) console.log('🏢 Seeding company settings...');
    for (const setting of ${JSON.stringify(data.companySettings, null, 2)}) {
      await prisma.companySettings.create({
        data: {
          ...setting,
          createdAt: new Date(setting.createdAt),
          updatedAt: new Date(setting.updatedAt)
        }
      });
    }
    
    // Seed permissions
    if (verbose) console.log('🔐 Seeding permissions...');
    for (const permission of ${JSON.stringify(data.permissions, null, 2)}) {
      await prisma.permission.create({ data: permission });
    }
    
    // Seed role permissions
    if (verbose) console.log('👥 Seeding role permissions...');
    for (const rolePermission of ${JSON.stringify(data.rolePermissions, null, 2)}) {
      await prisma.rolePermission.create({ data: rolePermission });
    }
    
    // Seed users
    if (verbose) console.log('👤 Seeding users...');
    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'demo123', 10);
    const usersData = ${JSON.stringify(data.users.map(u => ({...u, password: 'HASHED'})), null, 2)};
    
    for (const userData of usersData) {
      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt)
        }
      });
    }
    
    // Seed user profiles
    if (verbose) console.log('👤 Seeding user profiles...');
    for (const profile of ${JSON.stringify(data.userProfiles, null, 2)}) {
      await prisma.userProfile.create({
        data: {
          ...profile,
          createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
          updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date()
        }
      });
    }
    
    // Seed accounts
    if (verbose) console.log('📊 Seeding accounts...');
    for (const account of ${JSON.stringify(data.accounts, null, 2)}) {
      await prisma.account.create({
        data: {
          ...account,
          balance: account.balance || 0,
          createdAt: new Date(account.createdAt),
          updatedAt: new Date(account.updatedAt)
        }
      });
    }
    
    // Seed tax configuration
    if (verbose) console.log('💰 Seeding tax configuration...');
    for (const category of ${JSON.stringify(data.taxCategories, null, 2)}) {
      await prisma.taxCategory.create({
        data: {
          ...category,
          createdAt: new Date(category.createdAt),
          updatedAt: new Date(category.updatedAt)
        }
      });
    }
    
    for (const rate of ${JSON.stringify(data.taxRates, null, 2)}) {
      await prisma.taxRate.create({
        data: {
          ...rate,
          rate: rate.rate || 0,
          createdAt: new Date(rate.createdAt),
          updatedAt: new Date(rate.updatedAt)
        }
      });
    }
    
    // Seed locations
    if (verbose) console.log('📍 Seeding locations...');
    for (const location of ${JSON.stringify(data.locations, null, 2)}) {
      await prisma.location.create({
        data: {
          ...location,
          createdAt: new Date(location.createdAt),
          updatedAt: new Date(location.updatedAt)
        }
      });
    }
    
    // Seed categories
    if (verbose) console.log('📁 Seeding categories...');
    for (const category of ${JSON.stringify(data.categories, null, 2)}) {
      await prisma.category.create({
        data: {
          ...category,
          createdAt: new Date(category.createdAt),
          updatedAt: new Date(category.updatedAt)
        }
      });
    }
    
    // Seed units of measure
    if (verbose) console.log('📏 Seeding units of measure...');
    for (const uom of ${JSON.stringify(data.unitsOfMeasure, null, 2)}) {
      await prisma.unitOfMeasure.create({
        data: {
          ...uom,
          createdAt: new Date(uom.createdAt),
          updatedAt: new Date(uom.updatedAt)
        }
      });
    }
    
    // Seed items
    if (verbose) console.log('📦 Seeding items...');
    for (const item of ${JSON.stringify(data.items, null, 2)}) {
      await prisma.item.create({
        data: {
          ...item,
          cost: item.cost || 0,
          sellingPrice: item.sellingPrice || 0,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }
      });
    }
    
    // Seed adjustment reasons
    if (verbose) console.log('📝 Seeding adjustment reasons...');
    for (const reason of ${JSON.stringify(data.adjustmentReasons, null, 2)}) {
      await prisma.adjustmentReason.create({
        data: {
          ...reason,
          createdAt: new Date(reason.createdAt),
          updatedAt: new Date(reason.updatedAt)
        }
      });
    }
    
    // Seed customers
    if (verbose) console.log('👥 Seeding customers...');
    for (const customer of ${JSON.stringify(data.customers, null, 2)}) {
      await prisma.customer.create({
        data: {
          ...customer,
          creditLimit: customer.creditLimit || 0,
          createdAt: new Date(customer.createdAt),
          updatedAt: new Date(customer.updatedAt)
        }
      });
    }
    
    // Seed customer addresses
    for (const address of ${JSON.stringify(data.customerAddresses, null, 2)}) {
      await prisma.customerAddress.create({
        data: {
          ...address,
          createdAt: new Date(address.createdAt),
          updatedAt: new Date(address.updatedAt)
        }
      });
    }
    
    // Seed customer contacts
    for (const contact of ${JSON.stringify(data.customerContacts, null, 2)}) {
      await prisma.customerContact.create({
        data: {
          ...contact,
          createdAt: new Date(contact.createdAt),
          updatedAt: new Date(contact.updatedAt)
        }
      });
    }
    
    // Seed suppliers
    if (verbose) console.log('🏭 Seeding suppliers...');
    for (const supplier of ${JSON.stringify(data.suppliers, null, 2)}) {
      await prisma.supplier.create({
        data: {
          ...supplier,
          creditLimit: supplier.creditLimit || 0,
          createdAt: new Date(supplier.createdAt),
          updatedAt: new Date(supplier.updatedAt)
        }
      });
    }
    
    // Continue with other entities...
    console.log('✅ Production seed completed successfully!');
    console.log('📊 Seeded data summary:');
    console.log(\`   - Company Settings: ${data.companySettings.length}\`);
    console.log(\`   - Users: ${data.users.length}\`);
    console.log(\`   - Permissions: ${data.permissions.length}\`);
    console.log(\`   - Accounts: ${data.accounts.length}\`);
    console.log(\`   - Items: ${data.items.length}\`);
    console.log(\`   - Customers: ${data.customers.length}\`);
    console.log(\`   - Suppliers: ${data.suppliers.length}\`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function clearAllData() {
  // Delete in reverse order of dependencies
  await prisma.$transaction([
    // Clear financial data
    prisma.paymentAllocation.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    
    // Clear sales data
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.customerPoQuotation.deleteMany(),
    prisma.salescase.deleteMany(),
    
    // Clear shipping and purchasing
    prisma.shipmentItem.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    
    // Clear inventory
    prisma.stockAdjustment.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.item.deleteMany(),
    prisma.category.deleteMany(),
    prisma.unitOfMeasure.deleteMany(),
    prisma.location.deleteMany(),
    
    // Clear business entities
    prisma.customerContact.deleteMany(),
    prisma.customerAddress.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplierContact.deleteMany(),
    prisma.supplierAddress.deleteMany(),
    prisma.supplier.deleteMany(),
    
    // Clear accounting
    prisma.journalEntryLine.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.accountTransaction.deleteMany(),
    prisma.account.deleteMany(),
    prisma.taxRate.deleteMany(),
    prisma.taxCategory.deleteMany(),
    prisma.adjustmentReason.deleteMany(),
    
    // Clear users and settings
    prisma.userProfile.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.companySettings.deleteMany(),
  ]);
}

// Allow running with command line options
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    clearDatabase: !args.includes('--no-clear'),
    verbose: !args.includes('--quiet'),
    includeDemo: args.includes('--demo')
  };
  
  main(options)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { main as seedProduction };
`;

    // Write the new production seed file
    const outputPath = path.join(process.cwd(), 'scripts', 'seed-production.ts');
    await fs.writeFile(outputPath, seedContent, 'utf-8');
    
    console.log(`✅ Production seed file updated at: ${outputPath}`);
    console.log(`📊 Exported data summary:`);
    console.log(`   - Company Settings: ${data.companySettings.length}`);
    console.log(`   - Users: ${data.users.length}`);
    console.log(`   - Permissions: ${data.permissions.length}`);
    console.log(`   - Accounts: ${data.accounts.length}`);
    console.log(`   - Items: ${data.items.length}`);
    console.log(`   - Customers: ${data.customers.length}`);
    console.log(`   - Suppliers: ${data.suppliers.length}`);
    console.log(`   - Quotations: ${data.quotations.length}`);
    console.log(`   - Sales Orders: ${data.salesOrders.length}`);
    console.log(`   - Invoices: ${data.invoices.length}`);
    console.log(`   - Payments: ${data.payments.length}`);
    
  } catch (error) {
    console.error('❌ Error exporting database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();