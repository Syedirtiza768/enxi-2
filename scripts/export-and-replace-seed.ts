#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function exportAndReplaceSeed() {
  console.log('🔄 Exporting current database to replace production seed...');
  
  try {
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

    // Export all data - using only models that exist
    console.log('📊 Exporting data from database...');
    
    const companySettings = await prisma.companySettings.findMany();
    const permissions = await prisma.permission.findMany();
    const rolePermissions = await prisma.rolePermission.findMany();
    const users = await prisma.user.findMany();
    const userProfiles = await prisma.userProfile.findMany();
    const accounts = await prisma.account.findMany();
    const taxCategories = await prisma.taxCategory.findMany();
    const taxRates = await prisma.taxRate.findMany();
    const locations = await prisma.location.findMany();
    const categories = await prisma.category.findMany();
    const unitsOfMeasure = await prisma.unitOfMeasure.findMany();
    const items = await prisma.item.findMany();
    const customers = await prisma.customer.findMany();
    const suppliers = await prisma.supplier.findMany();
    const salesCases = await prisma.salesCase.findMany();
    const quotations = await prisma.quotation.findMany();
    const quotationItems = await prisma.quotationItem.findMany();
    const salesOrders = await prisma.salesOrder.findMany();
    const salesOrderItems = await prisma.salesOrderItem.findMany();
    const invoices = await prisma.invoice.findMany();
    const invoiceItems = await prisma.invoiceItem.findMany();
    const payments = await prisma.payment.findMany();
    const purchaseOrders = await prisma.purchaseOrder.findMany();
    const purchaseOrderItems = await prisma.purchaseOrderItem.findMany();
    const shipments = await prisma.shipment.findMany();
    const shipmentItems = await prisma.shipmentItem.findMany();
    const stockMovements = await prisma.stockMovement.findMany();
    const customerPOs = await prisma.customerPO.findMany();

    // Generate the new seed file
    const seedContent = `#!/usr/bin/env tsx
// Auto-generated production seed from database export
// Generated on: ${new Date().toISOString()}

import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedCompanySettings() {
  console.log('🏢 Seeding company settings...');
  const settings = ${JSON.stringify(companySettings, null, 2)};
  
  for (const setting of settings) {
    await prisma.companySettings.create({
      data: {
        ...setting,
        createdAt: new Date(setting.createdAt),
        updatedAt: new Date(setting.updatedAt)
      }
    });
  }
  console.log('✅ Company settings seeded');
}

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');
  const permissions = ${JSON.stringify(permissions, null, 2)};
  
  for (const permission of permissions) {
    await prisma.permission.create({ data: permission });
  }
  console.log('✅ Permissions seeded');
}

async function seedRolePermissions() {
  console.log('👥 Assigning permissions to roles...');
  const rolePermissions = ${JSON.stringify(rolePermissions, null, 2)};
  
  for (const rp of rolePermissions) {
    await prisma.rolePermission.create({ data: rp });
  }
  console.log('✅ Role permissions assigned');
}

async function seedUsers() {
  console.log('👤 Seeding users...');
  const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'demo123', 10);
  const users = ${JSON.stringify(users.map(u => ({...u, password: undefined})), null, 2)};
  const profiles = ${JSON.stringify(userProfiles, null, 2)};
  
  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        password: hashedPassword,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      }
    });
  }
  
  for (const profile of profiles) {
    await prisma.userProfile.create({
      data: {
        ...profile,
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date()
      }
    });
  }
  console.log('✅ Users seeded');
}

async function seedChartOfAccounts() {
  console.log('📊 Seeding chart of accounts...');
  const accounts = ${JSON.stringify(accounts, null, 2)};
  
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
  console.log('✅ Chart of accounts seeded');
}

async function seedTaxConfiguration() {
  console.log('💰 Seeding tax configuration...');
  const categories = ${JSON.stringify(taxCategories, null, 2)};
  const rates = ${JSON.stringify(taxRates, null, 2)};
  
  for (const category of categories) {
    await prisma.taxCategory.create({
      data: {
        ...category,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt)
      }
    });
  }
  
  for (const rate of rates) {
    await prisma.taxRate.create({
      data: {
        ...rate,
        rate: rate.rate || 0,
        createdAt: new Date(rate.createdAt),
        updatedAt: new Date(rate.updatedAt)
      }
    });
  }
  console.log('✅ Tax configuration seeded');
}

async function seedLocations() {
  console.log('📍 Seeding locations...');
  const locations = ${JSON.stringify(locations, null, 2)};
  
  for (const location of locations) {
    await prisma.location.create({
      data: {
        ...location,
        createdAt: new Date(location.createdAt),
        updatedAt: new Date(location.updatedAt)
      }
    });
  }
  console.log('✅ Locations seeded');
}

async function seedInventoryMasterData() {
  console.log('📦 Seeding inventory master data...');
  
  // Categories
  const categories = ${JSON.stringify(categories, null, 2)};
  for (const category of categories) {
    await prisma.category.create({
      data: {
        ...category,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt)
      }
    });
  }
  
  // Units of measure
  const uoms = ${JSON.stringify(unitsOfMeasure, null, 2)};
  for (const uom of uoms) {
    await prisma.unitOfMeasure.create({
      data: {
        ...uom,
        createdAt: new Date(uom.createdAt),
        updatedAt: new Date(uom.updatedAt)
      }
    });
  }
  
  // Items
  const items = ${JSON.stringify(items, null, 2)};
  for (const item of items) {
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
  
  console.log('✅ Inventory master data seeded');
}

async function seedBusinessEntities() {
  console.log('🏢 Seeding business entities...');
  
  // Customers
  const customers = ${JSON.stringify(customers, null, 2)};
  for (const customer of customers) {
    await prisma.customer.create({
      data: {
        ...customer,
        creditLimit: customer.creditLimit || 0,
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt)
      }
    });
  }
  
  // Suppliers
  const suppliers = ${JSON.stringify(suppliers, null, 2)};
  for (const supplier of suppliers) {
    await prisma.supplier.create({
      data: {
        ...supplier,
        creditLimit: supplier.creditLimit || 0,
        createdAt: new Date(supplier.createdAt),
        updatedAt: new Date(supplier.updatedAt)
      }
    });
  }
  
  console.log('✅ Business entities seeded');
}

async function seedTransactionalData() {
  console.log('💼 Seeding transactional data...');
  
  // Sales cases
  const salesCases = ${JSON.stringify(salesCases, null, 2)};
  for (const sc of salesCases) {
    await prisma.salesCase.create({
      data: {
        ...sc,
        createdAt: new Date(sc.createdAt),
        updatedAt: new Date(sc.updatedAt)
      }
    });
  }
  
  // Customer POs
  const customerPOs = ${JSON.stringify(customerPOs, null, 2)};
  for (const po of customerPOs) {
    await prisma.customerPO.create({
      data: {
        ...po,
        poDate: po.poDate ? new Date(po.poDate) : null,
        createdAt: new Date(po.createdAt),
        updatedAt: new Date(po.updatedAt)
      }
    });
  }
  
  // Add other transactional data as needed...
  
  console.log('✅ Transactional data seeded');
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Delete in reverse order of dependencies
  await prisma.$transaction([
    prisma.shipmentItem.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.customerPO.deleteMany(),
    prisma.salesCase.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.item.deleteMany(),
    prisma.category.deleteMany(),
    prisma.unitOfMeasure.deleteMany(),
    prisma.location.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.account.deleteMany(),
    prisma.taxRate.deleteMany(),
    prisma.taxCategory.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.companySettings.deleteMany(),
  ]);
  
  console.log('✅ Database cleared');
}

async function main() {
  console.log('🌱 Starting production seed...');
  console.log('📅 Generated from database on: ${new Date().toISOString()}');
  
  try {
    // Clear existing data
    await clearDatabase();
    
    // Seed in order of dependencies
    await seedCompanySettings();
    await seedPermissions();
    await seedRolePermissions();
    await seedUsers();
    await seedChartOfAccounts();
    await seedTaxConfiguration();
    await seedLocations();
    await seedInventoryMasterData();
    await seedBusinessEntities();
    await seedTransactionalData();
    
    console.log('✅ Production seed completed successfully!');
    console.log('📊 Seeded data summary:');
    console.log(\`   - Company Settings: ${companySettings.length}\`);
    console.log(\`   - Users: ${users.length}\`);
    console.log(\`   - Permissions: ${permissions.length}\`);
    console.log(\`   - Accounts: ${accounts.length}\`);
    console.log(\`   - Tax Categories: ${taxCategories.length}\`);
    console.log(\`   - Tax Rates: ${taxRates.length}\`);
    console.log(\`   - Locations: ${locations.length}\`);
    console.log(\`   - Categories: ${categories.length}\`);
    console.log(\`   - Items: ${items.length}\`);
    console.log(\`   - Customers: ${customers.length}\`);
    console.log(\`   - Suppliers: ${suppliers.length}\`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default main;
`;

    // Write the new production seed file
    await fs.writeFile(currentSeedPath, seedContent, 'utf-8');
    
    console.log(`✅ Production seed file replaced successfully!`);
    console.log(`📊 Exported data summary:`);
    console.log(`   - Company Settings: ${companySettings.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Permissions: ${permissions.length}`);
    console.log(`   - Accounts: ${accounts.length}`);
    console.log(`   - Tax Categories: ${taxCategories.length}`);
    console.log(`   - Tax Rates: ${taxRates.length}`);
    console.log(`   - Locations: ${locations.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Items: ${items.length}`);
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Suppliers: ${suppliers.length}`);
    console.log(`   - Sales Cases: ${salesCases.length}`);
    console.log(`   - Quotations: ${quotations.length}`);
    console.log(`   - Sales Orders: ${salesOrders.length}`);
    console.log(`   - Invoices: ${invoices.length}`);
    console.log(`   - Payments: ${payments.length}`);
    
  } catch (error) {
    console.error('❌ Error exporting database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportAndReplaceSeed();