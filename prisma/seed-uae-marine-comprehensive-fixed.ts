import { PrismaClient } from '../lib/generated/prisma';
import { hash } from 'bcryptjs';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Configuration
const CONFIG = {
  BATCH_SIZE: 100,
  DATE_RANGE_MONTHS: 24,
  PROGRESS_UPDATE_INTERVAL: 10,
  TRANSACTION_TIMEOUT: 300000, // 5 minutes
  MEMORY_CLEANUP_INTERVAL: 500,
};

// Progress tracking
class ProgressTracker {
  private totalItems: number;
  private processedItems: number;
  private startTime: number;
  private currentTask: string;

  constructor(totalItems: number, taskName: string) {
    this.totalItems = totalItems;
    this.processedItems = 0;
    this.startTime = Date.now();
    this.currentTask = taskName;
    console.log(`\n🚀 Starting: ${taskName} (${totalItems} items)`);
  }

  update(count: number = 1) {
    this.processedItems += count;
    
    if (this.processedItems % CONFIG.PROGRESS_UPDATE_INTERVAL === 0 || 
        this.processedItems === this.totalItems) {
      const percentage = Math.round((this.processedItems / this.totalItems) * 100);
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      const rate = Math.round(this.processedItems / elapsed);
      
      console.log(
        `📊 ${this.currentTask}: ${percentage}% complete ` +
        `(${this.processedItems}/${this.totalItems}) - ` +
        `${elapsed}s elapsed - ${rate} items/sec`
      );
    }
  }

  complete() {
    const totalTime = Math.round((Date.now() - this.startTime) / 1000);
    console.log(`✅ Completed: ${this.currentTask} in ${totalTime}s`);
  }
}

// Batch processing utility
async function processBatch<T>(
  items: T[],
  processor: (batch: T[]) => Promise<void>,
  batchSize: number = CONFIG.BATCH_SIZE,
  taskName: string = 'Processing'
): Promise<void> {
  const progress = new ProgressTracker(items.length, taskName);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    try {
      await processor(batch);
      progress.update(batch.length);
      
      // Memory cleanup
      if (i % CONFIG.MEMORY_CLEANUP_INTERVAL === 0 && global.gc) {
        global.gc();
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${i}-${i + batch.length}:`, error);
      throw error;
    }
  }
  
  progress.complete();
}

// Date generation utilities
function getRandomDate(monthsBack: number): Date {
  const now = new Date();
  const minDate = new Date(now);
  minDate.setMonth(now.getMonth() - monthsBack);
  
  const diff = now.getTime() - minDate.getTime();
  const randomTime = Math.random() * diff;
  
  return new Date(minDate.getTime() + randomTime);
}

function generateDateRange(startMonthsBack: number, endMonthsBack: number = 0): Date {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(now.getMonth() - startMonthsBack);
  
  const endDate = new Date(now);
  endDate.setMonth(now.getMonth() - endMonthsBack);
  
  const diff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * diff;
  
  return new Date(startDate.getTime() + randomTime);
}

// Add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Marine industry specific data generators
const MARINE_CUSTOMERS = [
  'Abu Dhabi Marine Services LLC',
  'Dubai Drydocks World',
  'Sharjah Marine Transport',
  'RAK Maritime Holdings',
  'Fujairah Port Authority',
  'Emirates Shipping Line',
  'Gulf Navigation Company',
  'Arabian Marine Services',
  'Al Marwan Shipping',
  'National Marine Dredging Co',
  'UAE Navy Operations',
  'DP World Marine Services',
  'ADNOC Marine Operations',
  'Etihad Shipping Services',
  'Al Seer Marine LLC',
];

const MARINE_ENGINE_BRANDS = [
  'MAN Energy Solutions',
  'Wärtsilä',
  'Caterpillar Marine',
  'Rolls-Royce Marine',
  'Cummins Marine',
  'Volvo Penta',
  'Yanmar Marine',
  'MTU Friedrichshafen',
  'Mitsubishi Heavy Industries',
  'Hyundai Heavy Industries',
];

const SPARE_PARTS = [
  // Engine Components
  { name: 'Cylinder Head', category: 'Engine Core Components', unit: 'PCS' },
  { name: 'Piston Assembly', category: 'Engine Core Components', unit: 'SET' },
  { name: 'Connecting Rod', category: 'Engine Core Components', unit: 'PCS' },
  { name: 'Crankshaft Bearing', category: 'Engine Core Components', unit: 'SET' },
  { name: 'Camshaft', category: 'Engine Core Components', unit: 'PCS' },
  { name: 'Valve Guide', category: 'Engine Core Components', unit: 'PCS' },
  { name: 'Valve Seat', category: 'Engine Core Components', unit: 'PCS' },
  
  // Fuel System
  { name: 'Fuel Injection Pump', category: 'Fuel System', unit: 'PCS' },
  { name: 'Fuel Injector', category: 'Fuel System', unit: 'PCS' },
  { name: 'Fuel Filter', category: 'Fuel System', unit: 'PCS' },
  { name: 'High Pressure Fuel Line', category: 'Fuel System', unit: 'M' },
  { name: 'Fuel Rail', category: 'Fuel System', unit: 'PCS' },
  
  // Cooling System
  { name: 'Heat Exchanger', category: 'Cooling System', unit: 'PCS' },
  { name: 'Sea Water Pump', category: 'Cooling System', unit: 'PCS' },
  { name: 'Fresh Water Pump', category: 'Cooling System', unit: 'PCS' },
  { name: 'Thermostat', category: 'Cooling System', unit: 'PCS' },
  { name: 'Expansion Tank', category: 'Cooling System', unit: 'PCS' },
  
  // Turbocharger
  { name: 'Turbocharger Complete', category: 'Air System', unit: 'PCS' },
  { name: 'Turbo Bearing Kit', category: 'Air System', unit: 'SET' },
  { name: 'Air Filter', category: 'Air System', unit: 'PCS' },
  { name: 'Charge Air Cooler', category: 'Air System', unit: 'PCS' },
  { name: 'Air Intake Manifold', category: 'Air System', unit: 'PCS' },
  
  // Lubrication
  { name: 'Oil Pump', category: 'Lubrication System', unit: 'PCS' },
  { name: 'Oil Filter', category: 'Lubrication System', unit: 'PCS' },
  { name: 'Oil Cooler', category: 'Lubrication System', unit: 'PCS' },
  { name: 'Marine Engine Oil 40', category: 'Lubrication System', unit: 'L' },
  { name: 'Oil Pressure Sensor', category: 'Lubrication System', unit: 'PCS' },
];

const SERVICE_TYPES = [
  'Annual Maintenance',
  'Emergency Repair',
  'Major Overhaul',
  'Minor Overhaul',
  'Preventive Maintenance',
  'Troubleshooting',
  'Performance Optimization',
  'Spare Parts Supply',
  'Technical Consultation',
  'Vibration Analysis',
  'Oil Analysis',
  'Endoscopic Inspection',
];

const LEAD_SOURCES = [
  { source: 'WEBSITE', weight: 25 },
  { source: 'TRADE_SHOW', weight: 20 },
  { source: 'REFERRAL', weight: 30 },
  { source: 'PHONE_CALL', weight: 10 },
  { source: 'EMAIL_CAMPAIGN', weight: 15 },
];

// Base data seeders
async function seedBaseData() {
  console.log('\n🔧 Seeding Base Data...');
  
  // Company settings
  const existingSettings = await prisma.companySettings.findFirst();
  const companySettingsId = existingSettings?.id || 'default-company-settings';
  
  await prisma.companySettings.upsert({
    where: { id: companySettingsId },
    update: {},
    create: {
      id: companySettingsId,
      companyName: 'Marine Power Solutions UAE',
      address: 'Jebel Ali Free Zone, Dubai, UAE',
      phone: '+971 4 881 5000',
      email: 'info@marinepoweruae.com',
      website: 'www.marinepoweruae.com',
      defaultCurrency: 'AED',
    },
  });

  // Users
  const hashedPassword = await hash('Marine@2024', 10);
  const users = [
    {
      username: 'admin',
      email: 'admin@marinepoweruae.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN' as const,
      isActive: true,
    },
    {
      username: 'ahmed.rashid',
      email: 'sales.manager@marinepoweruae.com',
      password: hashedPassword,
      role: 'MANAGER' as const,
      isActive: true,
    },
    {
      username: 'robert.thompson',
      email: 'chief.engineer@marinepoweruae.com',
      password: hashedPassword,
      role: 'WAREHOUSE' as const,
      isActive: true,
    },
    {
      username: 'maria.santos',
      email: 'inventory@marinepoweruae.com',
      password: hashedPassword,
      role: 'WAREHOUSE' as const,
      isActive: true,
    },
    {
      username: 'fatima.hassan',
      email: 'accounts@marinepoweruae.com',
      password: hashedPassword,
      role: 'ACCOUNTANT' as const,
      isActive: true,
    },
    {
      username: 'john.mitchell',
      email: 'sales1@marinepoweruae.com',
      password: hashedPassword,
      role: 'SALES_REP' as const,
      isActive: true,
    },
    {
      username: 'sara.abdullah',
      email: 'sales2@marinepoweruae.com',
      password: hashedPassword,
      role: 'SALES_REP' as const,
      isActive: true,
    },
  ];

  await processBatch(users, async (batch) => {
    for (const user of batch) {
      await prisma.user.create({
        data: user,
      });
    }
  }, 5, 'Creating Users');
}

// Master data seeders
async function seedMasterData() {
  console.log('\n📦 Seeding Master Data...');
  
  // Get the first user to be the creator
  const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const createdBy = adminUser?.id || 'system';
  
  // Customers
  const customerData = MARINE_CUSTOMERS.map((name, index) => ({
    name,
    customerNumber: `CUST-${String(index + 1).padStart(4, '0')}`,
    email: `contact@${name.toLowerCase().replace(/\s+/g, '')}.ae`,
    phone: `+971 ${4 + (index % 3)} ${5000000 + Math.floor(Math.random() * 1000000)}`,
    address: `${['Dubai', 'Abu Dhabi', 'Sharjah', 'Fujairah'][index % 4]}, UAE`,
    taxId: `TRN${100000000000 + index * 1000}`,
    creditLimit: Math.floor(Math.random() * 5 + 1) * 100000,
    paymentTerms: [15, 30, 45, 60][index % 4],
    industry: 'Marine & Shipping',
    currency: 'AED',
    createdBy,
  }));

  await processBatch(customerData, async (batch) => {
    await prisma.customer.createMany({
      data: batch,
    });
  }, 50, 'Creating Customers');

  // Suppliers
  const supplierData = MARINE_ENGINE_BRANDS.map((name, index) => ({
    name: `${name} Middle East`,
    supplierNumber: `SUPP-${String(index + 1).padStart(4, '0')}`,
    email: `procurement@${name.toLowerCase().replace(/\s+/g, '')}-me.com`,
    phone: `+971 ${4 + (index % 3)} ${6000000 + Math.floor(Math.random() * 1000000)}`,
    address: `${['JAFZA', 'DAFZA', 'Hamriyah FZ', 'SAIF Zone'][index % 4]}, UAE`,
    taxId: `TRN${200000000000 + index * 1000}`,
    paymentTerms: [30, 45, 60, 90][index % 4],
    currency: 'AED',
    createdBy,
  }));

  await processBatch(supplierData, async (batch) => {
    await prisma.supplier.createMany({
      data: batch,
    });
  }, 50, 'Creating Suppliers');

  // Inventory categories
  const categories = [
    { name: 'Engine Core Components', code: 'ENG-CORE', parentId: null, createdBy },
    { name: 'Fuel System', code: 'FUEL-SYS', parentId: null, createdBy },
    { name: 'Cooling System', code: 'COOL-SYS', parentId: null, createdBy },
    { name: 'Air System', code: 'AIR-SYS', parentId: null, createdBy },
    { name: 'Lubrication System', code: 'LUB-SYS', parentId: null, createdBy },
    { name: 'Electrical Components', code: 'ELEC', parentId: null, createdBy },
    { name: 'Control Systems', code: 'CTRL-SYS', parentId: null, createdBy },
    { name: 'Consumables', code: 'CONSUMABLES', parentId: null, createdBy },
  ];

  await processBatch(categories, async (batch) => {
    for (const category of batch) {
      await prisma.category.create({
        data: category,
      });
    }
  }, 10, 'Creating Categories');

  // Units of measure
  const units = [
    { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true, createdBy },
    { code: 'SET', name: 'Set', symbol: 'set', isBaseUnit: true, createdBy },
    { code: 'L', name: 'Liter', symbol: 'L', isBaseUnit: true, createdBy },
    { code: 'KG', name: 'Kilogram', symbol: 'kg', isBaseUnit: true, createdBy },
    { code: 'M', name: 'Meter', symbol: 'm', isBaseUnit: true, createdBy },
    { code: 'HR', name: 'Hour', symbol: 'hr', isBaseUnit: true, createdBy },
  ];

  await processBatch(units, async (batch) => {
    await prisma.unitOfMeasure.createMany({
      data: batch,
    });
  }, 10, 'Creating Units of Measure');
}

// Inventory data seeder
async function seedInventoryData() {
  console.log('\n🔩 Seeding Inventory Data...');
  
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map((c: any) => [c.name, c.id]));
  const suppliers = await prisma.supplier.findMany();
  const units = await prisma.unitOfMeasure.findMany();
  const unitMap = new Map(units.map((u: any) => [u.code, u.id]));
  const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const createdBy = adminUser?.id || 'system';
  
  const inventoryItems = [];
  let itemCode = 1000;
  
  // Generate spare parts for each engine brand
  for (const brand of MARINE_ENGINE_BRANDS) {
    for (const part of SPARE_PARTS) {
      const supplier = suppliers.find((s: any) => s.name.includes(brand));
      if (!supplier) continue;
      
      const categoryId = categoryMap.get(part.category) || categories[0].id;
      const unitOfMeasureId = unitMap.get(part.unit) || units[0].id;
      
      inventoryItems.push({
        code: `MP-${itemCode++}`,
        name: `${part.name} - ${brand}`,
        description: `OEM ${part.name} for ${brand} marine engines`,
        categoryId,
        unitOfMeasureId,
        minStockLevel: Math.floor(Math.random() * 10) + 5,
        reorderPoint: Math.floor(Math.random() * 20) + 10,
        maxStockLevel: Math.floor(Math.random() * 100) + 50,
        standardCost: Math.floor(Math.random() * 5000) + 500,
        listPrice: Math.floor(Math.random() * 7500) + 1000,
        createdBy,
      });
    }
  }
  
  await processBatch(inventoryItems, async (batch) => {
    await prisma.item.createMany({
      data: batch,
    });
  }, CONFIG.BATCH_SIZE, 'Creating Inventory Items');
  
  // Create locations
  const locations = [
    { locationCode: 'DUBAI-WH', name: 'Main Warehouse - Dubai', type: 'WAREHOUSE' as const, createdBy },
    { locationCode: 'AUH-BR', name: 'Abu Dhabi Branch', type: 'WAREHOUSE' as const, createdBy },
    { locationCode: 'SHJ-SC', name: 'Sharjah Service Center', type: 'WAREHOUSE' as const, createdBy },
  ];
  
  await processBatch(locations, async (batch) => {
    await prisma.location.createMany({
      data: batch,
    });
  }, 10, 'Creating Locations');
  
  // Create initial stock lots
  const items = await prisma.item.findMany();
  const locationList = await prisma.location.findMany();
  const stockLots = [];
  
  for (const item of items) {
    const location = locationList[Math.floor(Math.random() * locationList.length)];
    const quantity = Math.floor(Math.random() * 100) + 20;
    
    stockLots.push({
      lotNumber: `LOT-${Date.now()}-${item.id}`,
      itemId: item.id,
      receivedDate: new Date(Date.now() - CONFIG.DATE_RANGE_MONTHS * 30 * 24 * 60 * 60 * 1000),
      expiryDate: item.name.includes('Oil') ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      receivedQty: quantity,
      availableQty: quantity,
      unitCost: item.standardCost,
      totalCost: item.standardCost * quantity,
      createdBy,
    });
  }
  
  await processBatch(stockLots, async (batch) => {
    for (const lot of batch) {
      const created = await prisma.stockLot.create({
        data: lot,
      });
      
      // Create location stock lot entry
      const location = locationList[0]; // Use main warehouse for initial stock
      await prisma.locationStockLot.create({
        data: {
          locationId: location.id,
          stockLotId: created.id,
          quantity: lot.availableQty,
          availableQty: lot.availableQty,
          createdBy,
        },
      });
    }
  }, 50, 'Creating Stock Lots');
}

// Generate leads with realistic distribution
async function generateLeads() {
  console.log('\n📞 Generating Leads...');
  
  const customers = await prisma.customer.findMany();
  const users = await prisma.user.findMany();
  const salesUsers = users.filter((u: any) => ['MANAGER', 'SALES_REP', 'SUPER_ADMIN'].includes(u.role));
  
  const leadData = [];
  const totalLeads = 550;
  
  // Seasonal distribution (more leads in pre-summer months)
  const monthlyDistribution = [
    0.05, 0.06, 0.08, 0.12, 0.15, 0.10, // Jan-Jun (increasing to summer)
    0.08, 0.06, 0.05, 0.08, 0.09, 0.08  // Jul-Dec
  ];
  
  for (let month = 0; month < 24; month++) {
    const monthIndex = month % 12;
    const leadsThisMonth = Math.floor(totalLeads * monthlyDistribution[monthIndex] / 2);
    
    for (let i = 0; i < leadsThisMonth; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const assignedTo = salesUsers[Math.floor(Math.random() * salesUsers.length)];
      
      // Weighted random source selection
      const sourceRandom = Math.random() * 100;
      let cumulativeWeight = 0;
      let selectedSource = 'WEBSITE';
      
      for (const { source, weight } of LEAD_SOURCES) {
        cumulativeWeight += weight;
        if (sourceRandom < cumulativeWeight) {
          selectedSource = source;
          break;
        }
      }
      
      // Lead status based on age
      const leadAge = 24 - month;
      let status = 'NEW';
      let dealValue = Math.floor(Math.random() * 500000) + 50000;
      
      if (leadAge > 18) {
        status = ['CONVERTED', 'LOST'][Math.random() < 0.3 ? 0 : 1];
      } else if (leadAge > 12) {
        status = ['QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST'][Math.floor(Math.random() * 4)];
      } else if (leadAge > 6) {
        status = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT'][Math.floor(Math.random() * 4)];
      }
      
      const contactNames = [
        { first: 'Mohammed', last: 'Al-Rashid' },
        { first: 'Ahmed', last: 'Hassan' },
        { first: 'Khalid', last: 'Ibrahim' },
        { first: 'Omar', last: 'Abdullah' },
        { first: 'Rashid', last: 'Al-Maktoum' },
        { first: 'Sultan', last: 'Al-Nahyan' },
      ];
      
      const contact = contactNames[Math.floor(Math.random() * contactNames.length)];
      const engineBrand = MARINE_ENGINE_BRANDS[Math.floor(Math.random() * MARINE_ENGINE_BRANDS.length)];
      const service = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
      
      const createdDate = generateDateRange(24 - month, 24 - month - 1);
      
      leadData.push({
        company: customer.name,
        contactName: `${contact.first} ${contact.last}`,
        email: `${contact.first.toLowerCase()}.${contact.last.toLowerCase()}@${customer.name.toLowerCase().replace(/\s+/g, '')}.ae`,
        phone: customer.phone,
        source: selectedSource as any,
        status: status as any,
        dealValue,
        notes: `${service} requirement for ${engineBrand} engine. ${Math.random() < 0.3 ? 'Urgent request.' : ''} Fleet size: ${Math.floor(Math.random() * 10) + 1} vessels.`,
        createdBy: assignedTo.id,
        createdAt: createdDate,
        updatedAt: status !== 'NEW' ? addDays(createdDate, Math.floor(Math.random() * 14) + 7) : createdDate,
      });
    }
  }
  
  await processBatch(leadData, async (batch) => {
    await prisma.lead.createMany({
      data: batch,
    });
  }, CONFIG.BATCH_SIZE, 'Creating Leads');
}

// Generate sales cases
async function generateSalesCases() {
  console.log('\n📋 Generating Sales Cases...');
  
  const qualifiedLeads = await prisma.lead.findMany({
    where: { 
      status: { in: ['QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED'] }
    },
    orderBy: { createdAt: 'asc' },
  });
  
  const customers = await prisma.customer.findMany();
  const customerMap = new Map(customers.map((c: any) => [c.name, c]));
  
  const salesCaseData = [];
  let caseCounter = 1;
  
  // Convert 60% of qualified leads to sales cases
  const leadsToConvert = qualifiedLeads.filter(() => Math.random() < 0.6);
  
  for (const lead of leadsToConvert) {
    const customer = customerMap.get(lead.company) as any;
    if (!customer) continue;
    
    const caseCreatedDate = addDays(lead.createdAt, Math.floor(Math.random() * 7) + 1);
    const yearPrefix = new Date(caseCreatedDate).getFullYear();
    
    // Case status based on lead status and age
    let caseStatus = 'OPEN';
    const caseAge = (Date.now() - caseCreatedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (lead.status === 'CONVERTED') {
      if (caseAge > 60) {
        caseStatus = 'CLOSED_WON';
      } else if (caseAge > 30) {
        caseStatus = 'APPROVED';
      } else {
        caseStatus = 'IN_PROGRESS';
      }
    } else if (caseAge > 90) {
      caseStatus = Math.random() < 0.3 ? 'CLOSED_WON' : 'CLOSED_LOST';
    } else if (caseAge > 45) {
      caseStatus = ['IN_PROGRESS', 'PENDING_APPROVAL'][Math.floor(Math.random() * 2)];
    }
    
    const priority = lead.notes?.includes('Urgent') ? 'URGENT' : 
                    lead.dealValue > 200000 ? 'HIGH' :
                    lead.dealValue > 100000 ? 'MEDIUM' : 'LOW';
    
    salesCaseData.push({
      caseNumber: `SC-${yearPrefix}-${String(caseCounter++).padStart(5, '0')}`,
      customerId: customer.id,
      leadId: lead.id,
      title: `${lead.notes?.split('.')[0]} - ${customer.name}`,
      description: lead.notes,
      status: caseStatus as any,
      priority: priority as any,
      totalAmount: lead.dealValue,
      createdBy: lead.createdBy,
      createdAt: caseCreatedDate,
      updatedAt: addDays(caseCreatedDate, Math.floor(Math.random() * 14) + 7),
    });
  }
  
  // Add some direct sales cases without leads (20% of total)
  const directCasesCount = Math.floor(salesCaseData.length * 0.2);
  const salesUsers = await prisma.user.findMany({
    where: { role: { in: ['MANAGER', 'SALES_REP', 'SUPER_ADMIN'] } }
  });
  
  for (let i = 0; i < directCasesCount; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const assignedTo = salesUsers[Math.floor(Math.random() * salesUsers.length)];
    const createdDate = getRandomDate(CONFIG.DATE_RANGE_MONTHS);
    const yearPrefix = new Date(createdDate).getFullYear();
    
    const service = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
    const engineBrand = MARINE_ENGINE_BRANDS[Math.floor(Math.random() * MARINE_ENGINE_BRANDS.length)];
    const value = Math.floor(Math.random() * 300000) + 30000;
    
    salesCaseData.push({
      caseNumber: `SC-${yearPrefix}-${String(caseCounter++).padStart(5, '0')}`,
      customerId: customer.id,
      leadId: null,
      title: `${service} - ${customer.name}`,
      description: `Direct request for ${service} on ${engineBrand} engine. Customer called directly.`,
      status: ['OPEN', 'IN_PROGRESS', 'APPROVED', 'CLOSED_WON'][Math.floor(Math.random() * 4)] as any,
      priority: value > 150000 ? 'HIGH' : 'MEDIUM' as any,
      totalAmount: value,
      createdBy: assignedTo.id,
      createdAt: createdDate,
      updatedAt: addDays(createdDate, Math.floor(Math.random() * 7) + 1),
    });
  }
  
  await processBatch(salesCaseData, async (batch) => {
    for (const caseData of batch) {
      await prisma.salesCase.create({
        data: caseData,
      });
    }
  }, 50, 'Creating Sales Cases');
}

// Generate quotations
async function generateQuotations() {
  console.log('\n📄 Generating Quotations...');
  
  const salesCases = await prisma.salesCase.findMany({
    where: { status: { notIn: ['CLOSED_LOST'] } },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
  });
  
  const items = await prisma.item.findMany({
    include: { category: true },
  });
  
  const quotationData = [];
  let quoteCounter = 1;
  
  for (const salesCase of salesCases) {
    // Generate 1-3 quotations per case (revisions)
    const quotationCount = salesCase.status === 'CLOSED_WON' ? Math.floor(Math.random() * 2) + 1 : 1;
    
    for (let version = 1; version <= quotationCount; version++) {
      const createdDate = addDays(salesCase.createdAt, version * 5);
      const yearPrefix = new Date(createdDate).getFullYear();
      const monthPrefix = String(new Date(createdDate).getMonth() + 1).padStart(2, '0');
      
      // Select random items for quotation
      const itemCount = Math.floor(Math.random() * 8) + 3;
      const selectedItems = [];
      let subtotal = 0;
      
      for (let i = 0; i < itemCount; i++) {
        const item = items[Math.floor(Math.random() * items.length)];
        const quantity = Math.floor(Math.random() * 10) + 1;
        const unitPrice = item.listPrice * (1 + Math.random() * 0.2); // Add margin
        const discount = Math.random() < 0.3 ? Math.floor(Math.random() * 15) : 0;
        const lineTotal = quantity * unitPrice * (1 - discount / 100);
        
        selectedItems.push({
          itemId: item.id,
          description: item.description || item.name,
          quantity,
          unitPrice: Math.round(unitPrice),
          discount,
          taxAmount: lineTotal * 0.05, // 5% VAT
          totalAmount: Math.round(lineTotal * 1.05),
        });
        
        subtotal += lineTotal;
      }
      
      const taxAmount = subtotal * 0.05;
      const total = subtotal + taxAmount;
      
      // Quotation status based on case status
      let status = 'DRAFT';
      const quoteAge = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (salesCase.status === 'CLOSED_WON' && version === quotationCount) {
        status = 'ACCEPTED';
      } else if (salesCase.status === 'CLOSED_LOST') {
        status = 'REJECTED';
      } else if (quoteAge > 30) {
        status = 'EXPIRED';
      } else if (quoteAge > 7) {
        status = 'SENT';
      }
      
      const quotationNumber = `QT-${yearPrefix}${monthPrefix}-${String(quoteCounter++).padStart(4, '0')}`;
      
      const quotation = {
        quotationNumber,
        salesCaseId: salesCase.id,
        quotationDate: createdDate,
        validUntil: addDays(createdDate, 30),
        status: status as any,
        paymentTerms: `Net ${salesCase.customer.paymentTerms} days`,
        deliveryTerms: 'Ex-Works Dubai',
        subTotal: Math.round(subtotal),
        totalTax: Math.round(taxAmount),
        totalAmount: Math.round(total),
        currency: 'AED',
        exchangeRate: 1,
        notes: `Reference: ${salesCase.caseNumber}\nVersion: ${version}\n${version > 1 ? 'Revised quotation as per customer feedback.' : 'Initial quotation.'}`,
        createdBy: salesCase.createdBy,
        createdAt: createdDate,
        updatedAt: status !== 'DRAFT' ? addDays(createdDate, Math.floor(Math.random() * 5) + 1) : createdDate,
        items: {
          create: selectedItems,
        },
      };
      
      quotationData.push(quotation);
    }
  }
  
  // Process quotations in batches
  await processBatch(quotationData, async (batch) => {
    for (const quotation of batch) {
      await prisma.quotation.create({
        data: quotation,
      });
    }
  }, 20, 'Creating Quotations');
}

// Generate sales orders
async function generateSalesOrders() {
  console.log('\n📦 Generating Sales Orders...');
  
  const acceptedQuotations = await prisma.quotation.findMany({
    where: { status: 'ACCEPTED' },
    include: { 
      salesCase: {
        include: { customer: true }
      },
      items: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  
  const salesOrderData = [];
  let orderCounter = 1;
  
  for (const quotation of acceptedQuotations) {
    const createdDate = addDays(quotation.createdAt, Math.floor(Math.random() * 5) + 1);
    const yearPrefix = new Date(createdDate).getFullYear();
    const monthPrefix = String(new Date(createdDate).getMonth() + 1).padStart(2, '0');
    
    // Order status based on age
    const orderAge = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    let status = 'PENDING';
    
    if (orderAge > 60) {
      status = 'DELIVERED';
    } else if (orderAge > 30) {
      status = 'SHIPPED';
    } else if (orderAge > 14) {
      status = 'CONFIRMED';
    }
    
    // Convert quotation items to order items
    const orderItems = quotation.items.map((item: any) => ({
      itemId: item.itemId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxAmount: item.taxAmount,
      totalAmount: item.totalAmount,
      deliveredQuantity: status === 'DELIVERED' ? item.quantity : 
                        status === 'SHIPPED' ? Math.floor(item.quantity * 0.5) : 0,
    }));
    
    const salesOrder = {
      orderNumber: `SO-${yearPrefix}${monthPrefix}-${String(orderCounter++).padStart(4, '0')}`,
      salesCaseId: quotation.salesCaseId,
      quotationId: quotation.id,
      orderDate: createdDate,
      expectedDeliveryDate: addDays(createdDate, 14),
      actualDeliveryDate: status === 'DELIVERED' ? addDays(createdDate, Math.floor(Math.random() * 7) + 10) : null,
      status: status as any,
      paymentTerms: quotation.paymentTerms,
      deliveryTerms: quotation.deliveryTerms,
      subTotal: quotation.subTotal,
      totalTax: quotation.totalTax,
      totalAmount: quotation.totalAmount,
      currency: quotation.currency,
      exchangeRate: quotation.exchangeRate,
      notes: `Created from quotation: ${quotation.quotationNumber}`,
      createdBy: quotation.createdBy,
      createdAt: createdDate,
      updatedAt: addDays(createdDate, Math.floor(Math.random() * 7) + 1),
      items: {
        create: orderItems,
      },
    };
    
    salesOrderData.push(salesOrder);
  }
  
  await processBatch(salesOrderData, async (batch) => {
    for (const order of batch) {
      await prisma.salesOrder.create({
        data: order,
      });
    }
  }, 20, 'Creating Sales Orders');
}

// Generate purchase orders
async function generatePurchaseOrders() {
  console.log('\n📋 Generating Purchase Orders...');
  
  const suppliers = await prisma.supplier.findMany();
  const items = await prisma.item.findMany();
  const users = await prisma.user.findMany({
    where: { role: { in: ['WAREHOUSE', 'SUPER_ADMIN'] } }
  });
  
  const purchaseOrderData = [];
  let poCounter = 1;
  
  // Regular replenishment orders
  for (let month = 0; month < CONFIG.DATE_RANGE_MONTHS; month += 2) {
    // Each supplier gets 1-2 orders every 2 months
    for (const supplier of suppliers) {
      const orderCount = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < orderCount; i++) {
        const createdDate = generateDateRange(month + 2, month);
        const yearPrefix = new Date(createdDate).getFullYear();
        const monthPrefix = String(new Date(createdDate).getMonth() + 1).padStart(2, '0');
        
        // Select random items
        const itemCount = Math.min(Math.floor(Math.random() * 10) + 5, items.length);
        const selectedItems = [];
        let subtotal = 0;
        
        // Randomly select items
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        for (let j = 0; j < itemCount; j++) {
          const item = shuffled[j];
          const quantity = Math.floor(Math.random() * 50) + 20;
          const unitPrice = item.standardCost;
          const lineTotal = quantity * unitPrice;
          
          selectedItems.push({
            itemId: item.id,
            description: item.description || item.name,
            orderedQuantity: quantity,
            unitPrice,
            discount: 0,
            taxAmount: lineTotal * 0.05,
            totalAmount: Math.round(lineTotal * 1.05),
            receivedQuantity: 0,
          });
          
          subtotal += lineTotal;
        }
        
        const taxAmount = subtotal * 0.05;
        const total = subtotal + taxAmount;
        
        // PO status based on age
        const poAge = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        let status = 'DRAFT';
        
        if (poAge > 60) {
          status = 'COMPLETED';
        } else if (poAge > 30) {
          status = 'RECEIVED';
        } else if (poAge > 14) {
          status = 'APPROVED';
        } else if (poAge > 7) {
          status = 'SENT';
        }
        
        const purchaseOrder = {
          poNumber: `PO-${yearPrefix}${monthPrefix}-${String(poCounter++).padStart(4, '0')}`,
          supplierId: supplier.id,
          orderDate: createdDate,
          expectedDeliveryDate: addDays(createdDate, 30),
          actualDeliveryDate: status === 'COMPLETED' ? addDays(createdDate, 25) : null,
          status: status as any,
          paymentTerms: `Net ${supplier.paymentTerms} days`,
          deliveryTerms: 'FOB Origin',
          subTotal: Math.round(subtotal),
          totalTax: Math.round(taxAmount),
          totalAmount: Math.round(total),
          currency: 'AED',
          exchangeRate: 1,
          notes: `Regular stock replenishment order`,
          createdBy: users[0].id,
          createdAt: createdDate,
          updatedAt: addDays(createdDate, Math.floor(Math.random() * 7) + 1),
          items: {
            create: selectedItems,
          },
        };
        
        purchaseOrderData.push(purchaseOrder);
      }
    }
  }
  
  await processBatch(purchaseOrderData, async (batch) => {
    for (const po of batch) {
      await prisma.purchaseOrder.create({
        data: po,
      });
    }
  }, 20, 'Creating Purchase Orders');
}

// Generate invoices and payments
async function generateFinancialData() {
  console.log('\n💰 Generating Financial Data...');
  
  // Generate invoices from delivered sales orders
  const deliveredOrders = await prisma.salesOrder.findMany({
    where: { status: 'DELIVERED' },
    include: { 
      salesCase: {
        include: { customer: true }
      },
      items: true 
    },
  });
  
  const invoiceData = [];
  let invoiceCounter = 1;
  
  for (const order of deliveredOrders) {
    const createdDate = order.actualDeliveryDate || addDays(order.orderDate, 14);
    const yearPrefix = new Date(createdDate).getFullYear();
    const monthPrefix = String(new Date(createdDate).getMonth() + 1).padStart(2, '0');
    
    const invoiceItems = order.items.map((item: any) => ({
      itemId: item.itemId,
      description: item.description,
      quantity: item.deliveredQuantity || item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxAmount: item.taxAmount,
      totalAmount: item.totalAmount,
    }));
    
    const invoice = {
      invoiceNumber: `INV-${yearPrefix}${monthPrefix}-${String(invoiceCounter++).padStart(4, '0')}`,
      salesOrderId: order.id,
      customerId: order.salesCase.customerId,
      invoiceDate: createdDate,
      dueDate: addDays(createdDate, order.salesCase.customer.paymentTerms || 30),
      status: 'POSTED' as any,
      subTotal: order.subTotal,
      totalTax: order.totalTax,
      totalAmount: order.totalAmount,
      currency: order.currency,
      exchangeRate: order.exchangeRate,
      notes: `Invoice for Sales Order: ${order.orderNumber}`,
      createdBy: order.createdBy,
      createdAt: createdDate,
      updatedAt: createdDate,
      items: {
        create: invoiceItems,
      },
    };
    
    invoiceData.push(invoice);
  }
  
  await processBatch(invoiceData, async (batch) => {
    for (const invoice of batch) {
      await prisma.invoice.create({
        data: invoice,
      });
    }
  }, 20, 'Creating Invoices');
  
  // Generate payments for some invoices
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
  });
  
  const paymentData = [];
  let paymentCounter = 1;
  
  // 70% of invoices are paid
  const paidInvoices = invoices.filter(() => Math.random() < 0.7);
  
  for (const invoice of paidInvoices) {
    const paymentDate = addDays(invoice.invoiceDate, Math.floor(Math.random() * 30) + 7);
    const yearPrefix = new Date(paymentDate).getFullYear();
    
    const payment = {
      paymentNumber: `PAY-${yearPrefix}-${String(paymentCounter++).padStart(5, '0')}`,
      customerId: invoice.customerId,
      paymentDate,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      paymentMethod: ['BANK_TRANSFER', 'CHECK', 'CASH'][Math.floor(Math.random() * 3)] as any,
      reference: `Payment for ${invoice.invoiceNumber}`,
      notes: 'Payment received and confirmed',
      status: 'COMPLETED' as any,
      createdBy: invoice.createdBy,
      createdAt: paymentDate,
      updatedAt: paymentDate,
      allocations: {
        create: [{
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          createdBy: invoice.createdBy,
        }],
      },
    };
    
    paymentData.push(payment);
  }
  
  await processBatch(paymentData, async (batch) => {
    for (const payment of batch) {
      await prisma.payment.create({
        data: payment,
      });
    }
  }, 20, 'Creating Payments');
}

// Generate shipments
async function generateShipments() {
  console.log('\n🚢 Generating Shipments...');
  
  const shippedOrders = await prisma.salesOrder.findMany({
    where: { 
      status: { in: ['SHIPPED', 'DELIVERED'] }
    },
    include: { 
      salesCase: {
        include: { customer: true }
      },
      items: true 
    },
  });
  
  const shipmentData = [];
  let shipmentCounter = 1;
  
  for (const order of shippedOrders) {
    const createdDate = addDays(order.orderDate, 3);
    const yearPrefix = new Date(createdDate).getFullYear();
    
    const shipmentItems = order.items.map((item: any) => ({
      salesOrderItemId: item.id,
      quantity: order.status === 'DELIVERED' ? item.quantity : Math.floor(item.quantity * 0.5),
    }));
    
    const shipment = {
      shipmentNumber: `SH-${yearPrefix}-${String(shipmentCounter++).padStart(5, '0')}`,
      salesOrderId: order.id,
      shipmentDate: addDays(createdDate, 2),
      status: order.status === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT' as any,
      carrier: ['DHL Express', 'FedEx', 'Emirates SkyCargo', 'Aramex'][Math.floor(Math.random() * 4)],
      trackingNumber: `TRK${Date.now()}${Math.floor(Math.random() * 10000)}`,
      weight: Math.floor(Math.random() * 100) + 10,
      freight: Math.floor(Math.random() * 500) + 100,
      notes: `Shipment for order ${order.orderNumber}`,
      createdBy: order.createdBy,
      createdAt: createdDate,
      updatedAt: order.status === 'DELIVERED' ? addDays(createdDate, 10) : createdDate,
      items: {
        create: shipmentItems,
      },
    };
    
    shipmentData.push(shipment);
  }
  
  await processBatch(shipmentData, async (batch) => {
    for (const shipment of batch) {
      await prisma.shipment.create({
        data: shipment,
      });
    }
  }, 20, 'Creating Shipments');
}

// Main orchestrator
async function main() {
  console.log('🌊 Starting UAE Marine Engine Maintenance Company Seed Process...');
  console.log(`📅 Generating ${CONFIG.DATE_RANGE_MONTHS} months of historical data`);
  console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE} records`);
  
  const startTime = Date.now();
  
  try {
    // Clear existing data if needed
    if (process.env.CLEAR_DATA === 'true') {
      console.log('🗑️  Clearing existing data...');
      await clearAllData();
    }
    
    // Run seeders in sequence
    await seedBaseData();
    await seedMasterData();
    await seedInventoryData();
    await generateLeads();
    await generateSalesCases();
    await generateQuotations();
    await generateSalesOrders();
    await generatePurchaseOrders();
    await generateFinancialData();
    await generateShipments();
    
    // Final statistics
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('\n✨ Seeding completed successfully!');
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    
    // Print summary
    await printSummary();
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to clear all data
async function clearAllData() {
  const tables = [
    'Payment',
    'InvoiceItem',
    'Invoice',
    'ShipmentItem',
    'Shipment',
    'SalesOrderItem',
    'SalesOrder',
    'QuotationItem',
    'Quotation',
    'CaseExpense',
    'SalesCase',
    'Lead',
    'PurchaseOrderItem',
    'PurchaseOrder',
    'LocationStockLot',
    'StockLot',
    'Location',
    'Item',
    'Category',
    'Customer',
    'Supplier',
    'User',
    'CompanySettings',
    'UnitOfMeasure',
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      console.log(`🗑️  Cleared ${table}`);
    } catch (error: any) {
      console.warn(`⚠️  Could not clear ${table}:`, error.message);
    }
  }
}

// Print summary statistics
async function printSummary() {
  console.log('\n📊 Database Summary:');
  
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.item.count(),
    prisma.lead.count(),
    prisma.salesCase.count(),
    prisma.quotation.count(),
    prisma.salesOrder.count(),
    prisma.purchaseOrder.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.shipment.count(),
    prisma.stockLot.count(),
  ]);
  
  const [
    users, customers, suppliers, items, leads, cases, 
    quotes, orders, purchaseOrders, invoices, payments, 
    shipments, stockLots
  ] = counts;
  
  console.log(`👥 Users: ${users}`);
  console.log(`🏢 Customers: ${customers}`);
  console.log(`🏭 Suppliers: ${suppliers}`);
  console.log(`🔧 Inventory Items: ${items}`);
  console.log(`📞 Leads: ${leads}`);
  console.log(`📋 Sales Cases: ${cases}`);
  console.log(`📄 Quotations: ${quotes}`);
  console.log(`📦 Sales Orders: ${orders}`);
  console.log(`📋 Purchase Orders: ${purchaseOrders}`);
  console.log(`💵 Invoices: ${invoices}`);
  console.log(`💰 Payments: ${payments}`);
  console.log(`🚚 Shipments: ${shipments}`);
  console.log(`📊 Stock Lots: ${stockLots}`);
  
  // Additional analytics
  const leadConversion = await prisma.lead.groupBy({
    by: ['status'],
    _count: true,
  });
  
  console.log('\n📈 Lead Status Distribution:');
  leadConversion.forEach(({ status, _count }: any) => {
    console.log(`   ${status}: ${_count}`);
  });
  
  const monthlyQuotes = await prisma.$queryRaw`
    SELECT 
      strftime('%Y-%m', createdAt) as month,
      COUNT(*) as count,
      SUM(totalAmount) as total_value
    FROM Quotation
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  ` as any[];
  
  console.log('\n📊 Recent Monthly Quotations:');
  monthlyQuotes.forEach(({ month, count, total_value }: any) => {
    console.log(`   ${month}: ${count} quotes, AED ${Math.round(total_value).toLocaleString()}`);
  });
}

// Run the seeder
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

// Export utilities for reuse
export {
  processBatch,
  ProgressTracker,
  generateDateRange,
  getRandomDate,
};