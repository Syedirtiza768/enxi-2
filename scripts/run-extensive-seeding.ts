#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'

// Import all seeding functions
import { seedExtensiveComprehensive } from './seed-extensive-comprehensive'
import { seedEdgeCases } from './seed-edge-cases'

const prisma = new PrismaClient()

async function runExtensiveSeeding() {
  console.log('🌱 STARTING COMPREHENSIVE EXTENSIVE DATABASE SEEDING')
  console.log('='.repeat(60))
  console.log('This will create a massive, realistic dataset including:')
  console.log('• 150+ customers across 25+ industries')
  console.log('• 1000+ invoices with realistic patterns')
  console.log('• 800+ payments with various methods')
  console.log('• 15+ edge case scenarios')
  console.log('• Stress test data (1000+ transactions)')
  console.log('• Seasonal trends and business analytics')
  console.log('• Customer support interactions')
  console.log('• Multi-year historical data')
  console.log('='.repeat(60))
  
  const startTime = Date.now()
  
  try {
    // Step 1: Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\n🧹 Cleaning existing payment data...')
    await prisma.payment.deleteMany({})
    await prisma.invoice.deleteMany({})
    await prisma.customer.deleteMany({
      where: {
        id: { startsWith: 'customer-' }
      }
    })
    await prisma.auditLog.deleteMany({
      where: {
        entityType: { in: ['Customer', 'Invoice', 'Payment', 'SupportInteraction', 'SeasonalTrend'] }
      }
    })
    console.log('✅ Cleaned existing data')
    
    // Step 2: Run comprehensive seeding
    console.log('\n📊 Running comprehensive seeding...')
    await seedExtensiveComprehensive()
    
    // Step 3: Add edge cases and stress tests
    console.log('\n🔍 Adding edge cases and stress test data...')
    await seedEdgeCases()
    
    // Step 4: Generate final statistics
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
    
    // Lead source performance
    const leadSourceStats = await prisma.customer.groupBy({
      by: ['leadSource'],
      _count: { leadSource: true },
      _avg: { currentBalance: true },
      orderBy: { _count: { leadSource: 'desc' } }
    })
    
    // Audit log statistics
    const auditCount = await prisma.auditLog.count()
    const auditsByType = await prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true }
    })
    
    // User statistics
    const userCount = await prisma.user.count()
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
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
    console.log(`   Average Invoice: $${((invoiceValue._sum.amount || 0) / invoiceCount).toLocaleString()}`)
    
    console.log('\n   Invoice Status Breakdown:')
    invoicesByStatus.forEach((status: any) => {
      console.log(`     ${status.status}: ${status._count.status} invoices ($${status._sum.amount?.toLocaleString() || 0})`)
    })
    
    console.log('\n💳 PAYMENT DATA:')
    console.log(`   Total Payments: ${paymentCount.toLocaleString()}`)
    console.log(`   Total Payment Value: $${paymentValue._sum.amount?.toLocaleString() || 0}`)
    console.log(`   Collection Rate: ${((paymentValue._sum.amount || 0) / (invoiceValue._sum.amount || 1) * 100).toFixed(1)}%`)
    
    console.log('\n   Payment Method Breakdown:')
    paymentsByMethod.forEach((method: any) => {
      console.log(`     ${method.paymentMethod}: ${method._count.paymentMethod} payments ($${method._sum.amount?.toLocaleString() || 0})`)
    })
    
    console.log('\n🏭 TOP INDUSTRIES:')
    industryStats.slice(0, 10).forEach((industry: any) => {
      console.log(`   ${industry.industry}: ${industry._count.industry} customers, $${industry._sum.currentBalance?.toLocaleString() || 0} outstanding`)
    })
    
    console.log('\n📊 LEAD SOURCE PERFORMANCE:')
    leadSourceStats.forEach((source: any) => {
      console.log(`   ${source.leadSource}: ${source._count.leadSource} customers, $${source._avg.currentBalance?.toLocaleString() || 0} avg balance`)
    })
    
    console.log('\n🔍 SYSTEM DATA:')
    console.log(`   Total Users: ${userCount}`)
    usersByRole.forEach((role: any) => {
      console.log(`     ${role.role}: ${role._count.role} users`)
    })
    console.log(`   Total Audit Logs: ${auditCount.toLocaleString()}`)
    auditsByType.forEach((audit: any) => {
      console.log(`     ${audit.entityType}: ${audit._count.entityType} logs`)
    })
    
    console.log('\n🎯 DATA QUALITY METRICS:')
    const avgInvoiceSize = (invoiceValue._sum.amount || 0) / invoiceCount
    const avgPaymentSize = (paymentValue._sum.amount || 0) / paymentCount
    const paymentFrequency = paymentCount / invoiceCount
    
    console.log(`   Average Invoice Size: $${avgInvoiceSize.toLocaleString()}`)
    console.log(`   Average Payment Size: $${avgPaymentSize.toLocaleString()}`)
    console.log(`   Payment Frequency: ${paymentFrequency.toFixed(2)} payments per invoice`)
    console.log(`   Data Density: ${(auditCount / customerCount).toFixed(1)} audit logs per customer`)
    
    // Calculate age demographics
    const now = new Date()
    const customerAges = await prisma.customer.findMany({
      select: { createdAt: true }
    })
    
    const ageGroups = {
      '0-6 months': 0,
      '6-12 months': 0,
      '1-2 years': 0,
      '2+ years': 0
    }
    
    customerAges.forEach((customer: any) => {
      const monthsOld = (now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsOld < 6) ageGroups['0-6 months']++
      else if (monthsOld < 12) ageGroups['6-12 months']++
      else if (monthsOld < 24) ageGroups['1-2 years']++
      else ageGroups['2+ years']++
    })
    
    console.log('\n📅 CUSTOMER AGE DISTRIBUTION:')
    Object.entries(ageGroups).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} customers (${(count / customerCount * 100).toFixed(1)}%)`)
    })
    
    console.log('\n💡 RECOMMENDATIONS:')
    console.log('   • Use customer filters to test different scenarios')
    console.log('   • Check edge case customers for boundary testing')
    console.log('   • Review payment patterns by industry')
    console.log('   • Test stress scenarios with mega customers')
    console.log('   • Analyze seasonal trends in the audit logs')
    
  } catch (error) {
    console.error('Error generating statistics:', error)
  }
}

// Run the extensive seeding if this file is executed directly
if (require.main === module) {
  runExtensiveSeeding()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { runExtensiveSeeding }