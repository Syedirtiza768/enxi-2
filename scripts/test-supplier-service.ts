#!/usr/bin/env tsx

/**
 * Test the supplier service methods directly
 */

import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

async function testSupplierInvoiceService(): Promise<void> {
  console.log('🧪 Testing SupplierInvoiceService...')
  
  try {
    const service = new SupplierInvoiceService()
    const result = await service.getAllSupplierInvoices({ limit: 5 })
    console.log(`✅ SupplierInvoiceService.getAllSupplierInvoices: Got ${result.length} invoices`)
    return true
  } catch (error: any) {
    console.log(`❌ SupplierInvoiceService.getAllSupplierInvoices: ${error.message}`)
    console.log(`   Stack: ${error.stack}`)
    return false
  }
}

async function testSupplierPaymentService(): Promise<void> {
  console.log('\n🧪 Testing SupplierPaymentService...')
  
  try {
    const service = new SupplierPaymentService()
    const result = await service.getAllSupplierPayments({ limit: 5 })
    console.log(`✅ SupplierPaymentService.getAllSupplierPayments: Got ${result.length} payments`)
    return true
  } catch (error: any) {
    console.log(`❌ SupplierPaymentService.getAllSupplierPayments: ${error.message}`)
    console.log(`   Stack: ${error.stack}`)
    return false
  }
}

async function testThreeWayMatchingService(): Promise<void> {
  console.log('\n🧪 Testing ThreeWayMatchingService...')
  
  try {
    const service = new ThreeWayMatchingService()
    const defaultFilters = {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: new Date()
    }
    const metrics = await service.getMatchingMetrics(defaultFilters)
    console.log(`✅ ThreeWayMatchingService.getMatchingMetrics: Success`)
    console.log(`   Metrics keys: ${Object.keys(metrics)}`)
    return true
  } catch (error: any) {
    console.log(`❌ ThreeWayMatchingService.getMatchingMetrics: ${error.message}`)
    console.log(`   Stack: ${error.stack}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('🔍 Testing supplier service implementations directly...\n')
  
  const results = await Promise.all([
    testSupplierInvoiceService(),
    testSupplierPaymentService(), 
    testThreeWayMatchingService()
  ])
  
  const successCount = results.filter(Boolean).length
  console.log(`\n📊 Results: ${successCount}/3 services working`)
  
  if (successCount === 3) {
    console.log('✨ All services work - the issue is in the API route layer')
  } else {
    console.log('🔧 Service-layer issues identified - need to fix implementations')
  }
}

main().catch(console.error)