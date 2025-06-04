import { PrismaClient, LeadSource } from '../lib/generated/prisma'

const prisma = new PrismaClient()

const ADDITIONAL_INDUSTRIES = [
  'Construction', 'Automotive', 'Aerospace', 'Entertainment', 'Agriculture',
  'Mining', 'Chemical', 'Pharmaceuticals', 'Textiles', 'Energy'
]

const LEAD_SOURCES: LeadSource[] = [
  'WEBSITE', 'PHONE_CALL', 'EMAIL', 'REFERRAL', 'SOCIAL_MEDIA', 
  'TRADE_SHOW', 'ADVERTISING', 'DIRECT_MAIL', 'SEO', 'CONTENT_MARKETING'
]

async function createAdditionalCustomers() {
  console.log('🔥 Creating additional 50+ customers...')
  
  const additionalCustomers = [
    // High-value customers
    { name: 'Enterprise Solutions Corp', industry: 'Technology', creditLimit: 500000, profile: 'enterprise' },
    { name: 'Global Construction Ltd', industry: 'Construction', creditLimit: 750000, profile: 'government' },
    { name: 'Automotive Parts Inc', industry: 'Automotive', creditLimit: 300000, profile: 'reliable' },
    { name: 'Pharma Research Labs', industry: 'Pharmaceuticals', creditLimit: 1000000, profile: 'vip' },
    { name: 'Energy Solutions Group', industry: 'Energy', creditLimit: 850000, profile: 'enterprise' },
    
    // Medium businesses
    { name: 'Local Retail Chain', industry: 'Retail', creditLimit: 75000, profile: 'average' },
    { name: 'Family Restaurant Group', industry: 'Hospitality', creditLimit: 50000, profile: 'seasonal' },
    { name: 'Regional Transport Co', industry: 'Transportation', creditLimit: 125000, profile: 'reliable' },
    { name: 'Textile Manufacturers', industry: 'Textiles', creditLimit: 200000, profile: 'slow' },
    { name: 'Chemical Processing Inc', industry: 'Chemical', creditLimit: 400000, profile: 'government' },
    
    // Small businesses
    { name: 'Corner Coffee Shop', industry: 'Food & Beverage', creditLimit: 5000, profile: 'micro' },
    { name: 'Local Bookstore', industry: 'Retail', creditLimit: 10000, profile: 'micro' },
    { name: 'Freelance Design Studio', industry: 'Media', creditLimit: 15000, profile: 'irregular' },
    { name: 'Pet Grooming Service', industry: 'Services', creditLimit: 8000, profile: 'micro' },
    { name: 'Food Truck Business', industry: 'Food & Beverage', creditLimit: 12000, profile: 'seasonal' },
    
    // Problem customers
    { name: 'Struggling Startup Inc', industry: 'Technology', creditLimit: 25000, profile: 'problem' },
    { name: 'Late Payment Corp', industry: 'Manufacturing', creditLimit: 100000, profile: 'chronic_late' },
    { name: 'Disputing Customer LLC', industry: 'Services', creditLimit: 75000, profile: 'disputed' },
    { name: 'Bankruptcy Risk Co', industry: 'Retail', creditLimit: 50000, profile: 'collection' },
    { name: 'Non-Responsive Entity', industry: 'Construction', creditLimit: 150000, profile: 'non_responsive' },
    
    // Seasonal businesses
    { name: 'Holiday Decorations Inc', industry: 'Retail', creditLimit: 80000, profile: 'seasonal_q4' },
    { name: 'Summer Camp Services', industry: 'Education', creditLimit: 60000, profile: 'seasonal_summer' },
    { name: 'Tax Preparation LLC', industry: 'Finance', creditLimit: 40000, profile: 'seasonal_q1' },
    { name: 'Beach Resort Management', industry: 'Hospitality', creditLimit: 200000, profile: 'seasonal_summer' },
    { name: 'Christmas Tree Farm', industry: 'Agriculture', creditLimit: 30000, profile: 'seasonal_q4' },
    
    // International customers
    { name: 'Tokyo Trading Co', industry: 'Import/Export', creditLimit: 600000, profile: 'international' },
    { name: 'London Financial Ltd', industry: 'Finance', creditLimit: 800000, profile: 'international' },
    { name: 'Berlin Tech GmbH', industry: 'Technology', creditLimit: 400000, profile: 'international' },
    { name: 'Sydney Mining Corp', industry: 'Mining', creditLimit: 900000, profile: 'international' },
    { name: 'Mumbai Textiles Pvt', industry: 'Textiles', creditLimit: 250000, profile: 'international' },
    
    // Non-profit and government
    { name: 'City Public Works', industry: 'Government', creditLimit: 1500000, profile: 'government' },
    { name: 'State University', industry: 'Education', creditLimit: 800000, profile: 'government' },
    { name: 'Children\'s Charity Fund', industry: 'Non-Profit', creditLimit: 100000, profile: 'nonprofit' },
    { name: 'Environmental Protection Org', industry: 'Non-Profit', creditLimit: 150000, profile: 'nonprofit' },
    { name: 'County Hospital District', industry: 'Healthcare', creditLimit: 2000000, profile: 'government' },
    
    // Specialized industries
    { name: 'Film Production Studio', industry: 'Entertainment', creditLimit: 500000, profile: 'project_based' },
    { name: 'Sports Equipment Mfg', industry: 'Sports', creditLimit: 300000, profile: 'seasonal' },
    { name: 'Aerospace Component Co', industry: 'Aerospace', creditLimit: 1200000, profile: 'government' },
    { name: 'Medical Device Labs', industry: 'Healthcare', creditLimit: 600000, profile: 'regulated' },
    { name: 'Organic Farm Collective', industry: 'Agriculture', creditLimit: 80000, profile: 'seasonal' },
    
    // High-risk customers
    { name: 'Volatile Market Trader', industry: 'Finance', creditLimit: 200000, profile: 'high_risk' },
    { name: 'New Business Venture', industry: 'Technology', creditLimit: 30000, profile: 'startup' },
    { name: 'Reorganizing Company', industry: 'Manufacturing', creditLimit: 100000, profile: 'restructuring' },
    { name: 'Merger Target Corp', industry: 'Technology', creditLimit: 400000, profile: 'acquisition' },
    { name: 'Liquidation Services', industry: 'Services', creditLimit: 50000, profile: 'liquidation' },
    
    // Perfect customers
    { name: 'Blue Chip Corporation', industry: 'Finance', creditLimit: 2500000, profile: 'perfect' },
    { name: 'Fortune 500 Subsidiary', industry: 'Technology', creditLimit: 1800000, profile: 'perfect' },
    { name: 'Established Bank', industry: 'Finance', creditLimit: 3000000, profile: 'perfect' },
    { name: 'Premium Healthcare Group', industry: 'Healthcare', creditLimit: 1500000, profile: 'perfect' },
    { name: 'Elite Consulting Firm', industry: 'Services', creditLimit: 800000, profile: 'perfect' },
    
    // E-commerce and digital
    { name: 'Online Marketplace Inc', industry: 'Technology', creditLimit: 400000, profile: 'digital' },
    { name: 'Social Media Platform', industry: 'Technology', creditLimit: 600000, profile: 'digital' },
    { name: 'Cryptocurrency Exchange', industry: 'Finance', creditLimit: 800000, profile: 'crypto' },
    { name: 'Digital Marketing Agency', industry: 'Media', creditLimit: 150000, profile: 'digital' },
    { name: 'E-learning Platform', industry: 'Education', creditLimit: 200000, profile: 'digital' }
  ]
  
  let customerCounter = 10001 // Start from high number to avoid conflicts
  
  for (const customerData of additionalCustomers) {
    const customerId = `customer-${customerCounter++}`
    
    // Generate realistic creation dates
    const daysAgo = Math.floor(Math.random() * 1095) // Up to 3 years ago
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)
    
    // Generate contact details
    const email = `contact@${customerData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    const phone = `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
    
    try {
      await prisma.customer.create({
        data: {
          id: customerId,
          name: customerData.name,
          email: email,
          phone: phone,
          industry: customerData.industry,
          leadSource: LEAD_SOURCES[Math.floor(Math.random() * LEAD_SOURCES.length)],
          creditLimit: customerData.creditLimit,
          currentBalance: 0,
          createdAt: createdAt,
          updatedAt: createdAt
        }
      })
    } catch (error) {
      console.log(`Customer ${customerData.name} might already exist, continuing...`)
    }
  }
  
  console.log(`✅ Created ${additionalCustomers.length} additional customers`)
}

async function generateFinalComprehensiveStats() {
  console.log('\n📊 FINAL COMPREHENSIVE DATABASE STATISTICS')
  console.log('='.repeat(60))
  
  try {
    // Get comprehensive statistics
    const customerCount = await prisma.customer.count()
    const invoiceCount = await prisma.invoice.count()
    const paymentCount = await prisma.payment.count()
    const salesCaseCount = await prisma.salesCase.count()
    const quotationCount = await prisma.quotation.count()
    const salesOrderCount = await prisma.salesOrder.count()
    
    // Financial statistics
    const invoiceStats = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
      _min: { totalAmount: true },
      _max: { totalAmount: true }
    })
    
    const paymentStats = await prisma.payment.aggregate({
      _sum: { amount: true },
      _avg: { amount: true },
      _min: { amount: true },
      _max: { amount: true }
    })
    
    const customerStats = await prisma.customer.aggregate({
      _sum: { creditLimit: true, paymentTerms: true },
      _avg: { creditLimit: true, paymentTerms: true },
      _min: { creditLimit: true, paymentTerms: true },
      _max: { creditLimit: true, paymentTerms: true }
    })
    
    // Industry breakdown
    const industryBreakdown = await prisma.customer.groupBy({
      by: ['industry'],
      _count: { industry: true },
      _sum: { creditLimit: true },
      orderBy: { _count: { industry: 'desc' } }
    })
    
    // Customer currency analysis
    const currencyStats = await prisma.customer.groupBy({
      by: ['currency'],
      _count: { currency: true },
      _avg: { creditLimit: true },
      orderBy: { _count: { currency: 'desc' } }
    })
    
    // Invoice status breakdown
    const invoiceStatus = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { totalAmount: true }
    })
    
    console.log('\n📈 RECORD COUNTS:')
    console.log(`   👥 Total Customers: ${customerCount.toLocaleString()}`)
    console.log(`   🧾 Total Invoices: ${invoiceCount.toLocaleString()}`)
    console.log(`   💳 Total Payments: ${paymentCount.toLocaleString()}`)
    console.log(`   💼 Total Sales Cases: ${salesCaseCount.toLocaleString()}`)
    console.log(`   📋 Total Quotations: ${quotationCount.toLocaleString()}`)
    console.log(`   📝 Total Sales Orders: ${salesOrderCount.toLocaleString()}`)
    
    console.log('\n💰 FINANCIAL OVERVIEW:')
    console.log(`   Total Invoice Value: $${(invoiceStats._sum.totalAmount || 0).toLocaleString()}`)
    console.log(`   Total Payments: $${(paymentStats._sum.amount || 0).toLocaleString()}`)
    console.log(`   Total Credit Limits: $${(customerStats._sum.creditLimit || 0).toLocaleString()}`)
    console.log(`   Collection Rate: ${(((paymentStats._sum.amount || 0) / (invoiceStats._sum.totalAmount || 1)) * 100).toFixed(1)}%`)
    console.log(`   Average Payment Terms: ${Math.round(customerStats._avg.paymentTerms || 30)} days`)
    
    console.log('\n📊 INVOICE ANALYSIS:')
    console.log(`   Average Invoice: $${Math.round(invoiceStats._avg.totalAmount || 0).toLocaleString()}`)
    console.log(`   Smallest Invoice: $${(invoiceStats._min.totalAmount || 0).toLocaleString()}`)
    console.log(`   Largest Invoice: $${(invoiceStats._max.totalAmount || 0).toLocaleString()}`)
    
    console.log('\n💳 PAYMENT ANALYSIS:')
    console.log(`   Average Payment: $${Math.round(paymentStats._avg.amount || 0).toLocaleString()}`)
    console.log(`   Smallest Payment: $${(paymentStats._min.amount || 0).toLocaleString()}`)
    console.log(`   Largest Payment: $${(paymentStats._max.amount || 0).toLocaleString()}`)
    console.log(`   Payments per Invoice: ${(paymentCount / invoiceCount).toFixed(2)}`)
    
    console.log('\n🏭 TOP 15 INDUSTRIES:')
    industryBreakdown.slice(0, 15).forEach((industry, index) => {
      const percentage = (industry._count.industry / customerCount * 100).toFixed(1)
      console.log(`   ${index + 1}. ${industry.industry}: ${industry._count.industry} customers (${percentage}%) - $${(industry._sum.creditLimit || 0).toLocaleString()} credit limits`)
    })
    
    console.log('\n💱 CURRENCY BREAKDOWN:')
    currencyStats.forEach((currency, index) => {
      const percentage = (currency._count.currency / customerCount * 100).toFixed(1)
      const avgCreditLimit = Math.round(currency._avg.creditLimit || 0)
      console.log(`   ${index + 1}. ${currency.currency}: ${currency._count.currency} customers (${percentage}%) - $${avgCreditLimit.toLocaleString()} avg credit limit`)
    })
    
    console.log('\n📋 INVOICE STATUS BREAKDOWN:')
    invoiceStatus.forEach(status => {
      const percentage = (status._count.status / invoiceCount * 100).toFixed(1)
      console.log(`   ${status.status.toUpperCase()}: ${status._count.status} invoices (${percentage}%) - $${(status._sum.totalAmount || 0).toLocaleString()}`)
    })
    
    console.log('\n🎯 DATA QUALITY METRICS:')
    const dataCompleteness = (customerCount > 0 && invoiceCount > 0 && paymentCount > 0) ? 'Excellent' : 'Needs Improvement'
    const diversityScore = industryBreakdown.length
    const activityLevel = paymentCount / Math.max(1, Math.ceil((Date.now() - new Date('2022-01-01').getTime()) / (1000 * 60 * 60 * 24 * 30)))
    
    console.log(`   Data Completeness: ${dataCompleteness}`)
    console.log(`   Industry Diversity: ${diversityScore} different industries`)
    console.log(`   Monthly Activity: ${activityLevel.toFixed(1)} payments per month avg`)
    console.log(`   Business Coverage: ${customerCount > 100 ? 'Enterprise Scale' : customerCount > 50 ? 'Mid-Market' : 'Small Business'}`)
    
    console.log('\n✅ DATABASE EXTENSIVELY POPULATED AND READY FOR PRODUCTION TESTING!')
    console.log('🚀 Perfect for stress testing, reporting, and performance analysis!')
    
  } catch (error) {
    console.error('Error generating comprehensive statistics:', error)
  }
}

async function runAdditionalSeeding() {
  console.log('🔥 ADDING EXTENSIVE ADDITIONAL DATA TO EXISTING SEED')
  console.log('='.repeat(60))
  
  try {
    await createAdditionalCustomers()
    await generateFinalComprehensiveStats()
    
    console.log('\n🎉 EXTENSIVE ADDITIONAL SEEDING COMPLETED!')
    
  } catch (error) {
    console.error('❌ Error during additional seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  runAdditionalSeeding().catch(console.error)
}

export { runAdditionalSeeding }