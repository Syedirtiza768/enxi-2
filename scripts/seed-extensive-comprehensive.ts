import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Comprehensive industry and business types
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 
  'Construction', 'Real Estate', 'Education', 'Hospitality', 'Transportation',
  'Energy', 'Agriculture', 'Media', 'Telecommunications', 'Automotive',
  'Aerospace', 'Pharmaceuticals', 'Food & Beverage', 'Textiles', 'Mining',
  'Chemical', 'Entertainment', 'Sports', 'Non-Profit', 'Government'
]

const LEAD_SOURCES = [
  'WEBSITE', 'PHONE_CALL', 'EMAIL', 'REFERRAL', 'SOCIAL_MEDIA', 
  'TRADE_SHOW', 'ADVERTISING', 'DIRECT_MAIL', 'SEO', 'CONTENT_MARKETING'
]

const PAYMENT_METHODS = [
  'cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 
  'wire_transfer', 'ach', 'paypal', 'crypto', 'money_order'
]

const SERVICE_TYPES = [
  'Software Development', 'Consulting Services', 'Technical Support', 'Design Services',
  'Marketing Campaign', 'SEO Optimization', 'Data Analysis', 'Cloud Migration',
  'Security Audit', 'Training Program', 'Maintenance Contract', 'License Renewal',
  'Custom Integration', 'API Development', 'Mobile App Development', 'Web Development',
  'Database Management', 'DevOps Services', 'Quality Assurance', 'Project Management',
  'Business Analysis', 'Digital Transformation', 'E-commerce Platform', 'CRM Implementation',
  'ERP Integration', 'AI/ML Solutions', 'Blockchain Development', 'IoT Implementation'
]

// Customer behavior patterns
const CUSTOMER_PROFILES = [
  {
    name: 'Excellent Payer',
    paymentReliability: 0.95,
    avgPaymentDays: 8,
    creditUtilization: 0.15,
    invoiceFrequency: 'high',
    paymentPattern: 'consistent_early'
  },
  {
    name: 'Good Payer',
    paymentReliability: 0.85,
    avgPaymentDays: 18,
    creditUtilization: 0.35,
    invoiceFrequency: 'medium',
    paymentPattern: 'mostly_on_time'
  },
  {
    name: 'Average Payer',
    paymentReliability: 0.75,
    avgPaymentDays: 28,
    creditUtilization: 0.55,
    invoiceFrequency: 'medium',
    paymentPattern: 'mixed'
  },
  {
    name: 'Slow Payer',
    paymentReliability: 0.65,
    avgPaymentDays: 45,
    creditUtilization: 0.75,
    invoiceFrequency: 'low',
    paymentPattern: 'often_late'
  },
  {
    name: 'Problem Payer',
    paymentReliability: 0.45,
    avgPaymentDays: 65,
    creditUtilization: 0.90,
    invoiceFrequency: 'low',
    paymentPattern: 'unreliable'
  }
]

interface CustomerData {
  id: string
  name: string
  email: string
  phone: string
  industry: string
  leadSource: string
  creditLimit: number
  profile: typeof CUSTOMER_PROFILES[0]
  createdAt: Date
}

interface InvoiceData {
  id: string
  number: string
  customerId: string
  amount: number
  description: string
  dueDate: Date
  createdAt: Date
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

async function createComprehensiveUsers(): Promise<T> {
  console.warn('🔧 Creating comprehensive user accounts...')
  
  const users = [
    // Admin users
    { email: 'admin@enxi.com', name: 'System Administrator', role: 'admin' },
    { email: 'finance@enxi.com', name: 'Finance Manager', role: 'finance' },
    { email: 'sales@enxi.com', name: 'Sales Manager', role: 'sales' },
    
    // Accountants
    { email: 'accountant1@enxi.com', name: 'Sarah Johnson', role: 'accountant' },
    { email: 'accountant2@enxi.com', name: 'Michael Chen', role: 'accountant' },
    { email: 'accountant3@enxi.com', name: 'Emily Rodriguez', role: 'accountant' },
    
    // Customer service
    { email: 'support1@enxi.com', name: 'David Wilson', role: 'support' },
    { email: 'support2@enxi.com', name: 'Lisa Thompson', role: 'support' },
    
    // Sales team
    { email: 'sales1@enxi.com', name: 'Robert Martinez', role: 'sales' },
    { email: 'sales2@enxi.com', name: 'Jennifer Lee', role: 'sales' },
    { email: 'sales3@enxi.com', name: 'Christopher Brown', role: 'sales' },
  ]

  const createdUsers = []
  for (const userData of users) {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          name: userData.name,
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
          role: userData.role as any,
          emailVerified: new Date(),
        }
      })
      createdUsers.push(user)
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error)
    }
  }
  
  console.warn(`✅ Created ${createdUsers.length} users`)
  return createdUsers
}

async function createExtensiveCustomers(): Promise<CustomerData[]> {
  console.warn('👥 Creating extensive customer base...')
  
  const customers: CustomerData[] = []
  const totalCustomers = 150 // Large customer base
  
  // Create customers across all profiles and industries
  for (let i = 0; i < totalCustomers; i++) {
    const profile = CUSTOMER_PROFILES[i % CUSTOMER_PROFILES.length]
    const industry = INDUSTRIES[i % INDUSTRIES.length]
    const leadSource = LEAD_SOURCES[i % LEAD_SOURCES.length]
    
    // Create realistic company names based on industry
    const companyPrefix = faker.company.name()
    const companySuffix = industry === 'Technology' ? ['Tech', 'Solutions', 'Systems', 'Digital'][i % 4] :
                         industry === 'Healthcare' ? ['Health', 'Medical', 'Care', 'Wellness'][i % 4] :
                         industry === 'Finance' ? ['Financial', 'Capital', 'Investments', 'Advisory'][i % 4] :
                         ['Corp', 'Inc', 'LLC', 'Group'][i % 4]
    
    const customerName = `${companyPrefix} ${companySuffix}`
    
    // Credit limits based on profile and industry size
    const baseCreditLimit = industry === 'Technology' ? 50000 :
                           industry === 'Healthcare' ? 75000 :
                           industry === 'Finance' ? 100000 :
                           industry === 'Manufacturing' ? 60000 :
                           industry === 'Government' ? 200000 : 25000
    
    const creditMultiplier = profile.name === 'Excellent Payer' ? 2.0 :
                            profile.name === 'Good Payer' ? 1.5 :
                            profile.name === 'Average Payer' ? 1.0 :
                            profile.name === 'Slow Payer' ? 0.7 : 0.4
    
    const creditLimit = Math.round(baseCreditLimit * creditMultiplier)
    
    // Create customer record dates (spread over 3 years)
    const createdAt = faker.date.between({ 
      from: new Date('2022-01-01'), 
      to: new Date('2024-11-01') 
    })
    
    const customerData: CustomerData = {
      id: `customer-${i + 1}`,
      name: customerName,
      email: faker.internet.email({ firstName: customerName.toLowerCase().replace(/ /g, '') }),
      phone: faker.phone.number(),
      industry,
      leadSource,
      creditLimit,
      profile,
      createdAt
    }
    
    customers.push(customerData)
  }
  
  // Create customers in database
  for (const customer of customers) {
    try {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: {},
        create: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          industry: customer.industry,
          leadSource: customer.leadSource as any,
          creditLimit: customer.creditLimit,
          currentBalance: 0, // Will be updated as we create invoices
          createdAt: customer.createdAt,
          updatedAt: customer.createdAt
        }
      })
    } catch (error) {
      console.error(`Failed to create customer ${customer.name}:`, error)
    }
  }
  
  console.warn(`✅ Created ${customers.length} customers across ${INDUSTRIES.length} industries`)
  return customers
}

async function createExtensiveInvoices(customers: CustomerData[], users: any[]): Promise<InvoiceData[]> {
  console.warn('📄 Creating extensive invoice history...')
  
  const invoices: InvoiceData[] = []
  const accountants = users.filter(u => u.role === 'accountant' || u.role === 'admin')
  
  let invoiceCounter = 1
  
  for (const customer of customers) {
    const profile = customer.profile
    
    // Determine number of invoices based on profile and customer age
    const monthsActive = Math.ceil(
      (new Date().getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    
    const invoicesPerMonth = profile.invoiceFrequency === 'high' ? 3 :
                            profile.invoiceFrequency === 'medium' ? 1.5 :
                            profile.invoiceFrequency === 'low' ? 0.7 : 1
    
    const totalInvoices = Math.max(1, Math.round(monthsActive * invoicesPerMonth))
    
    // Create invoices spread over time
    for (let i = 0; i < totalInvoices; i++) {
      const invoiceDate = new Date(customer.createdAt)
      invoiceDate.setMonth(invoiceDate.getMonth() + Math.round(i / invoicesPerMonth))
      
      // Invoice amounts based on customer profile and industry
      const baseAmount = customer.industry === 'Technology' ? 5000 :
                        customer.industry === 'Healthcare' ? 7500 :
                        customer.industry === 'Finance' ? 10000 :
                        customer.industry === 'Government' ? 15000 : 3000
      
      const amountVariation = faker.number.float({ min: 0.5, max: 2.0 })
      const invoiceAmount = Math.round(baseAmount * amountVariation)
      
      // Service description based on industry and invoice size
      const serviceType = SERVICE_TYPES[faker.number.int({ min: 0, max: SERVICE_TYPES.length - 1 })]
      const description = `${serviceType} - ${faker.date.month({ context: 'wide' })} ${invoiceDate.getFullYear()}`
      
      // Due date (typically 30 days)
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 30)
      
      // Invoice status based on current date and customer profile
      const daysPastDue = Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      let status: InvoiceData['status'] = 'draft'
      
      if (invoiceDate <= new Date()) {
        if (daysPastDue < 0) {
          status = 'sent' // Future due date
        } else if (daysPastDue < profile.avgPaymentDays) {
          status = Math.random() < profile.paymentReliability ? 'paid' : 'sent'
        } else {
          status = Math.random() < (profile.paymentReliability * 0.7) ? 'paid' : 'overdue'
        }
      }
      
      const invoiceData: InvoiceData = {
        id: `invoice-${invoiceCounter}`,
        number: `INV-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`,
        customerId: customer.id,
        amount: invoiceAmount,
        description,
        dueDate,
        createdAt: invoiceDate,
        status
      }
      
      invoices.push(invoiceData)
      invoiceCounter++
    }
  }
  
  // Create invoices in database
  for (const invoice of invoices) {
    try {
      const accountant = accountants[faker.number.int({ min: 0, max: accountants.length - 1 })]
      
      await prisma.invoice.upsert({
        where: { id: invoice.id },
        update: {},
        create: {
          id: invoice.id,
          number: invoice.number,
          customerId: invoice.customerId,
          amount: invoice.amount,
          description: invoice.description,
          status: invoice.status,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          updatedAt: invoice.createdAt,
          createdBy: accountant.id
        }
      })
    } catch (error) {
      console.error(`Failed to create invoice ${invoice.id}:`, error)
    }
  }
  
  console.warn(`✅ Created ${invoices.length} invoices`)
  return invoices
}

async function createExtensivePayments(customers: CustomerData[], invoices: InvoiceData[], users: any[]) {
  console.warn('💳 Creating extensive payment history...')
  
  const accountants = users.filter(u => u.role === 'accountant' || u.role === 'admin')
  let paymentCounter = 1
  let totalPayments = 0
  
  // Track customer balances
  const customerBalances: { [customerId: string]: number } = {}
  
  for (const customer of customers) {
    customerBalances[customer.id] = 0
    const customerInvoices = invoices.filter(inv => inv.customerId === customer.id)
    const profile = customer.profile
    
    for (const invoice of customerInvoices) {
      // Add invoice amount to customer balance
      customerBalances[customer.id] += invoice.amount
      
      // Create payments based on customer profile and invoice status
      if (invoice.status === 'paid' || (invoice.status === 'overdue' && Math.random() < 0.3)) {
        const paymentPatterns = generatePaymentPatterns(invoice, profile)
        
        for (const pattern of paymentPatterns) {
          const paymentDate = new Date(invoice.createdAt)
          paymentDate.setDate(paymentDate.getDate() + pattern.daysAfterInvoice)
          
          // Don't create future payments
          if (paymentDate > new Date()) continue
          
          const accountant = accountants[faker.number.int({ min: 0, max: accountants.length - 1 })]
          const paymentMethod = PAYMENT_METHODS[faker.number.int({ min: 0, max: PAYMENT_METHODS.length - 1 })]
          
          try {
            await prisma.payment.create({
              data: {
                id: `payment-${paymentCounter}`,
                invoiceId: invoice.id,
                amount: pattern.amount,
                paymentMethod: paymentMethod as any,
                description: `Payment for ${invoice.number} - ${pattern.description}`,
                paymentDate,
                createdAt: paymentDate,
                updatedAt: paymentDate,
                createdBy: accountant.id
              }
            })
            
            // Reduce customer balance
            customerBalances[customer.id] -= pattern.amount
            totalPayments++
            paymentCounter++
          } catch (error) {
            console.error(`Failed to create payment ${paymentCounter}:`, error)
          }
        }
      }
    }
  }
  
  // Update customer balances
  for (const [customerId, balance] of Object.entries(customerBalances)) {
    try {
      await prisma.customer.update({
        where: { id: customerId },
        data: { currentBalance: Math.max(0, balance) }
      })
    } catch (error) {
      console.error(`Failed to update customer balance for ${customerId}:`, error)
    }
  }
  
  console.warn(`✅ Created ${totalPayments} payments`)
}

function generatePaymentPatterns(invoice: InvoiceData, profile: typeof CUSTOMER_PROFILES[0]) {
  const patterns = []
  const amount = invoice.amount
  
  switch (profile.paymentPattern) {
    case 'consistent_early':
      // Single full payment, early
      patterns.push({
        amount: amount,
        daysAfterInvoice: faker.number.int({ min: 15, max: 25 }),
        description: 'Full payment'
      })
      break
      
    case 'mostly_on_time':
      if (Math.random() < 0.8) {
        // Single payment around due date
        patterns.push({
          amount: amount,
          daysAfterInvoice: faker.number.int({ min: 28, max: 35 }),
          description: 'Full payment'
        })
      } else {
        // Occasional partial payments
        const firstPayment = amount * 0.6
        const secondPayment = amount * 0.4
        patterns.push({
          amount: firstPayment,
          daysAfterInvoice: faker.number.int({ min: 25, max: 30 }),
          description: 'Partial payment 1/2'
        })
        patterns.push({
          amount: secondPayment,
          daysAfterInvoice: faker.number.int({ min: 35, max: 45 }),
          description: 'Final payment 2/2'
        })
      }
      break
      
    case 'mixed':
      const paymentType = Math.random()
      if (paymentType < 0.4) {
        // Full payment, slightly late
        patterns.push({
          amount: amount,
          daysAfterInvoice: faker.number.int({ min: 35, max: 50 }),
          description: 'Full payment'
        })
      } else if (paymentType < 0.8) {
        // Two partial payments
        const firstPayment = amount * faker.number.float({ min: 0.4, max: 0.7 })
        const secondPayment = amount - firstPayment
        patterns.push({
          amount: firstPayment,
          daysAfterInvoice: faker.number.int({ min: 30, max: 40 }),
          description: 'Partial payment 1/2'
        })
        patterns.push({
          amount: secondPayment,
          daysAfterInvoice: faker.number.int({ min: 45, max: 60 }),
          description: 'Final payment 2/2'
        })
      } else {
        // Multiple small payments
        const payments = 3
        for (let i = 0; i < payments; i++) {
          const paymentAmount = i === payments - 1 ? 
            amount - patterns.reduce((sum, p) => sum + p.amount, 0) :
            amount / payments
          
          patterns.push({
            amount: paymentAmount,
            daysAfterInvoice: faker.number.int({ min: 30 + (i * 15), max: 45 + (i * 15) }),
            description: `Installment ${i + 1}/${payments}`
          })
        }
      }
      break
      
    case 'often_late':
      if (Math.random() < 0.6) {
        // Late single payment
        patterns.push({
          amount: amount,
          daysAfterInvoice: faker.number.int({ min: 45, max: 70 }),
          description: 'Late payment'
        })
      } else {
        // Very late partial payments
        const firstPayment = amount * 0.5
        const secondPayment = amount * 0.5
        patterns.push({
          amount: firstPayment,
          daysAfterInvoice: faker.number.int({ min: 50, max: 70 }),
          description: 'Late partial payment 1/2'
        })
        patterns.push({
          amount: secondPayment,
          daysAfterInvoice: faker.number.int({ min: 75, max: 100 }),
          description: 'Late final payment 2/2'
        })
      }
      break
      
    case 'unreliable':
      // Random payment patterns, often incomplete
      const numPayments = faker.number.int({ min: 1, max: 4 })
      let remainingAmount = amount
      
      for (let i = 0; i < numPayments; i++) {
        const isLastPayment = i === numPayments - 1
        const maxPayment = isLastPayment ? remainingAmount : remainingAmount * 0.7
        const paymentAmount = faker.number.float({ min: remainingAmount * 0.1, max: maxPayment })
        
        patterns.push({
          amount: Math.min(paymentAmount, remainingAmount),
          daysAfterInvoice: faker.number.int({ min: 40 + (i * 20), max: 80 + (i * 30) }),
          description: `Irregular payment ${i + 1}`
        })
        
        remainingAmount -= paymentAmount
        if (remainingAmount <= 0) break
      }
      break
  }
  
  return patterns
}

async function createBusinessRelationshipEvents(customers: CustomerData[], users: any[]) {
  console.warn('📊 Creating business relationship events...')
  
  const eventTypes = [
    'credit_limit_increase', 'credit_limit_decrease', 'payment_plan_setup',
    'late_payment_warning', 'account_review', 'contract_renewal',
    'dispute_resolution', 'collection_notice', 'account_suspension',
    'account_reactivation', 'bulk_discount_applied', 'loyalty_bonus'
  ]
  
  let eventCounter = 0
  
  for (const customer of customers) {
    // Create 2-8 events per customer based on relationship length
    const monthsActive = Math.ceil(
      (new Date().getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    const numEvents = Math.min(8, Math.max(2, Math.round(monthsActive / 4)))
    
    for (let i = 0; i < numEvents; i++) {
      const eventDate = faker.date.between({
        from: customer.createdAt,
        to: new Date()
      })
      
      const eventType = eventTypes[faker.number.int({ min: 0, max: eventTypes.length - 1 })]
      const user = users[faker.number.int({ min: 0, max: users.length - 1 })]
      
      // Create audit log entry for business events
      try {
        await prisma.auditLog.create({
          data: {
            id: `audit-event-${eventCounter}`,
            action: 'UPDATE',
            entityType: 'Customer',
            entityId: customer.id,
            userId: user.id,
            changes: JSON.stringify({
              eventType,
              description: `${eventType.replace(/_/g, ' ')} for ${customer.name}`,
              previousValue: null,
              newValue: eventType
            }),
            createdAt: eventDate
          }
        })
        eventCounter++
      } catch (error) {
        console.error(`Failed to create event ${eventCounter}:`, error)
      }
    }
  }
  
  console.warn(`✅ Created ${eventCounter} business relationship events`)
}

async function createCustomerSupport(customers: CustomerData[], users: any[]) {
  console.warn('🎧 Creating customer support interactions...')
  
  const supportUsers = users.filter(u => u.role === 'support' || u.role === 'admin')
  const interactionTypes = [
    'phone_call', 'email', 'chat', 'meeting', 'follow_up',
    'complaint_resolution', 'technical_support', 'billing_inquiry'
  ]
  
  let interactionCounter = 0
  
  for (const customer of customers) {
    // Support interactions based on customer profile
    const interactionsCount = customer.profile.name === 'Problem Payer' ? 
      faker.number.int({ min: 5, max: 15 }) :
      customer.profile.name === 'Slow Payer' ?
      faker.number.int({ min: 2, max: 8 }) :
      faker.number.int({ min: 0, max: 5 })
    
    for (let i = 0; i < interactionsCount; i++) {
      const interactionDate = faker.date.between({
        from: customer.createdAt,
        to: new Date()
      })
      
      const interactionType = interactionTypes[faker.number.int({ min: 0, max: interactionTypes.length - 1 })]
      const supportUser = supportUsers[faker.number.int({ min: 0, max: supportUsers.length - 1 })]
      
      try {
        await prisma.auditLog.create({
          data: {
            id: `audit-support-${interactionCounter}`,
            action: 'CREATE',
            entityType: 'SupportInteraction',
            entityId: `support-${customer.id}-${i}`,
            userId: supportUser.id,
            changes: JSON.stringify({
              customerId: customer.id,
              type: interactionType,
              description: `${interactionType.replace(/_/g, ' ')} with ${customer.name}`,
              resolution: faker.lorem.sentence(),
              duration: faker.number.int({ min: 5, max: 120 }) // minutes
            }),
            createdAt: interactionDate
          }
        })
        interactionCounter++
      } catch (error) {
        console.error(`Failed to create support interaction ${interactionCounter}:`, error)
      }
    }
  }
  
  console.warn(`✅ Created ${interactionCounter} customer support interactions`)
}

async function createSeasonalTrends(customers: CustomerData[], users: any[]) {
  console.warn('📈 Creating seasonal business trends...')
  
  const seasonalEvents = [
    { month: 1, type: 'new_year_promotion', multiplier: 0.8 },
    { month: 2, type: 'valentine_campaign', multiplier: 1.1 },
    { month: 3, type: 'spring_launch', multiplier: 1.3 },
    { month: 4, type: 'easter_special', multiplier: 1.2 },
    { month: 5, type: 'mother_day_promo', multiplier: 1.1 },
    { month: 6, type: 'summer_kickoff', multiplier: 1.4 },
    { month: 7, type: 'summer_peak', multiplier: 1.5 },
    { month: 8, type: 'back_to_school', multiplier: 1.6 },
    { month: 9, type: 'fall_campaign', multiplier: 1.3 },
    { month: 10, type: 'halloween_special', multiplier: 1.2 },
    { month: 11, type: 'black_friday', multiplier: 2.0 },
    { month: 12, type: 'holiday_rush', multiplier: 1.8 }
  ]
  
  let trendCounter = 0
  
  for (const customer of customers) {
    // Create seasonal trend data for each year the customer has been active
    const startYear = customer.createdAt.getFullYear()
    const currentYear = new Date().getFullYear()
    
    for (let year = startYear; year <= currentYear; year++) {
      for (const season of seasonalEvents) {
        const trendDate = new Date(year, season.month - 1, 15) // Mid-month
        
        // Only create trends for past months
        if (trendDate <= new Date()) {
          try {
            await prisma.auditLog.create({
              data: {
                id: `audit-trend-${trendCounter}`,
                action: 'ANALYTICS',
                entityType: 'SeasonalTrend',
                entityId: `trend-${customer.id}-${year}-${season.month}`,
                userId: users[0].id, // System user
                changes: JSON.stringify({
                  customerId: customer.id,
                  year,
                  month: season.month,
                  eventType: season.type,
                  revenueMultiplier: season.multiplier,
                  baseRevenue: faker.number.int({ min: 1000, max: 10000 }),
                  adjustedRevenue: Math.round(faker.number.int({ min: 1000, max: 10000 }) * season.multiplier)
                }),
                createdAt: trendDate
              }
            })
            trendCounter++
          } catch (error) {
            console.error(`Failed to create trend ${trendCounter}:`, error)
          }
        }
      }
    }
  }
  
  console.warn(`✅ Created ${trendCounter} seasonal trend records`)
}

async function generateComprehensiveReports(): Promise<void> {
  console.warn('📊 Generating comprehensive business reports...')
  
  // Customer summary statistics
  const customerStats = await prisma.customer.aggregate({
    _count: { id: true },
    _sum: { currentBalance: true, creditLimit: true },
    _avg: { currentBalance: true, creditLimit: true }
  })
  
  // Invoice statistics
  const invoiceStats = await prisma.invoice.aggregate({
    _count: { id: true },
    _sum: { amount: true },
    _avg: { amount: true }
  })
  
  // Payment statistics
  const paymentStats = await prisma.payment.aggregate({
    _count: { id: true },
    _sum: { amount: true },
    _avg: { amount: true }
  })
  
  // Industry breakdown
  const industryBreakdown = await prisma.customer.groupBy({
    by: ['industry'],
    _count: { industry: true },
    _sum: { currentBalance: true, creditLimit: true }
  })
  
  // Lead source effectiveness
  const leadSourceStats = await prisma.customer.groupBy({
    by: ['leadSource'],
    _count: { leadSource: true },
    _avg: { currentBalance: true }
  })
  
  console.warn('\n📋 COMPREHENSIVE SEED DATA SUMMARY')
  console.warn('=' * 50)
  console.warn(`👥 Customers: ${customerStats._count.id}`)
  console.warn(`💰 Total Outstanding: $${customerStats._sum.currentBalance?.toLocaleString()}`)
  console.warn(`💳 Total Credit Limits: $${customerStats._sum.creditLimit?.toLocaleString()}`)
  console.warn(`📄 Total Invoices: ${invoiceStats._count.id}`)
  console.warn(`💵 Total Invoice Value: $${invoiceStats._sum.amount?.toLocaleString()}`)
  console.warn(`💸 Total Payments: ${paymentStats._count.id}`)
  console.warn(`💰 Total Payment Value: $${paymentStats._sum.amount?.toLocaleString()}`)
  
  console.warn('\n🏭 INDUSTRY BREAKDOWN:')
  industryBreakdown.forEach(industry => {
    console.warn(`  ${industry.industry}: ${industry._count.industry} customers, $${industry._sum.currentBalance?.toLocaleString()} outstanding`)
  })
  
  console.warn('\n📊 LEAD SOURCE PERFORMANCE:')
  leadSourceStats.forEach(source => {
    console.warn(`  ${source.leadSource}: ${source._count.leadSource} customers, $${source._avg.currentBalance?.toLocaleString()} avg balance`)
  })
  
  console.warn('\n✅ EXTENSIVE SEEDING COMPLETED SUCCESSFULLY!')
}

export async function seedExtensiveComprehensive(): Promise<void> {
  try {
    console.warn('🚀 Starting extensive and comprehensive database seeding...')
    
    // Step 1: Create users
    const users = await createComprehensiveUsers()
    
    // Step 2: Create extensive customer base
    const customers = await createExtensiveCustomers()
    
    // Step 3: Create comprehensive invoice history
    const invoices = await createExtensiveInvoices(customers, users)
    
    // Step 4: Create extensive payment patterns
    await createExtensivePayments(customers, invoices, users)
    
    // Step 5: Create business relationship events
    await createBusinessRelationshipEvents(customers, users)
    
    // Step 6: Create customer support interactions
    await createCustomerSupport(customers, users)
    
    // Step 7: Create seasonal business trends
    await createSeasonalTrends(customers, users)
    
    // Step 8: Generate comprehensive reports
    await generateComprehensiveReports()
    
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedExtensiveComprehensive()
    .catch(console.error)
}