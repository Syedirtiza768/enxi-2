#!/usr/bin/env npx tsx

/**
 * Comprehensive Quotation Module Test Script
 * Tests all major quotation functionality end-to-end
 */

import { PrismaClient } from '@prisma/client'
import { QuotationService } from '../lib/services/quotation.service'
import { SalesCaseService } from '../lib/services/sales-case.service'
import { CustomerService } from '../lib/services/customer.service'

const prisma = new PrismaClient()
const quotationService = new QuotationService()
const salesCaseService = new SalesCaseService()
const customerService = new CustomerService()

interface TestResult {
  testName: string
  status: 'PASSED' | 'FAILED'
  error?: string
  details?: any
}

const testResults: TestResult[] = []

function logTest(testName: string, status: 'PASSED' | 'FAILED', error?: string, details?: any) {
  console.log(`\n${status === 'PASSED' ? '✅' : '❌'} ${testName}`)
  if (error) console.error(`   Error: ${error}`)
  if (details) console.log(`   Details:`, details)
  
  testResults.push({ testName, status, error, details })
}

async function testQuotationCreation() {
  try {
    console.log('\n🧪 Testing Quotation Creation...')
    
    // Create test customer
    const customer = await customerService.createCustomer({
      name: 'Test Customer for Quotation',
      email: `test-quotation-${Date.now()}@example.com`,
      phone: '+1234567890',
      currency: 'AED',
      creditLimit: 100000,
      paymentTerms: 30,
      createdBy: 'system'
    })
    
    // Create test sales case
    const salesCase = await salesCaseService.createSalesCase({
      customerId: customer.id,
      title: 'Test Sales Case for Quotation',
      caseNumber: `SC-TEST-${Date.now()}`,
      description: 'Test sales case for quotation testing',
      value: 50000,
      currency: 'AED',
      assignedToId: 'system',
      createdBy: 'system'
    })
    
    // Test 1: Create quotation with multiple lines
    const quotation = await quotationService.createQuotation({
      salesCaseId: salesCase.id,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentTerms: '30 days net',
      deliveryTerms: 'FOB Warehouse',
      notes: 'Test quotation notes',
      internalNotes: 'Internal test notes',
      items: [
        // Line 1 - Services
        {
          lineNumber: 1,
          lineDescription: 'Professional Services',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemCode: 'SVC-001',
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 1500,
          discount: 10,
          taxRate: 5,
          sortOrder: 1
        },
        {
          lineNumber: 1,
          isLineHeader: false,
          itemType: 'SERVICE',
          itemCode: 'SVC-002',
          description: 'Training Services',
          quantity: 5,
          unitPrice: 2000,
          discount: 0,
          taxRate: 5,
          sortOrder: 2
        },
        // Line 2 - Products
        {
          lineNumber: 2,
          lineDescription: 'Hardware Products',
          isLineHeader: true,
          itemType: 'PRODUCT',
          itemCode: 'PRD-001',
          description: 'Server Hardware',
          quantity: 2,
          unitPrice: 15000,
          discount: 15,
          taxRate: 5,
          sortOrder: 3
        },
        {
          lineNumber: 2,
          isLineHeader: false,
          itemType: 'PRODUCT',
          itemCode: 'PRD-002',
          description: 'Network Equipment',
          quantity: 5,
          unitPrice: 3000,
          discount: 10,
          taxRate: 5,
          sortOrder: 4
        }
      ],
      createdBy: 'system'
    })
    
    logTest('Create multi-line quotation', 'PASSED', undefined, {
      quotationNumber: quotation.quotationNumber,
      linesCount: 2,
      itemsCount: quotation.items.length,
      totalAmount: quotation.totalAmount,
      currency: customer.currency
    })
    
    return { customer, salesCase, quotation }
  } catch (error) {
    logTest('Create multi-line quotation', 'FAILED', error.message)
    throw error
  }
}

async function testQuotationViews(quotationId: string) {
  try {
    console.log('\n🧪 Testing Quotation Views...')
    
    // Test internal view
    const internalView = await quotationService.getQuotationInternalView(quotationId)
    
    if (!internalView.lines || !internalView.currency) {
      throw new Error('Internal view missing lines or currency')
    }
    
    logTest('Get internal view', 'PASSED', undefined, {
      hasLines: !!internalView.lines,
      linesCount: internalView.lines.length,
      hasCurrency: !!internalView.currency,
      currency: internalView.currency
    })
    
    // Test client view
    const clientView = await quotationService.getQuotationClientView(quotationId)
    
    if (!clientView.lines || !clientView.currency) {
      throw new Error('Client view missing lines or currency')
    }
    
    if (clientView.internalNotes) {
      throw new Error('Client view should not include internal notes')
    }
    
    logTest('Get client view', 'PASSED', undefined, {
      hasLines: !!clientView.lines,
      linesCount: clientView.lines.length,
      hasInternalNotes: !!clientView.internalNotes,
      currency: clientView.currency
    })
    
  } catch (error) {
    logTest('Quotation views', 'FAILED', error.message)
    throw error
  }
}

async function testQuotationUpdate(quotationId: string) {
  try {
    console.log('\n🧪 Testing Quotation Update (Versioning)...')
    
    const originalQuotation = await quotationService.getQuotation(quotationId)
    
    // Create new version
    const newVersion = await quotationService.createNewVersion(quotationId, {
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      paymentTerms: '45 days net',
      notes: 'Updated quotation notes',
      createdBy: 'system'
    })
    
    if (newVersion.version !== originalQuotation.version + 1) {
      throw new Error('Version number not incremented correctly')
    }
    
    if (!newVersion.quotationNumber.includes(`-v${newVersion.version}`)) {
      throw new Error('Version suffix not added to quotation number')
    }
    
    logTest('Create new version', 'PASSED', undefined, {
      originalVersion: originalQuotation.version,
      newVersion: newVersion.version,
      newQuotationNumber: newVersion.quotationNumber
    })
    
    return newVersion
  } catch (error) {
    logTest('Create new version', 'FAILED', error.message)
    throw error
  }
}

async function testQuotationStatusTransitions(quotationId: string) {
  try {
    console.log('\n🧪 Testing Quotation Status Transitions...')
    
    // Test sending quotation
    const sentQuotation = await quotationService.sendQuotation(quotationId, 'system')
    if (sentQuotation.status !== 'SENT') {
      throw new Error('Status not updated to SENT')
    }
    logTest('Send quotation', 'PASSED', undefined, { status: sentQuotation.status })
    
    // Test invalid transition (SENT -> DRAFT)
    try {
      await quotationService.updateQuotationStatus(quotationId, 'DRAFT', 'system')
      logTest('Invalid status transition', 'FAILED', 'Should have thrown error')
    } catch (error) {
      logTest('Invalid status transition validation', 'PASSED', undefined, { 
        errorMessage: error.message 
      })
    }
    
    // Test accepting quotation
    const acceptedQuotation = await quotationService.acceptQuotation(quotationId, 'system')
    if (acceptedQuotation.status !== 'ACCEPTED') {
      throw new Error('Status not updated to ACCEPTED')
    }
    logTest('Accept quotation', 'PASSED', undefined, { status: acceptedQuotation.status })
    
  } catch (error) {
    logTest('Status transitions', 'FAILED', error.message)
    throw error
  }
}

async function testQuotationCalculations() {
  try {
    console.log('\n🧪 Testing Quotation Calculations...')
    
    // Create quotation with specific values to test calculations
    const testItems = [
      {
        lineNumber: 1,
        lineDescription: 'Test Line',
        isLineHeader: true,
        itemType: 'PRODUCT' as const,
        itemCode: 'TEST-001',
        description: 'Test Product',
        quantity: 10,
        unitPrice: 100,
        discount: 10, // 10% discount
        taxRate: 5,   // 5% tax
        sortOrder: 1
      }
    ]
    
    // Expected calculations:
    // Subtotal: 10 * 100 = 1000
    // Discount: 1000 * 0.10 = 100
    // After discount: 1000 - 100 = 900
    // Tax: 900 * 0.05 = 45
    // Total: 900 + 45 = 945
    
    const calculations = await quotationService.calculateTotals(testItems, 'test-customer-id')
    
    if (calculations.subtotal !== 1000) {
      throw new Error(`Subtotal calculation incorrect: ${calculations.subtotal} !== 1000`)
    }
    
    if (calculations.discountAmount !== 100) {
      throw new Error(`Discount calculation incorrect: ${calculations.discountAmount} !== 100`)
    }
    
    if (calculations.taxAmount !== 45) {
      throw new Error(`Tax calculation incorrect: ${calculations.taxAmount} !== 45`)
    }
    
    if (calculations.totalAmount !== 945) {
      throw new Error(`Total calculation incorrect: ${calculations.totalAmount} !== 945`)
    }
    
    logTest('Quotation calculations', 'PASSED', undefined, calculations)
    
  } catch (error) {
    logTest('Quotation calculations', 'FAILED', error.message)
    throw error
  }
}

async function testEdgeCases() {
  try {
    console.log('\n🧪 Testing Edge Cases...')
    
    // Test empty items
    try {
      await quotationService.createQuotation({
        salesCaseId: 'non-existent',
        items: [],
        createdBy: 'system'
      })
      logTest('Empty items validation', 'FAILED', 'Should have thrown error')
    } catch (error) {
      logTest('Empty items validation', 'PASSED', undefined, { errorMessage: error.message })
    }
    
    // Test invalid sales case
    try {
      await quotationService.createQuotation({
        salesCaseId: 'non-existent-id',
        items: [{
          lineNumber: 1,
          isLineHeader: true,
          itemType: 'PRODUCT',
          itemCode: 'TEST',
          description: 'Test',
          quantity: 1,
          unitPrice: 100,
          sortOrder: 1
        }],
        createdBy: 'system'
      })
      logTest('Invalid sales case validation', 'FAILED', 'Should have thrown error')
    } catch (error) {
      logTest('Invalid sales case validation', 'PASSED', undefined, { errorMessage: error.message })
    }
    
  } catch (error) {
    logTest('Edge cases', 'FAILED', error.message)
  }
}

async function generateTestReport() {
  console.log('\n' + '='.repeat(60))
  console.log('QUOTATION MODULE TEST REPORT')
  console.log('='.repeat(60))
  
  const passed = testResults.filter(r => r.status === 'PASSED').length
  const failed = testResults.filter(r => r.status === 'FAILED').length
  const total = testResults.length
  
  console.log(`\nTotal Tests: ${total}`)
  console.log(`Passed: ${passed} (${((passed/total) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${failed} (${((failed/total) * 100).toFixed(1)}%)`)
  
  if (failed > 0) {
    console.log('\nFailed Tests:')
    testResults
      .filter(r => r.status === 'FAILED')
      .forEach(r => {
        console.log(`  - ${r.testName}: ${r.error}`)
      })
  }
  
  console.log('\n' + '='.repeat(60))
}

async function runAllTests() {
  try {
    console.log('🚀 Starting Comprehensive Quotation Module Tests...')
    
    // Test basic calculations
    await testQuotationCalculations()
    
    // Test creation workflow
    const { customer, salesCase, quotation } = await testQuotationCreation()
    
    // Test views
    await testQuotationViews(quotation.id)
    
    // Test update/versioning
    const newVersion = await testQuotationUpdate(quotation.id)
    
    // Test status transitions on new version
    await testQuotationStatusTransitions(newVersion.id)
    
    // Test edge cases
    await testEdgeCases()
    
    // Generate report
    await generateTestReport()
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await prisma.quotation.deleteMany({ 
      where: { salesCase: { customerId: customer.id } } 
    })
    await prisma.salesCase.deleteMany({ 
      where: { customerId: customer.id } 
    })
    await prisma.customer.delete({ 
      where: { id: customer.id } 
    })
    
    console.log('✨ All tests completed!')
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error)
    await generateTestReport()
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
runAllTests()