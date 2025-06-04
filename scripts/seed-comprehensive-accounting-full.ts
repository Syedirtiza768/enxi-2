import { PrismaClient } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive accounting seed...')

  // Clear existing data in correct order to avoid foreign key constraints
  console.log('🧹 Clearing existing data...')
  
  // Clear payment related data first
  await prisma.supplierPayment.deleteMany()
  await prisma.supplierInvoice.deleteMany()
  await prisma.goodsReceiptItem.deleteMany()
  await prisma.goodsReceipt.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  
  // Clear sales related data
  await prisma.payment.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.shipmentItem.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.salesOrderItem.deleteMany()
  await prisma.salesOrder.deleteMany()
  await prisma.quotationItem.deleteMany()
  await prisma.quotation.deleteMany()
  await prisma.customerPO.deleteMany()
  await prisma.caseExpense.deleteMany()
  await prisma.salesCase.deleteMany()
  
  // Clear inventory related data
  await prisma.physicalCountItem.deleteMany()
  await prisma.physicalCount.deleteMany()
  await prisma.stockTransferItem.deleteMany()
  await prisma.stockTransfer.deleteMany()
  await prisma.locationStockLot.deleteMany()
  await prisma.inventoryBalance.deleteMany()
  await prisma.stockReservation.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.stockLot.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()
  await prisma.unitOfMeasure.deleteMany()
  await prisma.location.deleteMany()
  
  // Clear customer and supplier data
  await prisma.customer.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.supplier.deleteMany()
  
  // Clear accounting data
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.exchangeRate.deleteMany()
  await prisma.account.deleteMany()
  
  // Clear user related data
  await prisma.salesTeamMember.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create base users with proper roles
  console.log('👤 Creating users...')
  const hashedPassword = await bcrypt.hash('password123', 10)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        profile: {
          create: {
            firstName: 'System',
            lastName: 'Administrator',
            phone: '+1 555-0100',
            department: 'IT',
            jobTitle: 'System Administrator'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'john.accountant',
        email: 'john@enxi.com',
        password: hashedPassword,
        role: 'ACCOUNTANT',
        profile: {
          create: {
            firstName: 'John',
            lastName: 'Smith',
            phone: '+1 555-0101',
            department: 'Finance',
            jobTitle: 'Senior Accountant'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'sarah.sales',
        email: 'sarah@enxi.com',
        password: hashedPassword,
        role: 'SALES_REP',
        profile: {
          create: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            phone: '+1 555-0102',
            department: 'Sales',
            jobTitle: 'Sales Representative'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'mike.warehouse',
        email: 'mike@enxi.com',
        password: hashedPassword,
        role: 'WAREHOUSE',
        profile: {
          create: {
            firstName: 'Mike',
            lastName: 'Wilson',
            phone: '+1 555-0103',
            department: 'Warehouse',
            jobTitle: 'Warehouse Manager'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'emily.manager',
        email: 'emily@enxi.com',
        password: hashedPassword,
        role: 'MANAGER',
        profile: {
          create: {
            firstName: 'Emily',
            lastName: 'Davis',
            phone: '+1 555-0104',
            department: 'Sales',
            jobTitle: 'Sales Manager'
          }
        }
      }
    })
  ])

  const [adminUser, accountantUser, salesUser, warehouseUser, managerUser] = users

  // Set up sales team hierarchy
  await prisma.user.update({
    where: { id: salesUser.id },
    data: { managerId: managerUser.id }
  })

  // Create sales team members
  await Promise.all([
    prisma.salesTeamMember.create({
      data: {
        userId: salesUser.id,
        salesTarget: 50000,
        commission: 5.0,
        territory: 'North Region',
        specialization: 'Enterprise Software'
      }
    }),
    prisma.salesTeamMember.create({
      data: {
        userId: managerUser.id,
        salesTarget: 200000,
        commission: 7.5,
        territory: 'All Regions',
        isTeamLead: true
      }
    })
  ])

  // 2. Create Chart of Accounts
  console.log('📊 Creating chart of accounts...')
  
  // Assets (1000-1999)
  const cashAccount = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Cash',
      type: 'ASSET',
      description: 'Cash and cash equivalents',
      balance: 250000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const bankAccount = await prisma.account.create({
    data: {
      code: '1010',
      name: 'Bank Account - Main',
      type: 'ASSET',
      description: 'Main operating bank account',
      balance: 1500000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const arAccount = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: 'ASSET',
      description: 'Customer receivables',
      balance: 350000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const inventoryAccount = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory',
      type: 'ASSET',
      description: 'Inventory asset account',
      balance: 500000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const prepaidExpensesAccount = await prisma.account.create({
    data: {
      code: '1400',
      name: 'Prepaid Expenses',
      type: 'ASSET',
      description: 'Prepaid expenses',
      balance: 25000,
      createdBy: adminUser.id
    }
  })

  const equipmentAccount = await prisma.account.create({
    data: {
      code: '1500',
      name: 'Equipment',
      type: 'ASSET',
      description: 'Office and warehouse equipment',
      balance: 150000,
      createdBy: adminUser.id
    }
  })

  // Liabilities (2000-2999)
  const apAccount = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      description: 'Supplier payables',
      balance: 180000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const salesTaxPayableAccount = await prisma.account.create({
    data: {
      code: '2100',
      name: 'Sales Tax Payable',
      type: 'LIABILITY',
      description: 'Sales tax collected',
      balance: 45000,
      createdBy: adminUser.id
    }
  })

  const salariesPayableAccount = await prisma.account.create({
    data: {
      code: '2200',
      name: 'Salaries Payable',
      type: 'LIABILITY',
      description: 'Employee salaries payable',
      balance: 75000,
      createdBy: adminUser.id
    }
  })

  const unearnedRevenueAccount = await prisma.account.create({
    data: {
      code: '2300',
      name: 'Unearned Revenue',
      type: 'LIABILITY',
      description: 'Revenue received in advance',
      balance: 50000,
      createdBy: adminUser.id
    }
  })

  // Equity (3000-3999)
  const capitalAccount = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Owner\'s Capital',
      type: 'EQUITY',
      description: 'Owner\'s capital investment',
      balance: 1000000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const retainedEarningsAccount = await prisma.account.create({
    data: {
      code: '3100',
      name: 'Retained Earnings',
      type: 'EQUITY',
      description: 'Accumulated profits',
      balance: 475000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  // Income (4000-4999)
  const salesRevenueAccount = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Sales Revenue',
      type: 'INCOME',
      description: 'Revenue from product sales',
      balance: 2500000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const serviceRevenueAccount = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Service Revenue',
      type: 'INCOME',
      description: 'Revenue from services',
      balance: 500000,
      createdBy: adminUser.id
    }
  })

  const interestIncomeAccount = await prisma.account.create({
    data: {
      code: '4200',
      name: 'Interest Income',
      type: 'INCOME',
      description: 'Interest earned',
      balance: 5000,
      createdBy: adminUser.id
    }
  })

  // Expenses (5000-5999)
  const cogsAccount = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      description: 'Cost of products sold',
      balance: 1250000,
      isSystemAccount: true,
      createdBy: adminUser.id
    }
  })

  const salariesExpenseAccount = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Salaries Expense',
      type: 'EXPENSE',
      description: 'Employee salaries',
      balance: 600000,
      createdBy: adminUser.id
    }
  })

  const rentExpenseAccount = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: 'EXPENSE',
      description: 'Office and warehouse rent',
      balance: 120000,
      createdBy: adminUser.id
    }
  })

  const utilitiesExpenseAccount = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: 'EXPENSE',
      description: 'Electricity, water, internet',
      balance: 24000,
      createdBy: adminUser.id
    }
  })

  const marketingExpenseAccount = await prisma.account.create({
    data: {
      code: '5400',
      name: 'Marketing Expense',
      type: 'EXPENSE',
      description: 'Marketing and advertising',
      balance: 80000,
      createdBy: adminUser.id
    }
  })

  const officeSuppliesExpenseAccount = await prisma.account.create({
    data: {
      code: '5500',
      name: 'Office Supplies Expense',
      type: 'EXPENSE',
      description: 'Office supplies and materials',
      balance: 15000,
      createdBy: adminUser.id
    }
  })

  const travelExpenseAccount = await prisma.account.create({
    data: {
      code: '5600',
      name: 'Travel Expense',
      type: 'EXPENSE',
      description: 'Business travel expenses',
      balance: 35000,
      createdBy: adminUser.id
    }
  })

  // 3. Create Exchange Rates
  console.log('💱 Creating exchange rates...')
  const exchangeRates = await Promise.all([
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.09,
        rateDate: new Date('2024-01-01'),
        source: 'manual',
        createdBy: adminUser.id
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'GBP',
        toCurrency: 'USD',
        rate: 1.27,
        rateDate: new Date('2024-01-01'),
        source: 'manual',
        createdBy: adminUser.id
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'CAD',
        toCurrency: 'USD',
        rate: 0.74,
        rateDate: new Date('2024-01-01'),
        source: 'manual',
        createdBy: adminUser.id
      }
    })
  ])

  // 4. Create Units of Measure
  console.log('📏 Creating units of measure...')
  
  // Create base units first
  const eaUnit = await prisma.unitOfMeasure.create({
    data: {
      id: 'ea',
      code: 'EA',
      name: 'Each',
      symbol: 'ea',
      description: 'Individual unit',
      isBaseUnit: true,
      createdBy: adminUser.id
    }
  })
  
  const kgUnit = await prisma.unitOfMeasure.create({
    data: {
      id: 'kg',
      code: 'KG',
      name: 'Kilogram',
      symbol: 'kg',
      description: 'Weight in kilograms',
      isBaseUnit: true,
      createdBy: adminUser.id
    }
  })
  
  const mUnit = await prisma.unitOfMeasure.create({
    data: {
      id: 'm',
      code: 'M',
      name: 'Meter',
      symbol: 'm',
      description: 'Length in meters',
      isBaseUnit: true,
      createdBy: adminUser.id
    }
  })
  
  // Create derived unit
  const boxUnit = await prisma.unitOfMeasure.create({
    data: {
      id: 'box',
      code: 'BOX',
      name: 'Box',
      symbol: 'box',
      description: 'Box of items',
      baseUnitId: 'ea',
      conversionFactor: 12,
      createdBy: adminUser.id
    }
  })
  
  const units = [eaUnit, boxUnit, kgUnit, mUnit]

  // 5. Create Locations/Warehouses
  console.log('🏭 Creating locations...')
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        locationCode: 'WH-MAIN',
        name: 'Main Warehouse',
        type: 'WAREHOUSE',
        description: 'Primary distribution center',
        address: '100 Warehouse Way',
        city: 'Dallas',
        state: 'TX',
        country: 'US',
        postalCode: '75001',
        contactPerson: 'Mike Wilson',
        phone: '+1 555-0103',
        email: 'warehouse@enxi.com',
        isDefault: true,
        inventoryAccountId: inventoryAccount.id,
        createdBy: warehouseUser.id
      }
    }),
    prisma.location.create({
      data: {
        locationCode: 'WH-WEST',
        name: 'West Coast Warehouse',
        type: 'WAREHOUSE',
        description: 'West coast distribution',
        address: '200 Pacific Blvd',
        city: 'Los Angeles',
        state: 'CA',
        country: 'US',
        postalCode: '90001',
        inventoryAccountId: inventoryAccount.id,
        createdBy: warehouseUser.id
      }
    }),
    prisma.location.create({
      data: {
        locationCode: 'STORE-NY',
        name: 'New York Store',
        type: 'STORE',
        description: 'Retail location',
        address: '500 5th Avenue',
        city: 'New York',
        state: 'NY',
        country: 'US',
        postalCode: '10001',
        inventoryAccountId: inventoryAccount.id,
        createdBy: warehouseUser.id
      }
    })
  ])

  const [mainWarehouse, westWarehouse, nyStore] = locations

  // 6. Create Categories
  console.log('📁 Creating categories...')
  const electronicsCategory = await prisma.category.create({
    data: {
      code: 'ELEC',
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      createdBy: adminUser.id
    }
  })

  const computerCategory = await prisma.category.create({
    data: {
      code: 'COMP',
      name: 'Computers',
      description: 'Computers and peripherals',
      parentId: electronicsCategory.id,
      createdBy: adminUser.id
    }
  })

  const audioCategory = await prisma.category.create({
    data: {
      code: 'AUDIO',
      name: 'Audio Equipment',
      description: 'Audio devices and accessories',
      parentId: electronicsCategory.id,
      createdBy: adminUser.id
    }
  })

  const officeCategory = await prisma.category.create({
    data: {
      code: 'OFFICE',
      name: 'Office Supplies',
      description: 'Office supplies and stationery',
      createdBy: adminUser.id
    }
  })

  const furnitureCategory = await prisma.category.create({
    data: {
      code: 'FURN',
      name: 'Furniture',
      description: 'Office furniture',
      createdBy: adminUser.id
    }
  })

  const servicesCategory = await prisma.category.create({
    data: {
      code: 'SERV',
      name: 'Services',
      description: 'Professional services',
      createdBy: adminUser.id
    }
  })

  // 7. Create Items
  console.log('📦 Creating items...')
  const items = await Promise.all([
    // Electronics - Computers
    prisma.item.create({
      data: {
        code: 'LAP-001',
        name: 'Business Laptop Pro',
        description: 'High-performance business laptop with 16GB RAM, 512GB SSD',
        categoryId: computerCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 50,
        reorderPoint: 15,
        standardCost: 800,
        listPrice: 1299,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'MON-001',
        name: '27" Business Monitor',
        description: '27 inch 4K business monitor with USB-C',
        categoryId: computerCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 20,
        maxStockLevel: 100,
        reorderPoint: 30,
        standardCost: 250,
        listPrice: 399,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'KEY-001',
        name: 'Wireless Keyboard & Mouse Set',
        description: 'Ergonomic wireless keyboard and mouse combo',
        categoryId: computerCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 30,
        maxStockLevel: 150,
        reorderPoint: 50,
        standardCost: 35,
        listPrice: 59.99,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    // Electronics - Audio
    prisma.item.create({
      data: {
        code: 'HEAD-001',
        name: 'Noise-Canceling Headphones',
        description: 'Premium noise-canceling wireless headphones',
        categoryId: audioCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 15,
        maxStockLevel: 75,
        reorderPoint: 25,
        standardCost: 150,
        listPrice: 299,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'SPEAK-001',
        name: 'Conference Speaker',
        description: 'Bluetooth conference speaker with 360° audio',
        categoryId: audioCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 50,
        reorderPoint: 20,
        standardCost: 75,
        listPrice: 149,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    // Office Supplies
    prisma.item.create({
      data: {
        code: 'PEN-001',
        name: 'Premium Pen Set',
        description: 'Executive pen set (box of 12)',
        categoryId: officeCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'box',
        trackInventory: true,
        minStockLevel: 50,
        maxStockLevel: 200,
        reorderPoint: 75,
        standardCost: 8,
        listPrice: 15.99,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'PAP-001',
        name: 'A4 Paper Ream',
        description: 'Premium white A4 paper, 500 sheets',
        categoryId: officeCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 100,
        maxStockLevel: 500,
        reorderPoint: 150,
        standardCost: 3.5,
        listPrice: 6.99,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    // Furniture
    prisma.item.create({
      data: {
        code: 'DESK-001',
        name: 'Executive Desk',
        description: 'L-shaped executive desk with storage',
        categoryId: furnitureCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 5,
        maxStockLevel: 20,
        reorderPoint: 8,
        standardCost: 350,
        listPrice: 599,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'CHAIR-001',
        name: 'Ergonomic Office Chair',
        description: 'High-back ergonomic office chair with lumbar support',
        categoryId: furnitureCategory.id,
        type: 'PRODUCT',
        unitOfMeasureId: 'ea',
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 40,
        reorderPoint: 15,
        standardCost: 200,
        listPrice: 349,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    // Services
    prisma.item.create({
      data: {
        code: 'INST-001',
        name: 'Installation Service',
        description: 'Professional installation service',
        categoryId: servicesCategory.id,
        type: 'SERVICE',
        unitOfMeasureId: 'ea',
        trackInventory: false,
        standardCost: 50,
        listPrice: 99,
        salesAccountId: serviceRevenueAccount.id,
        createdBy: adminUser.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'TRAIN-001',
        name: 'Training Service (per hour)',
        description: 'Professional training service',
        categoryId: servicesCategory.id,
        type: 'SERVICE',
        unitOfMeasureId: 'ea',
        trackInventory: false,
        standardCost: 75,
        listPrice: 150,
        salesAccountId: serviceRevenueAccount.id,
        createdBy: adminUser.id
      }
    })
  ])

  // 8. Create Suppliers
  console.log('🏢 Creating suppliers...')
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        supplierNumber: 'SUP-001',
        name: 'TechPro Distributors',
        email: 'orders@techpro.com',
        phone: '+1 555-1001',
        website: 'www.techpro.com',
        address: '100 Tech Plaza, San Jose, CA 95110',
        taxId: 'TX-123456789',
        paymentTerms: 30,
        creditLimit: 100000,
        contactPerson: 'James Wilson',
        contactEmail: 'james@techpro.com',
        contactPhone: '+1 555-1001',
        createdBy: adminUser.id
      }
    }),
    prisma.supplier.create({
      data: {
        supplierNumber: 'SUP-002',
        name: 'Office World Supplies',
        email: 'purchasing@officeworld.com',
        phone: '+1 555-1002',
        website: 'www.officeworld.com',
        address: '200 Office Park, Chicago, IL 60601',
        taxId: 'TX-987654321',
        paymentTerms: 45,
        creditLimit: 50000,
        discount: 5,
        contactPerson: 'Mary Johnson',
        contactEmail: 'mary@officeworld.com',
        contactPhone: '+1 555-1002',
        isPreferred: true,
        createdBy: adminUser.id
      }
    }),
    prisma.supplier.create({
      data: {
        supplierNumber: 'SUP-003',
        name: 'Furniture Masters',
        email: 'sales@furnituremasters.com',
        phone: '+1 555-1003',
        website: 'www.furnituremasters.com',
        address: '300 Design Center, Grand Rapids, MI 49501',
        taxId: 'TX-456789123',
        paymentTerms: 60,
        creditLimit: 75000,
        contactPerson: 'Robert Brown',
        contactEmail: 'robert@furnituremasters.com',
        contactPhone: '+1 555-1003',
        createdBy: adminUser.id
      }
    })
  ])

  const [techProSupplier, officeWorldSupplier, furnitureMastersSupplier] = suppliers

  // 9. Create Initial Stock (Opening Balances)
  console.log('📈 Creating opening stock...')
  
  // Create opening balance journal entry
  const openingJournal = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-0001',
      date: new Date('2024-01-01'),
      description: 'Opening balances',
      status: 'POSTED',
      createdBy: accountantUser.id,
      postedBy: accountantUser.id,
      postedAt: new Date('2024-01-01')
    }
  })

  // Create stock lots for each item with inventory
  const stockLots = []
  const inventoryItems = items.filter(item => item.trackInventory)
  
  for (const item of inventoryItems) {
    let initialQty, unitCost
    
    // Determine initial quantity based on item type
    switch (item.code) {
      case 'LAP-001':
        initialQty = 25
        unitCost = item.standardCost
        break
      case 'MON-001':
        initialQty = 45
        unitCost = item.standardCost
        break
      case 'KEY-001':
        initialQty = 80
        unitCost = item.standardCost
        break
      case 'HEAD-001':
        initialQty = 35
        unitCost = item.standardCost
        break
      case 'SPEAK-001':
        initialQty = 25
        unitCost = item.standardCost
        break
      case 'PEN-001':
        initialQty = 100
        unitCost = item.standardCost
        break
      case 'PAP-001':
        initialQty = 250
        unitCost = item.standardCost
        break
      case 'DESK-001':
        initialQty = 12
        unitCost = item.standardCost
        break
      case 'CHAIR-001':
        initialQty = 20
        unitCost = item.standardCost
        break
      default:
        initialQty = 50
        unitCost = item.standardCost
    }

    const lot = await prisma.stockLot.create({
      data: {
        lotNumber: `LOT-${item.code}-001`,
        itemId: item.id,
        receivedDate: new Date('2024-01-01'),
        supplierName: 'Opening Balance',
        receivedQty: initialQty,
        availableQty: initialQty,
        unitCost: unitCost,
        totalCost: initialQty * unitCost,
        createdBy: warehouseUser.id
      }
    })
    stockLots.push(lot)

    // Create stock movement for opening balance
    await prisma.stockMovement.create({
      data: {
        movementNumber: `SM-OPEN-${item.code}`,
        itemId: item.id,
        stockLotId: lot.id,
        movementType: 'OPENING',
        movementDate: new Date('2024-01-01'),
        quantity: initialQty,
        unitCost: unitCost,
        totalCost: initialQty * unitCost,
        unitOfMeasureId: item.unitOfMeasureId,
        referenceType: 'OPENING',
        referenceNumber: 'Opening Balance',
        locationId: mainWarehouse.id,
        journalEntryId: openingJournal.id,
        notes: 'Opening balance',
        approvedBy: warehouseUser.id,
        approvedAt: new Date('2024-01-01'),
        createdBy: warehouseUser.id
      }
    })

    // Create inventory balance for main warehouse
    await prisma.inventoryBalance.create({
      data: {
        locationId: mainWarehouse.id,
        itemId: item.id,
        availableQuantity: initialQty,
        totalQuantity: initialQty,
        averageCost: unitCost,
        totalValue: initialQty * unitCost,
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel,
        reorderPoint: item.reorderPoint,
        lastMovementDate: new Date('2024-01-01')
      }
    })

    // Create location stock lot
    await prisma.locationStockLot.create({
      data: {
        locationId: mainWarehouse.id,
        stockLotId: lot.id,
        availableQty: initialQty,
        zone: 'A',
        aisle: Math.ceil(Math.random() * 10).toString(),
        shelf: Math.ceil(Math.random() * 5).toString()
      }
    })
  }

  // 10. Create Leads
  console.log('👥 Creating leads...')
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'Michael',
        lastName: 'Thompson',
        email: 'michael.thompson@techcorp.com',
        phone: '+1 555-2001',
        company: 'TechCorp Solutions',
        jobTitle: 'IT Director',
        source: 'WEBSITE',
        status: 'CONVERTED',
        notes: 'Interested in complete office setup',
        createdBy: salesUser.id
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Jennifer',
        lastName: 'Martinez',
        email: 'j.martinez@innovate.com',
        phone: '+1 555-2002',
        company: 'Innovate Industries',
        jobTitle: 'Procurement Manager',
        source: 'REFERRAL',
        status: 'CONVERTED',
        notes: 'Looking for long-term supplier partnership',
        createdBy: salesUser.id
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@globalfinance.com',
        phone: '+1 555-2003',
        company: 'Global Finance Ltd',
        jobTitle: 'Operations Manager',
        source: 'TRADE_SHOW',
        status: 'CONVERTED',
        notes: 'Met at Business Expo 2024',
        createdBy: salesUser.id
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa@startupventures.com',
        phone: '+1 555-2004',
        company: 'Startup Ventures',
        jobTitle: 'CEO',
        source: 'WEBSITE',
        status: 'QUALIFIED',
        notes: 'New startup, budget conscious',
        createdBy: salesUser.id
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Robert',
        lastName: 'Williams',
        email: 'r.williams@enterprise.com',
        phone: '+1 555-2005',
        company: 'Enterprise Solutions',
        jobTitle: 'Purchasing Agent',
        source: 'EMAIL_CAMPAIGN',
        status: 'PROPOSAL_SENT',
        notes: 'Requested detailed proposal',
        createdBy: salesUser.id
      }
    })
  ])

  // 11. Create Customers (from converted leads)
  console.log('🏢 Creating customers...')
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-001',
        name: 'TechCorp Solutions',
        email: 'orders@techcorp.com',
        phone: '+1 555-2001',
        industry: 'Technology',
        website: 'www.techcorp.com',
        address: '500 Tech Plaza, San Francisco, CA 94105',
        taxId: 'TC-123456789',
        creditLimit: 50000,
        paymentTerms: 30,
        leadId: leads[0].id,
        assignedToId: salesUser.id,
        assignedAt: new Date('2024-01-15'),
        assignedBy: managerUser.id,
        createdBy: salesUser.id
      }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-002',
        name: 'Innovate Industries',
        email: 'purchasing@innovate.com',
        phone: '+1 555-2002',
        industry: 'Manufacturing',
        website: 'www.innovate.com',
        address: '1000 Industrial Way, Detroit, MI 48201',
        taxId: 'II-987654321',
        creditLimit: 75000,
        paymentTerms: 45,
        leadId: leads[1].id,
        assignedToId: salesUser.id,
        assignedAt: new Date('2024-01-20'),
        assignedBy: managerUser.id,
        createdBy: salesUser.id
      }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-003',
        name: 'Global Finance Ltd',
        email: 'operations@globalfinance.com',
        phone: '+1 555-2003',
        industry: 'Financial Services',
        website: 'www.globalfinance.com',
        address: '200 Wall Street, New York, NY 10005',
        taxId: 'GF-456789123',
        creditLimit: 100000,
        paymentTerms: 30,
        currency: 'USD',
        leadId: leads[2].id,
        assignedToId: salesUser.id,
        assignedAt: new Date('2024-01-25'),
        assignedBy: managerUser.id,
        createdBy: salesUser.id
      }
    })
  ])

  const [techCorpCustomer, innovateCustomer, globalFinanceCustomer] = customers

  // 12. Create Sales Cases
  console.log('💼 Creating sales cases...')
  const salesCases = await Promise.all([
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-001',
        customerId: techCorpCustomer.id,
        title: 'Office Modernization Project',
        description: 'Complete office technology refresh for 50 employees',
        status: 'WON',
        estimatedValue: 75000,
        actualValue: 72500,
        cost: 45000,
        profitMargin: 37.93,
        createdBy: salesUser.id,
        assignedTo: salesUser.id,
        closedAt: new Date('2024-02-15')
      }
    }),
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-002',
        customerId: innovateCustomer.id,
        title: 'Warehouse Equipment Supply',
        description: 'Supply of computers and equipment for new warehouse',
        status: 'WON',
        estimatedValue: 45000,
        actualValue: 43500,
        cost: 28000,
        profitMargin: 35.63,
        createdBy: salesUser.id,
        assignedTo: salesUser.id,
        closedAt: new Date('2024-02-20')
      }
    }),
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-003',
        customerId: globalFinanceCustomer.id,
        title: 'Trading Floor Setup',
        description: 'High-performance workstations for trading floor',
        status: 'IN_PROGRESS',
        estimatedValue: 125000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        createdBy: salesUser.id,
        assignedTo: salesUser.id
      }
    }),
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-004',
        customerId: techCorpCustomer.id,
        title: 'Q2 Office Supplies',
        description: 'Quarterly office supplies order',
        status: 'OPEN',
        estimatedValue: 5000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        createdBy: salesUser.id,
        assignedTo: salesUser.id
      }
    })
  ])

  const [techCorpCase1, innovateCase, globalFinanceCase, techCorpCase2] = salesCases

  console.log('✅ Comprehensive accounting seed completed successfully!')
  console.log('📊 Summary:')
  console.log(`- Users: ${users.length}`)
  console.log(`- Accounts: 25+ chart of accounts`)
  console.log(`- Categories: 6`)
  console.log(`- Items: ${items.length}`)
  console.log(`- Suppliers: ${suppliers.length}`)
  console.log(`- Customers: ${customers.length}`)
  console.log(`- Locations: ${locations.length}`)
  console.log(`- Opening Stock: ${stockLots.length} lots`)
  console.log(`- Sales Cases: ${salesCases.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })