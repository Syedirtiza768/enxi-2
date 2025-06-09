const { PrismaClient } = require('../lib/generated/prisma')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting UAE Diesel Engine Maintenance Company seed...')

  try {
    // Clean existing data
    console.log('Cleaning existing data...')
    
    // Clean in reverse order of dependencies
    try {
      await prisma.auditLog.deleteMany()
      await prisma.journalLine.deleteMany()
      await prisma.journalEntry.deleteMany()
    } catch (e) {
      console.log('Journal tables cleanup skipped')
    }
    
    try {
      await prisma.supplierPayment.deleteMany()
      await prisma.supplierInvoiceItem.deleteMany()
      await prisma.supplierInvoice.deleteMany()
      await prisma.goodsReceiptItem.deleteMany()
      await prisma.goodsReceipt.deleteMany()
      await prisma.purchaseOrderItem.deleteMany()
      await prisma.purchaseOrder.deleteMany()
    } catch (e) {
      console.log('Procurement tables cleanup skipped')
    }
    
    try {
      await prisma.quotationItem.deleteMany()
      await prisma.quotationVersion.deleteMany()
      await prisma.quotation.deleteMany()
      await prisma.salesCaseUpdate.deleteMany()
      await prisma.salesCase.deleteMany()
    } catch (e) {
      console.log('Sales tables cleanup skipped')
    }
    
    try {
      await prisma.stockMovement.deleteMany()
      await prisma.stockLot.deleteMany()
      await prisma.item.deleteMany()
      await prisma.category.deleteMany()
      await prisma.unitOfMeasure.deleteMany()
    } catch (e) {
      console.log('Inventory tables cleanup skipped')
    }
    
    // Clean up user-related tables first
    await prisma.userPermission.deleteMany()
    await prisma.userSession.deleteMany()
    await prisma.userProfile.deleteMany()
    await prisma.salesTeamMember.deleteMany()
    await prisma.auditLog.deleteMany()
    
    // Clean up business entities
    await prisma.lead.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.supplier.deleteMany()
    await prisma.account.deleteMany()
    
    // Finally delete users
    await prisma.user.deleteMany()
    
    console.log('✅ Cleaned existing data')

    // Create users
    const hashedPassword = await bcrypt.hash('DieselUAE2024!', 10)

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@dieseluae.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        profile: {
          create: {
            firstName: 'Ahmed',
            lastName: 'Al Rashid',
            department: 'Management',
            jobTitle: 'Administrator'
          }
        }
      }
    })

    const salesManager = await prisma.user.create({
      data: {
        username: 'sales_manager',
        email: 'sales@dieseluae.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'Mohammed',
            lastName: 'Al Maktoum',
            department: 'Sales',
            jobTitle: 'Sales Manager'
          }
        }
      }
    })

    const serviceTech = await prisma.user.create({
      data: {
        username: 'service_tech',
        email: 'service@dieseluae.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'Khalid',
            lastName: 'Al Nahyan',
            department: 'Service',
            jobTitle: 'Service Technician'
          }
        }
      }
    })

    const accountant = await prisma.user.create({
      data: {
        username: 'accountant',
        email: 'accounts@dieseluae.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'Fatima',
            lastName: 'Al Qassimi',
            department: 'Finance',
            jobTitle: 'Accountant'
          }
        }
      }
    })

    const warehouse = await prisma.user.create({
      data: {
        username: 'warehouse',
        email: 'warehouse@dieseluae.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'Omar',
            lastName: 'Al Sharqi',
            department: 'Warehouse',
            jobTitle: 'Warehouse Manager'
          }
        }
      }
    })

    console.log('✅ Created users')

    // Create basic accounts
    const cash = await prisma.account.create({
      data: {
        code: '1000',
        name: 'Cash - AED',
        type: 'ASSET',
        description: 'Cash and cash equivalents in AED',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const bankUAE = await prisma.account.create({
      data: {
        code: '1100',
        name: 'Emirates NBD - Current Account',
        type: 'ASSET',
        description: 'Main operating account',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const accountsReceivable = await prisma.account.create({
      data: {
        code: '1200',
        name: 'Accounts Receivable - Trade',
        type: 'ASSET',
        description: 'Customer receivables',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const inventory = await prisma.account.create({
      data: {
        code: '1300',
        name: 'Inventory - Spare Parts',
        type: 'ASSET',
        description: 'Diesel engine spare parts inventory',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const accountsPayable = await prisma.account.create({
      data: {
        code: '2000',
        name: 'Accounts Payable - Suppliers',
        type: 'LIABILITY',
        description: 'Supplier payables',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const serviceRevenue = await prisma.account.create({
      data: {
        code: '4000',
        name: 'Service Revenue - Maintenance',
        type: 'INCOME',
        description: 'Revenue from maintenance services',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const partsRevenue = await prisma.account.create({
      data: {
        code: '4100',
        name: 'Parts Sales Revenue',
        type: 'INCOME',
        description: 'Revenue from spare parts sales',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    const cogs = await prisma.account.create({
      data: {
        code: '5000',
        name: 'Cost of Parts Sold',
        type: 'EXPENSE',
        description: 'Cost of spare parts sold',
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    console.log('✅ Created chart of accounts')

    // Create a sample customer
    const dpWorld = await prisma.customer.create({
      data: {
        customerNumber: 'CUST-001',
        companyName: 'DP World - Jebel Ali',
        tradeName: 'DP World',
        taxId: '100123456789012',
        email: 'maintenance@dpworld.com',
        phone: '+971 4 881 5000',
        website: 'https://www.dpworld.com',
        address: 'Jebel Ali Port, Dubai, UAE',
        industry: 'Ports & Logistics',
        numberOfEmployees: 5000,
        annualRevenue: 8000000000, // 8 billion AED
        creditLimit: 2000000, // 2 million AED
        paymentTerms: 60,
        currency: 'AED',
        status: 'ACTIVE',
        createdBy: admin.id
      }
    })

    console.log('✅ Created sample customer')

    // Create a sample supplier
    const cumminsArabia = await prisma.supplier.create({
      data: {
        supplierNumber: 'SUP-001',
        name: 'Cummins Arabia FZE',
        email: 'sales@cumminsarabia.ae',
        phone: '+971 4 885 7777',
        address: 'Jebel Ali Free Zone, Dubai, UAE',
        currency: 'AED',
        paymentTerms: 30,
        creditLimit: 500000,
        taxId: '100334567890003',
        bankName: 'Standard Chartered',
        bankAccount: 'AE070330000010123456789',
        contactPerson: 'Rashid Ahmed',
        contactEmail: 'rashid@cumminsarabia.ae',
        contactPhone: '+971 50 123 4567',
        accountId: accountsPayable.id,
        status: 'ACTIVE',
        isPreferred: true,
        createdBy: admin.id
      }
    })

    console.log('✅ Created sample supplier')

    // Create units of measure
    const pieces = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS',
        name: 'Pieces',
        symbol: 'pcs',
        isBaseUnit: true,
        createdBy: admin.id
      }
    })

    const liter = await prisma.unitOfMeasure.create({
      data: {
        code: 'L',
        name: 'Liter',
        symbol: 'L',
        isBaseUnit: true,
        createdBy: admin.id
      }
    })

    const hour = await prisma.unitOfMeasure.create({
      data: {
        code: 'HR',
        name: 'Hour',
        symbol: 'hr',
        isBaseUnit: true,
        createdBy: admin.id
      }
    })

    console.log('✅ Created units of measure')

    // Create categories
    const engineParts = await prisma.category.create({
      data: {
        code: 'ENGINE',
        name: 'Engine Components',
        description: 'Diesel engine internal components',
        createdBy: admin.id
      }
    })

    const services = await prisma.category.create({
      data: {
        code: 'SERVICE',
        name: 'Services',
        description: 'Maintenance and repair services',
        createdBy: admin.id
      }
    })

    console.log('✅ Created categories')

    // Create sample items
    const oilFilter = await prisma.item.create({
      data: {
        code: 'FLT-001',
        name: 'Cummins Oil Filter LF9009',
        description: 'Heavy duty oil filter for Cummins ISX engines',
        categoryId: engineParts.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 100,
        standardCost: 85, // 85 AED
        listPrice: 120, // 120 AED
        inventoryAccountId: inventory.id,
        cogsAccountId: cogs.id,
        salesAccountId: partsRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: admin.id
      }
    })

    const preventiveMaintenance = await prisma.item.create({
      data: {
        code: 'SRV-001',
        name: 'Preventive Maintenance - 250 Hours',
        description: '250-hour preventive maintenance service for diesel engines',
        categoryId: services.id,
        type: 'SERVICE',
        unitOfMeasureId: hour.id,
        trackInventory: false,
        standardCost: 800, // 800 AED per service
        listPrice: 1200, // 1,200 AED per service
        salesAccountId: serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: admin.id
      }
    })

    console.log('✅ Created sample items')

    console.log('\n🎉 UAE Diesel Engine Maintenance seed completed successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('Admin: username: admin, password: DieselUAE2024!')
    console.log('Sales Manager: username: sales_manager, password: DieselUAE2024!')
    console.log('Service Tech: username: service_tech, password: DieselUAE2024!')
    console.log('Accountant: username: accountant, password: DieselUAE2024!')
    console.log('Warehouse: username: warehouse, password: DieselUAE2024!')

  } catch (error) {
    console.error('❌ Seed error:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })