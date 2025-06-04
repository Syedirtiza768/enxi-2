import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Edge case customer scenarios
const EDGE_CASE_SCENARIOS = [
  {
    name: 'Zero Balance Customer',
    description: 'Customer with perfect payment history, no outstanding balance',
    currentBalance: 0,
    creditLimit: 25000,
    invoiceCount: 12,
    paymentReliability: 1.0,
    avgPaymentDays: 5
  },
  {
    name: 'Over Credit Limit',
    description: 'Customer significantly over their credit limit',
    currentBalance: 55000,
    creditLimit: 25000,
    invoiceCount: 25,
    paymentReliability: 0.3,
    avgPaymentDays: 90
  },
  {
    name: 'Maxed Credit Customer',
    description: 'Customer at exactly their credit limit',
    currentBalance: 50000,
    creditLimit: 50000,
    invoiceCount: 20,
    paymentReliability: 0.6,
    avgPaymentDays: 45
  },
  {
    name: 'Micro Transactions',
    description: 'Customer with many small transactions',
    currentBalance: 156.78,
    creditLimit: 1000,
    invoiceCount: 50,
    paymentReliability: 0.95,
    avgPaymentDays: 12
  },
  {
    name: 'Mega Customer',
    description: 'Very large enterprise customer',
    currentBalance: 2500000,
    creditLimit: 5000000,
    invoiceCount: 100,
    paymentReliability: 0.85,
    avgPaymentDays: 60
  },
  {
    name: 'Seasonal Customer',
    description: 'Customer active only during specific seasons',
    currentBalance: 15000,
    creditLimit: 30000,
    invoiceCount: 8,
    paymentReliability: 0.9,
    avgPaymentDays: 20
  },
  {
    name: 'Disputed Invoices',
    description: 'Customer with many disputed invoices',
    currentBalance: 45000,
    creditLimit: 100000,
    invoiceCount: 15,
    paymentReliability: 0.4,
    avgPaymentDays: 120
  },
  {
    name: 'Partial Payment Expert',
    description: 'Customer who always pays in many small installments',
    currentBalance: 8500,
    creditLimit: 25000,
    invoiceCount: 10,
    paymentReliability: 0.95,
    avgPaymentDays: 35
  },
  {
    name: 'Ancient Customer',
    description: 'Customer with 10+ year relationship and complex history',
    currentBalance: 125000,
    creditLimit: 200000,
    invoiceCount: 200,
    paymentReliability: 0.78,
    avgPaymentDays: 42
  },
  {
    name: 'International Currency',
    description: 'Customer dealing in multiple currencies (simulated)',
    currentBalance: 75432.21,
    creditLimit: 150000,
    invoiceCount: 35,
    paymentReliability: 0.82,
    avgPaymentDays: 28
  },
  {
    name: 'Non-Profit Organization',
    description: 'Non-profit with grant-based payments',
    currentBalance: 12500,
    creditLimit: 50000,
    invoiceCount: 6,
    paymentReliability: 0.67,
    avgPaymentDays: 75
  },
  {
    name: 'Government Entity',
    description: 'Government customer with slow payment processes',
    currentBalance: 450000,
    creditLimit: 1000000,
    invoiceCount: 24,
    paymentReliability: 0.95,
    avgPaymentDays: 90
  },
  {
    name: 'Startup Customer',
    description: 'New startup with erratic payment patterns',
    currentBalance: 25000,
    creditLimit: 15000,
    invoiceCount: 8,
    paymentReliability: 0.5,
    avgPaymentDays: 55
  },
  {
    name: 'Collection Case',
    description: 'Customer currently in collections',
    currentBalance: 85000,
    creditLimit: 50000,
    invoiceCount: 20,
    paymentReliability: 0.2,
    avgPaymentDays: 180
  },
  {
    name: 'VIP Customer',
    description: 'High-value customer with special terms',
    currentBalance: 350000,
    creditLimit: 2000000,
    invoiceCount: 60,
    paymentReliability: 0.98,
    avgPaymentDays: 15
  }
]

async function createEdgeCaseCustomers() {
  console.log('🔍 Creating edge case customers...')
  
  const edgeCustomers = []
  
  for (let i = 0; i < EDGE_CASE_SCENARIOS.length; i++) {
    const scenario = EDGE_CASE_SCENARIOS[i]
    
    // Create customer record date based on scenario
    let createdAt: Date
    if (scenario.name === 'Ancient Customer') {
      createdAt = new Date('2014-01-01')
    } else if (scenario.name === 'Startup Customer') {
      createdAt = new Date('2024-06-01')
    } else if (scenario.name === 'Seasonal Customer') {
      createdAt = new Date('2023-11-01') // Started during holiday season
    } else {
      createdAt = faker.date.between({ 
        from: new Date('2022-01-01'), 
        to: new Date('2024-01-01') 
      })
    }
    
    const customerData = {
      id: `edge-customer-${i + 1}`,
      name: `${scenario.name} Corp`,
      email: `contact@${scenario.name.toLowerCase().replace(/ /g, '')}.example.com`,
      phone: faker.phone.number(),
      industry: getIndustryForScenario(scenario.name),
      leadSource: getLeadSourceForScenario(scenario.name),
      creditLimit: scenario.creditLimit,
      currentBalance: scenario.currentBalance,
      createdAt,
      scenario
    }
    
    try {
      await prisma.customer.upsert({
        where: { id: customerData.id },
        update: {},
        create: {
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          industry: customerData.industry,
          leadSource: customerData.leadSource as any,
          creditLimit: customerData.creditLimit,
          currentBalance: customerData.currentBalance,
          createdAt: customerData.createdAt,
          updatedAt: customerData.createdAt
        }
      })
      
      edgeCustomers.push(customerData)
    } catch (error) {
      console.log(`Edge case customer ${customerData.name} might already exist, continuing...`)
    }
  }
  
  console.log(`✅ Created ${edgeCustomers.length} edge case customers`)
  return edgeCustomers
}

function getIndustryForScenario(scenarioName: string): string {
  const industryMap: { [key: string]: string } = {
    'Zero Balance Customer': 'Technology',
    'Over Credit Limit': 'Retail',
    'Maxed Credit Customer': 'Manufacturing',
    'Micro Transactions': 'Food & Beverage',
    'Mega Customer': 'Aerospace',
    'Seasonal Customer': 'Hospitality',
    'Disputed Invoices': 'Construction',
    'Partial Payment Expert': 'Healthcare',
    'Ancient Customer': 'Finance',
    'International Currency': 'Import/Export',
    'Non-Profit Organization': 'Non-Profit',
    'Government Entity': 'Government',
    'Startup Customer': 'Technology',
    'Collection Case': 'Retail',
    'VIP Customer': 'Pharmaceuticals'
  }
  
  return industryMap[scenarioName] || 'Technology'
}

function getLeadSourceForScenario(scenarioName: string): string {
  const leadSourceMap: { [key: string]: string } = {
    'Zero Balance Customer': 'REFERRAL',
    'Over Credit Limit': 'WEBSITE',
    'Maxed Credit Customer': 'PHONE_CALL',
    'Micro Transactions': 'SOCIAL_MEDIA',
    'Mega Customer': 'TRADE_SHOW',
    'Seasonal Customer': 'ADVERTISING',
    'Disputed Invoices': 'EMAIL',
    'Partial Payment Expert': 'REFERRAL',
    'Ancient Customer': 'PHONE_CALL',
    'International Currency': 'TRADE_SHOW',
    'Non-Profit Organization': 'REFERRAL',
    'Government Entity': 'DIRECT_MAIL',
    'Startup Customer': 'SOCIAL_MEDIA',
    'Collection Case': 'WEBSITE',
    'VIP Customer': 'REFERRAL'
  }
  
  return leadSourceMap[scenarioName] || 'WEBSITE'
}

async function createEdgeCaseInvoices(edgeCustomers: any[], users: any[]) {
  console.log('📄 Creating edge case invoices...')
  
  const accountants = users.filter(u => u.role === 'accountant' || u.role === 'admin')
  let invoiceCounter = 20000 // Start from high number to avoid conflicts
  
  for (const customer of edgeCustomers) {
    const scenario = customer.scenario
    
    for (let i = 0; i < scenario.invoiceCount; i++) {
      const invoiceDate = generateInvoiceDateForScenario(customer, i, scenario)
      const amount = generateInvoiceAmountForScenario(scenario, i)
      const description = generateInvoiceDescriptionForScenario(scenario, i)
      
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 30)
      
      // Determine status based on scenario
      const status = determineInvoiceStatus(scenario, invoiceDate, dueDate)
      
      try {
        const accountant = accountants[faker.number.int({ min: 0, max: accountants.length - 1 })]
        
        await prisma.invoice.create({
          data: {
            id: `edge-invoice-${invoiceCounter}`,
            number: `INV-EDGE-${String(invoiceCounter).padStart(6, '0')}`,
            customerId: customer.id,
            amount,
            description,
            status,
            dueDate,
            createdAt: invoiceDate,
            updatedAt: invoiceDate,
            createdBy: accountant.id
          }
        })
        
        invoiceCounter++
      } catch (error) {
        console.log(`Edge case invoice ${invoiceCounter} might already exist, continuing...`)
      }
    }
  }
  
  console.log(`✅ Created edge case invoices`)
}

function generateInvoiceDateForScenario(customer: any, invoiceIndex: number, scenario: any): Date {
  const baseDate = new Date(customer.createdAt)
  
  if (scenario.name === 'Ancient Customer') {
    // Spread invoices over 10 years
    const monthsToAdd = Math.floor(invoiceIndex * 0.6) // Roughly every 18 days
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd)
  } else if (scenario.name === 'Seasonal Customer') {
    // Only create invoices during Q4 (Oct-Dec)
    const year = baseDate.getFullYear() + Math.floor(invoiceIndex / 3)
    const month = 10 + (invoiceIndex % 3) // Oct, Nov, Dec
    return new Date(year, month, faker.number.int({ min: 1, max: 28 }))
  } else if (scenario.name === 'Micro Transactions') {
    // Frequent small invoices
    const daysToAdd = invoiceIndex * 7 // Weekly invoices
    baseDate.setDate(baseDate.getDate() + daysToAdd)
  } else if (scenario.name === 'Mega Customer') {
    // Large monthly invoices
    const monthsToAdd = Math.floor(invoiceIndex * 0.8)
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd)
  } else {
    // Regular pattern
    const monthsToAdd = Math.floor(invoiceIndex / 2)
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd)
  }
  
  return baseDate
}

function generateInvoiceAmountForScenario(scenario: any, invoiceIndex: number): number {
  switch (scenario.name) {
    case 'Micro Transactions':
      return faker.number.float({ min: 1.99, max: 49.99, multipleOf: 0.01 })
    
    case 'Mega Customer':
      return faker.number.int({ min: 50000, max: 500000 })
    
    case 'VIP Customer':
      return faker.number.int({ min: 25000, max: 150000 })
    
    case 'Government Entity':
      return faker.number.int({ min: 75000, max: 250000 })
    
    case 'Non-Profit Organization':
      return faker.number.int({ min: 2500, max: 15000 })
    
    case 'International Currency':
      // Simulate currency conversion variations
      const baseAmount = faker.number.int({ min: 5000, max: 25000 })
      const exchangeRate = faker.number.float({ min: 0.85, max: 1.15 })
      return Math.round(baseAmount * exchangeRate * 100) / 100
    
    default:
      return faker.number.int({ min: 1000, max: 25000 })
  }
}

function generateInvoiceDescriptionForScenario(scenario: any, invoiceIndex: number): string {
  const baseDescriptions: { [key: string]: string[] } = {
    'Micro Transactions': [
      'Small Service Fee', 'Transaction Processing', 'Micro Consultation',
      'Quick Fix', 'Mini Support Session'
    ],
    'Mega Customer': [
      'Enterprise Solution Development', 'Large Scale Implementation',
      'Corporate Training Program', 'System Integration Project'
    ],
    'Seasonal Customer': [
      'Holiday Campaign Development', 'Black Friday Preparation',
      'Christmas Marketing Materials', 'New Year System Updates'
    ],
    'Disputed Invoices': [
      'Disputed Service Charges', 'Contested Development Work',
      'Questioned Consulting Hours', 'Under Review - Support Services'
    ],
    'Government Entity': [
      'Government Contract - Phase 1', 'Federal Project Implementation',
      'Public Sector Consulting', 'Compliance Audit Services'
    ],
    'Non-Profit Organization': [
      'Donor Management System', 'Volunteer Portal Development',
      'Fundraising Campaign Support', 'Non-Profit CRM Setup'
    ]
  }
  
  const descriptions = baseDescriptions[scenario.name] || [
    'Professional Services', 'Consulting Work', 'Development Services',
    'Technical Support', 'Project Implementation'
  ]
  
  const description = descriptions[invoiceIndex % descriptions.length]
  const month = faker.date.month()
  const year = new Date().getFullYear()
  
  return `${description} - ${month} ${year}`
}

function determineInvoiceStatus(scenario: any, invoiceDate: Date, dueDate: Date): string {
  const now = new Date()
  const daysPastDue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Future invoices are sent
  if (invoiceDate > now) return 'draft'
  
  // Apply scenario-specific logic
  switch (scenario.name) {
    case 'Zero Balance Customer':
      return daysPastDue <= 0 ? 'sent' : 'paid'
    
    case 'Over Credit Limit':
    case 'Collection Case':
      return daysPastDue > 60 ? 'overdue' : 'sent'
    
    case 'Disputed Invoices':
      return Math.random() < 0.6 ? 'overdue' : 'sent'
    
    case 'VIP Customer':
      return daysPastDue <= scenario.avgPaymentDays ? 'sent' : 'paid'
    
    default:
      if (daysPastDue <= 0) return 'sent'
      if (daysPastDue <= scenario.avgPaymentDays) {
        return Math.random() < scenario.paymentReliability ? 'paid' : 'sent'
      }
      return Math.random() < (scenario.paymentReliability * 0.5) ? 'paid' : 'overdue'
  }
}

async function createEdgeCasePayments(edgeCustomers: any[], users: any[]) {
  console.log('💳 Creating edge case payments...')
  
  const accountants = users.filter(u => u.role === 'accountant' || u.role === 'admin')
  let paymentCounter = 30000 // Start from high number
  
  for (const customer of edgeCustomers) {
    const customerInvoices = await prisma.invoice.findMany({
      where: { customerId: customer.id }
    })
    
    for (const invoice of customerInvoices) {
      if (invoice.status === 'paid' || 
          (invoice.status === 'overdue' && Math.random() < 0.3)) {
        
        const payments = generateEdgeCasePaymentPattern(invoice, customer.scenario)
        
        for (const paymentData of payments) {
          const paymentDate = new Date(invoice.createdAt)
          paymentDate.setDate(paymentDate.getDate() + paymentData.daysAfterInvoice)
          
          if (paymentDate <= new Date()) {
            try {
              const accountant = accountants[faker.number.int({ min: 0, max: accountants.length - 1 })]
              
              await prisma.payment.create({
                data: {
                  id: `edge-payment-${paymentCounter}`,
                  invoiceId: invoice.id,
                  amount: paymentData.amount,
                  paymentMethod: paymentData.method as any,
                  description: paymentData.description,
                  paymentDate,
                  createdAt: paymentDate,
                  updatedAt: paymentDate,
                  createdBy: accountant.id
                }
              })
              
              paymentCounter++
            } catch (error) {
              console.log(`Edge case payment ${paymentCounter} might already exist, continuing...`)
            }
          }
        }
      }
    }
  }
  
  console.log(`✅ Created edge case payments`)
}

function generateEdgeCasePaymentPattern(invoice: any, scenario: any) {
  const patterns = []
  const amount = invoice.amount
  
  switch (scenario.name) {
    case 'Zero Balance Customer':
      // Always pays in full, early
      patterns.push({
        amount: amount,
        daysAfterInvoice: faker.number.int({ min: 5, max: 15 }),
        method: 'bank_transfer',
        description: 'Full payment - early'
      })
      break
    
    case 'Micro Transactions':
      // Small amounts, quick payment
      patterns.push({
        amount: amount,
        daysAfterInvoice: faker.number.int({ min: 1, max: 7 }),
        method: 'credit_card',
        description: 'Quick payment'
      })
      break
    
    case 'Mega Customer':
      // Large amounts, structured payments
      if (amount > 100000) {
        // Split into 3 payments
        patterns.push({
          amount: amount * 0.5,
          daysAfterInvoice: 30,
          method: 'wire_transfer',
          description: 'Initial payment 1/3'
        })
        patterns.push({
          amount: amount * 0.3,
          daysAfterInvoice: 45,
          method: 'wire_transfer',
          description: 'Progress payment 2/3'
        })
        patterns.push({
          amount: amount * 0.2,
          daysAfterInvoice: 60,
          method: 'wire_transfer',
          description: 'Final payment 3/3'
        })
      } else {
        patterns.push({
          amount: amount,
          daysAfterInvoice: faker.number.int({ min: 45, max: 60 }),
          method: 'wire_transfer',
          description: 'Enterprise payment'
        })
      }
      break
    
    case 'Partial Payment Expert':
      // Always pays in many small installments
      const numPayments = faker.number.int({ min: 5, max: 12 })
      for (let i = 0; i < numPayments; i++) {
        const paymentAmount = i === numPayments - 1 ? 
          amount - patterns.reduce((sum, p) => sum + p.amount, 0) :
          amount / numPayments
        
        patterns.push({
          amount: paymentAmount,
          daysAfterInvoice: 20 + (i * 3),
          method: i % 2 === 0 ? 'check' : 'bank_transfer',
          description: `Installment ${i + 1}/${numPayments}`
        })
      }
      break
    
    case 'Government Entity':
      // Slow but reliable, often partial initially
      patterns.push({
        amount: amount * 0.7,
        daysAfterInvoice: 75,
        method: 'ach',
        description: 'Government partial payment'
      })
      patterns.push({
        amount: amount * 0.3,
        daysAfterInvoice: 90,
        method: 'ach',
        description: 'Government final payment'
      })
      break
    
    case 'International Currency':
      // Payments with slight variations due to exchange rates
      const exchangeVariation = faker.number.float({ min: 0.98, max: 1.02 })
      patterns.push({
        amount: Math.round(amount * exchangeVariation * 100) / 100,
        daysAfterInvoice: faker.number.int({ min: 25, max: 35 }),
        method: 'wire_transfer',
        description: 'International payment (exchange rate adjusted)'
      })
      break
    
    case 'VIP Customer':
      // Fast, full payments
      patterns.push({
        amount: amount,
        daysAfterInvoice: faker.number.int({ min: 10, max: 20 }),
        method: 'wire_transfer',
        description: 'VIP priority payment'
      })
      break
    
    default:
      // Standard pattern based on reliability
      if (Math.random() < scenario.paymentReliability) {
        patterns.push({
          amount: amount,
          daysAfterInvoice: scenario.avgPaymentDays + faker.number.int({ min: -10, max: 20 }),
          method: faker.helpers.arrayElement(['bank_transfer', 'check', 'wire_transfer']),
          description: 'Standard payment'
        })
      }
      break
  }
  
  return patterns
}

async function createStressTestData() {
  console.log('🔥 Creating stress test data...')
  
  // Create customer with 1000+ transactions
  const stressCustomer = {
    id: 'stress-test-customer',
    name: 'Stress Test Mega Corp',
    email: 'stress@test.example.com',
    phone: '+1-555-STRESS',
    industry: 'Technology',
    leadSource: 'STRESS_TEST',
    creditLimit: 10000000,
    currentBalance: 2500000,
    createdAt: new Date('2020-01-01')
  }
  
  try {
    await prisma.customer.upsert({
      where: { id: stressCustomer.id },
      update: {},
      create: stressCustomer as any
    })
  } catch (error) {
    console.log('Stress test customer might already exist, continuing...')
  }
  
  // Create 1000 invoices for stress testing
  const stressInvoices = []
  for (let i = 0; i < 1000; i++) {
    const invoiceDate = faker.date.between({
      from: new Date('2020-01-01'),
      to: new Date()
    })
    
    stressInvoices.push({
      id: `stress-invoice-${i}`,
      number: `STR-${String(i).padStart(4, '0')}`,
      customerId: stressCustomer.id,
      amount: faker.number.int({ min: 100, max: 50000 }),
      description: `Stress Test Transaction #${i}`,
      status: faker.helpers.arrayElement(['paid', 'sent', 'overdue']),
      dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: invoiceDate,
      updatedAt: invoiceDate,
      createdBy: 'admin-user-id'
    })
  }
  
  // Batch create invoices
  try {
    await prisma.invoice.createMany({
      data: stressInvoices as any,
      skipDuplicates: true
    })
  } catch (error) {
    console.log('Some stress test invoices might already exist, continuing...')
  }
  
  console.log('✅ Created stress test data (1000+ transactions)')
}

export async function seedEdgeCases() {
  try {
    console.log('🚀 Starting edge cases and stress test seeding...')
    
    // Get existing users
    const users = await prisma.user.findMany()
    if (users.length === 0) {
      throw new Error('No users found. Please run the main seed script first.')
    }
    
    // Create edge case customers
    const edgeCustomers = await createEdgeCaseCustomers()
    
    // Create edge case invoices
    await createEdgeCaseInvoices(edgeCustomers, users)
    
    // Create edge case payments
    await createEdgeCasePayments(edgeCustomers, users)
    
    // Create stress test data
    await createStressTestData()
    
    console.log('✅ Edge cases and stress test seeding completed!')
    
  } catch (error) {
    console.error('❌ Error during edge case seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedEdgeCases()
    .catch(console.error)
}