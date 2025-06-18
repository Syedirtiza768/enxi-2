// Part 2 of UAE Marine Diesel seed functions

async function createChartOfAccounts(userId: string) {
  const accounts: Record<string, any> = {}

  // 1000 - ASSETS
  const assets = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Assets',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'All company assets',
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  // 1100 - Current Assets
  const currentAssets = await prisma.account.create({
    data: {
      code: '1100',
      name: 'Current Assets',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Assets expected to be converted to cash within one year',
      parentId: assets.id,
      isActive: true,
      createdBy: userId
    }
  })

  // Cash and Bank accounts
  accounts.cashAED = await prisma.account.create({
    data: {
      code: '1110',
      name: 'Cash on Hand - AED',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Physical cash in AED',
      parentId: currentAssets.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.cashUSD = await prisma.account.create({
    data: {
      code: '1111',
      name: 'Cash on Hand - USD',
      type: AccountType.ASSET,
      currency: 'USD',
      description: 'Physical cash in USD',
      parentId: currentAssets.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.bankAED = await prisma.account.create({
    data: {
      code: '1120',
      name: 'Emirates NBD - AED Account',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Main operating bank account in AED',
      parentId: currentAssets.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.bankUSD = await prisma.account.create({
    data: {
      code: '1121',
      name: 'Emirates NBD - USD Account',
      type: AccountType.ASSET,
      currency: 'USD',
      description: 'USD account for international transactions',
      parentId: currentAssets.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Customer receivables',
      parentId: currentAssets.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory - Marine Parts',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Marine engine parts and consumables',
      parentId: currentAssets.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.prepaidExpenses = await prisma.account.create({
    data: {
      code: '1400',
      name: 'Prepaid Expenses',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Prepaid insurance, rent, etc.',
      parentId: currentAssets.id,
      isActive: true,
      createdBy: userId
    }
  })

  // 1500 - Fixed Assets
  const fixedAssets = await prisma.account.create({
    data: {
      code: '1500',
      name: 'Fixed Assets',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Long-term tangible assets',
      parentId: assets.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.workshopEquipment = await prisma.account.create({
    data: {
      code: '1510',
      name: 'Workshop Equipment',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Marine engine repair equipment and tools',
      parentId: fixedAssets.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.vehicles = await prisma.account.create({
    data: {
      code: '1520',
      name: 'Service Vehicles',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Service vans and trucks',
      parentId: fixedAssets.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.accumulatedDepreciation = await prisma.account.create({
    data: {
      code: '1590',
      name: 'Accumulated Depreciation',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'Accumulated depreciation on fixed assets',
      parentId: fixedAssets.id,
      isActive: true,
      createdBy: userId
    }
  })

  // 2000 - LIABILITIES
  const liabilities = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Liabilities',
      type: AccountType.LIABILITY,
      currency: 'AED',
      description: 'All company liabilities',
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  // 2100 - Current Liabilities
  const currentLiabilities = await prisma.account.create({
    data: {
      code: '2100',
      name: 'Current Liabilities',
      type: AccountType.LIABILITY,
      currency: 'AED',
      description: 'Liabilities due within one year',
      parentId: liabilities.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.accountsPayable = await prisma.account.create({
    data: {
      code: '2110',
      name: 'Accounts Payable',
      type: AccountType.LIABILITY,
      currency: 'AED',
      description: 'Amounts owed to suppliers',
      parentId: currentLiabilities.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.vatPayable = await prisma.account.create({
    data: {
      code: '2200',
      name: 'VAT Payable',
      type: AccountType.LIABILITY,
      currency: 'AED',
      description: 'VAT collected from customers',
      parentId: currentLiabilities.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.vatReceivable = await prisma.account.create({
    data: {
      code: '1250',
      name: 'VAT Receivable',
      type: AccountType.ASSET,
      currency: 'AED',
      description: 'VAT paid on purchases',
      parentId: currentAssets.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.salariesPayable = await prisma.account.create({
    data: {
      code: '2300',
      name: 'Salaries Payable',
      type: AccountType.LIABILITY,
      currency: 'AED',
      description: 'Salaries owed to employees',
      parentId: currentLiabilities.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.gratuityPayable = await prisma.account.create({
    data: {
      code: '2400',
      name: 'Gratuity Payable',
      type: AccountType.LIABILITY,
      currency: 'AED',
      description: 'End of service benefits',
      parentId: currentLiabilities.id,
      isActive: true,
      createdBy: userId
    }
  })

  // 3000 - EQUITY
  const equity = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Equity',
      type: AccountType.EQUITY,
      currency: 'AED',
      description: 'Owner\'s equity',
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.capitalStock = await prisma.account.create({
    data: {
      code: '3100',
      name: 'Share Capital',
      type: AccountType.EQUITY,
      currency: 'AED',
      description: 'Paid-up share capital',
      parentId: equity.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.retainedEarnings = await prisma.account.create({
    data: {
      code: '3200',
      name: 'Retained Earnings',
      type: AccountType.EQUITY,
      currency: 'AED',
      description: 'Accumulated profits',
      parentId: equity.id,
      isActive: true,
      createdBy: userId
    }
  })

  // 4000 - INCOME
  const income = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Revenue',
      type: AccountType.INCOME,
      currency: 'AED',
      description: 'All revenue accounts',
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.serviceRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Marine Engine Service Revenue',
      type: AccountType.INCOME,
      currency: 'AED',
      description: 'Revenue from engine maintenance services',
      parentId: income.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.partsRevenue = await prisma.account.create({
    data: {
      code: '4200',
      name: 'Spare Parts Sales Revenue',
      type: AccountType.INCOME,
      currency: 'AED',
      description: 'Revenue from spare parts sales',
      parentId: income.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.emergencyServiceRevenue = await prisma.account.create({
    data: {
      code: '4300',
      name: 'Emergency Service Revenue',
      type: AccountType.INCOME,
      currency: 'AED',
      description: 'Revenue from 24/7 emergency services',
      parentId: income.id,
      isActive: true,
      createdBy: userId
    }
  })

  // 5000 - EXPENSES
  const expenses = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Expenses',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'All expense accounts',
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.cogs = await prisma.account.create({
    data: {
      code: '5010',
      name: 'Cost of Goods Sold',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'Direct cost of parts sold',
      parentId: expenses.id,
      isActive: true,
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.directLabor = await prisma.account.create({
    data: {
      code: '5020',
      name: 'Direct Labor Cost',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'Service engineer wages',
      parentId: expenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  // Operating Expenses
  const operatingExpenses = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Operating Expenses',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'General operating expenses',
      parentId: expenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.salariesExpense = await prisma.account.create({
    data: {
      code: '5110',
      name: 'Staff Salaries',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'Administrative staff salaries',
      parentId: operatingExpenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Workshop Rent',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'Workshop and office rent',
      parentId: operatingExpenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'DEWA, Etisalat, etc.',
      parentId: operatingExpenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.transportExpense = await prisma.account.create({
    data: {
      code: '5400',
      name: 'Transportation',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'Service vehicle expenses',
      parentId: operatingExpenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  accounts.marketingExpense = await prisma.account.create({
    data: {
      code: '5500',
      name: 'Marketing & Advertising',
      type: AccountType.EXPENSE,
      currency: 'AED',
      description: 'Marketing and promotional expenses',
      parentId: operatingExpenses.id,
      isActive: true,
      createdBy: userId
    }
  })

  return accounts
}

async function createLocations(userId: string) {
  const mainWarehouse = await prisma.location.create({
    data: {
      locationCode: 'DXB-MAIN',
      name: 'Dubai Main Warehouse',
      type: 'WAREHOUSE',
      description: 'Main parts warehouse and workshop in Jebel Ali',
      address: 'Plot 123, Jebel Ali Free Zone',
      city: 'Dubai',
      state: 'Dubai',
      country: 'AE',
      postalCode: '17000',
      contactPerson: 'John Santos',
      phone: '+971 4 123 4567',
      email: 'warehouse.dubai@gulfmarinediesel.ae',
      isActive: true,
      isDefault: true,
      maxCapacity: 10000,
      currentUtilization: 0,
      createdBy: userId
    }
  })

  const abuDhabiWarehouse = await prisma.location.create({
    data: {
      locationCode: 'AUH-WH01',
      name: 'Abu Dhabi Service Center',
      type: 'WAREHOUSE',
      description: 'Service center and parts storage in Mussafah',
      address: 'Industrial Area 13, Mussafah',
      city: 'Abu Dhabi',
      state: 'Abu Dhabi',
      country: 'AE',
      postalCode: '31000',
      contactPerson: 'Ali Hassan',
      phone: '+971 2 555 6789',
      email: 'warehouse.abudhabi@gulfmarinediesel.ae',
      isActive: true,
      maxCapacity: 5000,
      currentUtilization: 0,
      createdBy: userId
    }
  })

  const serviceVan1 = await prisma.location.create({
    data: {
      locationCode: 'VAN-001',
      name: 'Mobile Service Van 1',
      type: 'VEHICLE',
      description: 'Mobile service unit for on-site repairs',
      contactPerson: 'David Rodriguez',
      phone: '+971 50 789 0123',
      isActive: true,
      maxCapacity: 500,
      currentUtilization: 0,
      createdBy: userId
    }
  })

  return { mainWarehouse, abuDhabiWarehouse, serviceVan1 }
}

async function createMarineInventory(userId: string, accounts: any, locations: any, taxConfig: any) {
  // Units of Measure
  const piece = await prisma.unitOfMeasure.create({
    data: {
      code: 'PC',
      name: 'Piece',
      symbol: 'pc',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  const set = await prisma.unitOfMeasure.create({
    data: {
      code: 'SET',
      name: 'Set',
      symbol: 'set',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  const liter = await prisma.unitOfMeasure.create({
    data: {
      code: 'L',
      name: 'Liter',
      symbol: 'L',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  const kg = await prisma.unitOfMeasure.create({
    data: {
      code: 'KG',
      name: 'Kilogram',
      symbol: 'kg',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  const hour = await prisma.unitOfMeasure.create({
    data: {
      code: 'HR',
      name: 'Hour',
      symbol: 'hr',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  // Categories
  const marineParts = await prisma.category.create({
    data: {
      code: 'MARINE',
      name: 'Marine Engine Parts',
      description: 'All marine diesel engine related parts',
      createdBy: userId
    }
  })

  const engineParts = await prisma.category.create({
    data: {
      code: 'ENGINE',
      name: 'Engine Components',
      description: 'Core engine components',
      parentId: marineParts.id,
      createdBy: userId
    }
  })

  const filters = await prisma.category.create({
    data: {
      code: 'FILTERS',
      name: 'Filters',
      description: 'Oil, fuel, air filters',
      parentId: marineParts.id,
      createdBy: userId
    }
  })

  const lubricants = await prisma.category.create({
    data: {
      code: 'LUBE',
      name: 'Lubricants & Fluids',
      description: 'Engine oils and fluids',
      parentId: marineParts.id,
      createdBy: userId
    }
  })

  const cooling = await prisma.category.create({
    data: {
      code: 'COOLING',
      name: 'Cooling System',
      description: 'Cooling system components',
      parentId: marineParts.id,
      createdBy: userId
    }
  })

  const services = await prisma.category.create({
    data: {
      code: 'SERVICE',
      name: 'Services',
      description: 'Maintenance and repair services',
      createdBy: userId
    }
  })

  // Items - Engine Parts
  const items: Record<string, any> = {}

  items.piston = await prisma.item.create({
    data: {
      code: 'PST-001',
      name: 'Marine Diesel Piston - Standard',
      description: 'Standard piston for marine diesel engines 100-200HP',
      categoryId: engineParts.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 10,
      maxStockLevel: 50,
      reorderPoint: 15,
      standardCost: 850,
      listPrice: 1200,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  items.cylinderHead = await prisma.item.create({
    data: {
      code: 'CYL-001',
      name: 'Cylinder Head Assembly',
      description: 'Complete cylinder head assembly for marine diesel',
      categoryId: engineParts.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 5,
      maxStockLevel: 20,
      reorderPoint: 8,
      standardCost: 3500,
      listPrice: 5200,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  items.injector = await prisma.item.create({
    data: {
      code: 'INJ-001',
      name: 'Fuel Injector',
      description: 'High-pressure fuel injector for marine diesel',
      categoryId: engineParts.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 20,
      maxStockLevel: 100,
      reorderPoint: 30,
      standardCost: 450,
      listPrice: 680,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  // Filters
  items.oilFilter = await prisma.item.create({
    data: {
      code: 'FLT-OIL-001',
      name: 'Marine Oil Filter',
      description: 'Heavy-duty oil filter for marine engines',
      categoryId: filters.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 50,
      maxStockLevel: 200,
      reorderPoint: 75,
      standardCost: 45,
      listPrice: 85,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  items.fuelFilter = await prisma.item.create({
    data: {
      code: 'FLT-FUEL-001',
      name: 'Marine Fuel Filter',
      description: 'Water-separating fuel filter',
      categoryId: filters.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 40,
      maxStockLevel: 150,
      reorderPoint: 60,
      standardCost: 65,
      listPrice: 120,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  items.airFilter = await prisma.item.create({
    data: {
      code: 'FLT-AIR-001',
      name: 'Marine Air Filter',
      description: 'Heavy-duty air filter for marine environment',
      categoryId: filters.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 30,
      maxStockLevel: 100,
      reorderPoint: 45,
      standardCost: 85,
      listPrice: 150,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  // Lubricants
  items.engineOil = await prisma.item.create({
    data: {
      code: 'OIL-15W40',
      name: 'Marine Engine Oil 15W-40',
      description: 'Premium marine diesel engine oil - 20L',
      categoryId: lubricants.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: liter.id,
      trackInventory: true,
      minStockLevel: 200,
      maxStockLevel: 1000,
      reorderPoint: 300,
      standardCost: 12,
      listPrice: 18,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  items.coolant = await prisma.item.create({
    data: {
      code: 'COOL-001',
      name: 'Marine Engine Coolant',
      description: 'Corrosion-resistant coolant - 20L',
      categoryId: lubricants.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: liter.id,
      trackInventory: true,
      minStockLevel: 100,
      maxStockLevel: 500,
      reorderPoint: 150,
      standardCost: 15,
      listPrice: 25,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  // Cooling System
  items.waterPump = await prisma.item.create({
    data: {
      code: 'WP-001',
      name: 'Sea Water Pump',
      description: 'Raw water pump for marine cooling system',
      categoryId: cooling.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 5,
      maxStockLevel: 25,
      reorderPoint: 10,
      standardCost: 650,
      listPrice: 950,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  items.impeller = await prisma.item.create({
    data: {
      code: 'IMP-001',
      name: 'Water Pump Impeller',
      description: 'Rubber impeller for raw water pump',
      categoryId: cooling.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: piece.id,
      trackInventory: true,
      minStockLevel: 20,
      maxStockLevel: 80,
      reorderPoint: 30,
      standardCost: 85,
      listPrice: 145,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  // Services
  items.basicService = await prisma.item.create({
    data: {
      code: 'SRV-BASIC',
      name: 'Basic Engine Service',
      description: 'Oil change, filter replacement, basic inspection',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: hour.id,
      trackInventory: false,
      standardCost: 150,
      listPrice: 350,
      salesAccountId: accounts.serviceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  items.majorService = await prisma.item.create({
    data: {
      code: 'SRV-MAJOR',
      name: 'Major Engine Service',
      description: 'Complete engine service including injector cleaning',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: hour.id,
      trackInventory: false,
      standardCost: 300,
      listPrice: 650,
      salesAccountId: accounts.serviceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  items.emergencyService = await prisma.item.create({
    data: {
      code: 'SRV-EMERGENCY',
      name: '24/7 Emergency Service',
      description: 'Emergency on-site repair service',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: hour.id,
      trackInventory: false,
      standardCost: 400,
      listPrice: 850,
      salesAccountId: accounts.emergencyServiceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  items.overhaulService = await prisma.item.create({
    data: {
      code: 'SRV-OVERHAUL',
      name: 'Engine Overhaul',
      description: 'Complete engine rebuild service',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: hour.id,
      trackInventory: false,
      standardCost: 500,
      listPrice: 1200,
      salesAccountId: accounts.serviceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  return {
    units: { piece, set, liter, kg, hour },
    categories: { marineParts, engineParts, filters, lubricants, cooling, services },
    items
  }
}

export {
  createChartOfAccounts,
  createLocations,
  createMarineInventory
}