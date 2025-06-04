const { PrismaClient } = require('../lib/generated/prisma')
const { faker } = require('@faker-js/faker')

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

async function createComprehensiveUsers() {
  console.log('🔧 Creating comprehensive user accounts...')
  
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
          role: userData.role,
          emailVerified: new Date(),
        }
      })
      createdUsers.push(user)
    } catch (error) {
      console.log(`User ${userData.email} might already exist, continuing...`)
    }
  }
  
  console.log(`✅ Created ${createdUsers.length} users`)
  return createdUsers
}

async function createExtensiveCustomers() {
  console.log('👥 Creating extensive customer base...')
  
  const customers = []
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
    
    const customerData = {
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
          leadSource: customer.leadSource,
          creditLimit: customer.creditLimit,
          currentBalance: 0, // Will be updated as we create invoices
          createdAt: customer.createdAt,
          updatedAt: customer.createdAt
        }
      })
    } catch (error) {
      console.log(`Customer ${customer.name} might already exist, continuing...`)
    }
  }
  
  console.log(`✅ Created ${customers.length} customers across ${INDUSTRIES.length} industries`)
  return customers
}

async function createExtensiveInvoices(customers, users) {
  console.log('📄 Creating extensive invoice history...')
  
  const invoices = []
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
      const serviceType = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)]
      const description = `${serviceType} - ${faker.date.month({ context: 'wide' })} ${invoiceDate.getFullYear()}`
      
      // Due date (typically 30 days)
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 30)
      
      // Invoice status based on current date and customer profile
      const daysPastDue = Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      let status = 'draft'
      
      if (invoiceDate <= new Date()) {
        if (daysPastDue < 0) {
          status = 'sent' // Future due date
        } else if (daysPastDue < profile.avgPaymentDays) {
          status = Math.random() < profile.paymentReliability ? 'paid' : 'sent'
        } else {
          status = Math.random() < (profile.paymentReliability * 0.7) ? 'paid' : 'overdue'
        }
      }
      
      const invoiceData = {
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
      const accountant = accountants[Math.floor(Math.random() * accountants.length)]
      
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
      console.log(`Invoice ${invoice.number} might already exist, continuing...`)
    }
  }
  
  console.log(`✅ Created ${invoices.length} invoices`)
  return invoices
}

async function createExtensivePayments(customers, invoices, users) {
  console.log('💳 Creating extensive payment history...')
  
  const accountants = users.filter(u => u.role === 'accountant' || u.role === 'admin')
  let paymentCounter = 1
  let totalPayments = 0
  
  // Track customer balances
  const customerBalances = {}
  
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
          
          const accountant = accountants[Math.floor(Math.random() * accountants.length)]
          const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)]
          
          try {
            await prisma.payment.create({
              data: {
                id: `payment-${paymentCounter}`,
                invoiceId: invoice.id,
                amount: pattern.amount,
                paymentMethod: paymentMethod,
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
            console.log(`Payment ${paymentCounter} might already exist, continuing...`)
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
      console.log(`Error updating balance for customer ${customerId}`)
    }
  }
  
  console.log(`✅ Created ${totalPayments} payments`)
}

function generatePaymentPatterns(invoice, profile) {
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

async function generateFinalStatistics() {
  try {
    // Customer statistics
    const customerCount = await prisma.customer.count()
    const totalCreditLimit = await prisma.customer.aggregate({
      _sum: { creditLimit: true }
    })
    const totalOutstanding = await prisma.customer.aggregate({
      _sum: { currentBalance: true }
    })
    
    // Invoice statistics
    const invoiceCount = await prisma.invoice.count()
    const invoiceValue = await prisma.invoice.aggregate({
      _sum: { amount: true }
    })
    const invoicesByStatus = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { amount: true }
    })
    
    // Payment statistics
    const paymentCount = await prisma.payment.count()
    const paymentValue = await prisma.payment.aggregate({
      _sum: { amount: true }
    })
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      _count: { paymentMethod: true },
      _sum: { amount: true }
    })
    
    // Industry breakdown
    const industryStats = await prisma.customer.groupBy({
      by: ['industry'],
      _count: { industry: true },
      _sum: { currentBalance: true, creditLimit: true },
      orderBy: { _count: { industry: 'desc' } }
    })
    
    console.log('\n📊 FINAL COMPREHENSIVE STATISTICS')
    console.log('='.repeat(50))
    
    console.log('\n👥 CUSTOMER DATA:')
    console.log(`   Total Customers: ${customerCount.toLocaleString()}`)
    console.log(`   Total Credit Limits: $${totalCreditLimit._sum.creditLimit?.toLocaleString() || 0}`)
    console.log(`   Total Outstanding: $${totalOutstanding._sum.currentBalance?.toLocaleString() || 0}`)
    console.log(`   Credit Utilization: ${((totalOutstanding._sum.currentBalance || 0) / (totalCreditLimit._sum.creditLimit || 1) * 100).toFixed(1)}%`)
    
    console.log('\n📄 INVOICE DATA:')
    console.log(`   Total Invoices: ${invoiceCount.toLocaleString()}`)
    console.log(`   Total Invoice Value: $${invoiceValue._sum.amount?.toLocaleString() || 0}`)
    console.log(`   Average Invoice: $${Math.round((invoiceValue._sum.amount || 0) / invoiceCount).toLocaleString()}`)
    
    console.log('\n   Invoice Status Breakdown:')
    invoicesByStatus.forEach(status => {
      console.log(`     ${status.status}: ${status._count.status} invoices ($${status._sum.amount?.toLocaleString() || 0})`)
    })
    
    console.log('\n💳 PAYMENT DATA:')
    console.log(`   Total Payments: ${paymentCount.toLocaleString()}`)
    console.log(`   Total Payment Value: $${paymentValue._sum.amount?.toLocaleString() || 0}`)
    console.log(`   Collection Rate: ${((paymentValue._sum.amount || 0) / (invoiceValue._sum.amount || 1) * 100).toFixed(1)}%`)
    
    console.log('\n🏭 TOP 10 INDUSTRIES:')
    industryStats.slice(0, 10).forEach(industry => {
      console.log(`   ${industry.industry}: ${industry._count.industry} customers, $${industry._sum.currentBalance?.toLocaleString() || 0} outstanding`)
    })
    
    console.log('\n✅ EXTENSIVE SEEDING COMPLETED SUCCESSFULLY!')
    
  } catch (error) {
    console.error('Error generating statistics:', error)
  }
}

async function runExtensiveSeeding() {
  console.log('🌱 STARTING COMPREHENSIVE EXTENSIVE DATABASE SEEDING')
  console.log('='.repeat(60))
  console.log('This will create a massive, realistic dataset including:')
  console.log('• 150+ customers across 25+ industries')
  console.log('• 1000+ invoices with realistic patterns')
  console.log('• 800+ payments with various methods')
  console.log('• Multi-year historical data')
  console.log('='.repeat(60))
  
  const startTime = Date.now()
  
  try {
    // Step 1: Clear existing data (optional)
    console.log('\n🧹 Cleaning existing payment data...')
    await prisma.payment.deleteMany({})
    await prisma.invoice.deleteMany({})
    await prisma.customer.deleteMany({
      where: {
        id: { startsWith: 'customer-' }
      }
    })
    console.log('✅ Cleaned existing data')
    
    // Step 2: Create users
    const users = await createComprehensiveUsers()
    
    // Step 3: Create extensive customer base
    const customers = await createExtensiveCustomers()
    
    // Step 4: Create comprehensive invoice history
    const invoices = await createExtensiveInvoices(customers, users)
    
    // Step 5: Create extensive payment patterns
    await createExtensivePayments(customers, invoices, users)
    
    // Step 6: Generate final statistics
    console.log('\n📈 Generating final statistics...')
    await generateFinalStatistics()
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log('\n🎉 EXTENSIVE SEEDING COMPLETED SUCCESSFULLY!')
    console.log(`⏱️  Total time: ${duration.toFixed(2)} seconds`)
    console.log('🚀 Your ERP system now has extensive, realistic data for testing!')
    
  } catch (error) {
    console.error('\n❌ ERROR during extensive seeding:', error)
    console.error('💡 Try running the script again or check the database connection')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the extensive seeding
runExtensiveSeeding()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })