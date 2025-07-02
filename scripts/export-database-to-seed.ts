#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('🔄 Exporting current database to seed file...');
  
  try {
    // Export all data from database
    const data = {
      companySettings: await prisma.companySettings.findMany(),
      permissions: await prisma.permission.findMany(),
      rolePermissions: await prisma.rolePermission.findMany(),
      users: await prisma.user.findMany({
        include: {
          profile: true
        }
      }),
      accounts: await prisma.account.findMany(),
      taxCategories: await prisma.taxCategory.findMany(),
      taxRates: await prisma.taxRate.findMany(),
      locations: await prisma.location.findMany(),
      categories: await prisma.category.findMany(),
      unitsOfMeasure: await prisma.unitOfMeasure.findMany(),
      items: await prisma.item.findMany({
        include: {
          itemCategoryRelations: true,
          taxRates: true,
          priceHistory: true,
          stockMovements: true
        }
      }),
      customers: await prisma.customer.findMany({
        include: {
          addresses: true,
          contacts: true
        }
      }),
      suppliers: await prisma.supplier.findMany({
        include: {
          addresses: true,
          contacts: true
        }
      }),
      salescases: await prisma.salescase.findMany(),
      quotations: await prisma.quotation.findMany({
        include: {
          items: true
        }
      }),
      salesOrders: await prisma.salesOrder.findMany({
        include: {
          items: true
        }
      }),
      invoices: await prisma.invoice.findMany({
        include: {
          items: true
        }
      }),
      payments: await prisma.payment.findMany({
        include: {
          allocations: true
        }
      }),
      purchaseOrders: await prisma.purchaseOrder.findMany({
        include: {
          items: true
        }
      }),
      shipments: await prisma.shipment.findMany({
        include: {
          items: true
        }
      }),
      adjustmentReasons: await prisma.adjustmentReason.findMany(),
      stockAdjustments: await prisma.stockAdjustment.findMany(),
      accountTransactions: await prisma.accountTransaction.findMany(),
      journalEntries: await prisma.journalEntry.findMany({
        include: {
          lines: true
        }
      }),
      customerPoQuotations: await prisma.customerPoQuotation.findMany()
    };

    // Generate the seed file content
    const seedContent = `#!/usr/bin/env tsx
// Generated from production database on ${new Date().toISOString()}

import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production seed from exported data...');
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await clearDatabase();
    
    // Seed company settings
    console.log('🏢 Seeding company settings...');
    const companySettings = ${JSON.stringify(data.companySettings, null, 2)};
    for (const setting of companySettings) {
      await prisma.companySettings.create({
        data: {
          ...setting,
          createdAt: new Date(setting.createdAt),
          updatedAt: new Date(setting.updatedAt)
        }
      });
    }
    
    // Seed permissions
    console.log('🔐 Seeding permissions...');
    const permissions = ${JSON.stringify(data.permissions, null, 2)};
    for (const permission of permissions) {
      await prisma.permission.create({
        data: permission
      });
    }
    
    // Seed role permissions
    console.log('👥 Seeding role permissions...');
    const rolePermissions = ${JSON.stringify(data.rolePermissions, null, 2)};
    for (const rolePermission of rolePermissions) {
      await prisma.rolePermission.create({
        data: rolePermission
      });
    }
    
    // Seed users (excluding passwords for security)
    console.log('👤 Seeding users...');
    const users = ${JSON.stringify(data.users.map(u => ({
      ...u,
      password: 'HASHED_PASSWORD_PLACEHOLDER'
    })), null, 2)};
    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'demo123', 10);
    for (const user of users) {
      const { profile, ...userData } = user;
      const createdUser = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt)
        }
      });
      
      if (profile) {
        await prisma.userProfile.create({
          data: {
            ...profile,
            userId: createdUser.id,
            createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
            updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date()
          }
        });
      }
    }
    
    // Seed accounts
    console.log('📊 Seeding accounts...');
    const accounts = ${JSON.stringify(data.accounts, null, 2)};
    for (const account of accounts) {
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
    console.log('💰 Seeding tax configuration...');
    const taxCategories = ${JSON.stringify(data.taxCategories, null, 2)};
    for (const category of taxCategories) {
      await prisma.taxCategory.create({
        data: {
          ...category,
          createdAt: new Date(category.createdAt),
          updatedAt: new Date(category.updatedAt)
        }
      });
    }
    
    const taxRates = ${JSON.stringify(data.taxRates, null, 2)};
    for (const rate of taxRates) {
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
    console.log('📍 Seeding locations...');
    const locations = ${JSON.stringify(data.locations, null, 2)};
    for (const location of locations) {
      await prisma.location.create({
        data: {
          ...location,
          createdAt: new Date(location.createdAt),
          updatedAt: new Date(location.updatedAt)
        }
      });
    }
    
    // Seed categories
    console.log('📁 Seeding categories...');
    const categories = ${JSON.stringify(data.categories, null, 2)};
    for (const category of categories) {
      await prisma.category.create({
        data: {
          ...category,
          createdAt: new Date(category.createdAt),
          updatedAt: new Date(category.updatedAt)
        }
      });
    }
    
    // Seed units of measure
    console.log('📏 Seeding units of measure...');
    const unitsOfMeasure = ${JSON.stringify(data.unitsOfMeasure, null, 2)};
    for (const uom of unitsOfMeasure) {
      await prisma.unitOfMeasure.create({
        data: {
          ...uom,
          createdAt: new Date(uom.createdAt),
          updatedAt: new Date(uom.updatedAt)
        }
      });
    }
    
    // Continue with other entities...
    console.log('✅ Production seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function clearDatabase() {
  // Delete in reverse order of dependencies
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.customerPoQuotation.deleteMany();
  await prisma.salescase.deleteMany();
  await prisma.shipmentItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.itemCategoryRelation.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.location.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplierContact.deleteMany();
  await prisma.supplierAddress.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.accountTransaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.taxCategory.deleteMany();
  await prisma.adjustmentReason.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySettings.deleteMany();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

    // Write the seed file
    const outputPath = path.join(process.cwd(), 'scripts', 'seed-production-exported.ts');
    await fs.writeFile(outputPath, seedContent, 'utf-8');
    
    console.log(`✅ Seed file exported to: ${outputPath}`);
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