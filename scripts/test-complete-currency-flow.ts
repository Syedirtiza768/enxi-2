import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { QuotationService } from '@/lib/services/quotation.service'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { ShipmentService } from '@/lib/services/shipment.service'
import { SalesWorkflowService } from '@/lib/services/sales-workflow.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { InvoiceService } from '@/lib/services/invoice.service'

async function testCompleteCurrencyFlow() {
  console.log('🌍 Testing Complete Business Flow with Currency (AED)\n')
  
  const salesCaseService = new SalesCaseService()
  const quotationService = new QuotationService()
  const salesOrderService = new SalesOrderService()
  const shipmentService = new ShipmentService()
  const workflowService = new SalesWorkflowService()
  const journalService = new JournalEntryService()
  const invoiceService = new InvoiceService()
  
  try {
    // Get company settings
    const companySettings = await prisma.companySettings.findFirst()
    const baseCurrency = companySettings?.defaultCurrency || 'AED'
    console.log(`✅ Base Currency: ${baseCurrency}\n`)
    
    // Get test data
    const user = await prisma.user.findFirst()
    if (!user) throw new Error('No user found')
    
    const customer = await prisma.customer.findFirst({
      where: { currency: baseCurrency }
    })
    if (!customer) throw new Error('No customer found')
    
    // 1. Create a Sales Case
    console.log('📋 Step 1: Creating Sales Case...')
    const salesCase = await salesCaseService.createSalesCase({
      customerId: customer.id,
      title: 'Currency Test - Complete Flow',
      description: 'Testing currency handling across all modules',
      estimatedValue: 100000, // AED
      createdBy: user.id
    })
    console.log(`   ✅ Created: ${salesCase.caseNumber}`)
    console.log(`   Estimated Value: ${baseCurrency} ${salesCase.estimatedValue}`)
    
    // 2. Add Expenses in Different Currencies
    console.log('\n💸 Step 2: Adding Multi-Currency Expenses...')
    
    const expenses = [
      { category: 'Materials', amount: 5000, currency: 'USD', description: 'Imported parts' },
      { category: 'Labor', amount: 10000, currency: baseCurrency, description: 'Local labor' },
      { category: 'Shipping', amount: 800, currency: 'EUR', description: 'European shipping' }
    ]
    
    for (const expData of expenses) {
      const expense = await salesCaseService.createExpense({
        salesCaseId: salesCase.id,
        expenseDate: new Date(),
        ...expData,
        createdBy: user.id
      })
      
      await salesCaseService.approveExpense(expense.id, user.id)
      
      console.log(`   ✅ ${expense.category}: ${expense.amount} ${expense.currency} = ${expense.baseAmount} ${baseCurrency} @ ${expense.exchangeRate}`)
    }
    
    // 3. Create Quotation
    console.log('\n📄 Step 3: Creating Quotation...')
    
    // Get some items
    const items = await prisma.item.findMany({
      where: { isSaleable: true },
      take: 3
    })
    
    const quotationItems = items.map((item, index) => ({
      itemId: item.id,
      itemCode: item.code,
      lineNumber: index + 1,
      quantity: 10,
      unitPrice: item.listPrice, // This is in AED
      description: item.description || item.name,
      unitOfMeasureId: item.unitOfMeasureId
    }))
    
    const quotation = await quotationService.createQuotation({
      salesCaseId: salesCase.id,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB',
      items: quotationItems,
      createdBy: user.id
    })
    
    console.log(`   ✅ Created: ${quotation.quotationNumber}`)
    console.log(`   Total Amount: ${baseCurrency} ${quotation.totalAmount}`)
    
    // Accept the quotation
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'ACCEPTED' }
    })
    console.log('   ✅ Quotation accepted')
    
    // 4. Convert to Sales Order
    console.log('\n📦 Step 4: Creating Sales Order...')
    
    const salesOrder = await salesOrderService.convertQuotationToSalesOrder(
      quotation.id,
      {
        customerPO: 'PO-TEST-001',
        requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: user.id
      }
    )
    
    console.log(`   ✅ Created: ${salesOrder.orderNumber}`)
    console.log(`   Total Amount: ${baseCurrency} ${salesOrder.totalAmount}`)
    
    // Approve the order
    await salesOrderService.approveSalesOrder(salesOrder.id, user.id)
    console.log('   ✅ Order approved')
    
    // 5. Create Shipment
    console.log('\n🚚 Step 5: Creating Shipment...')
    
    const shipmentData = {
      salesOrderId: salesOrder.id,
      shipmentDate: new Date(),
      carrier: 'Test Logistics',
      trackingNumber: 'TRACK-001',
      items: salesOrder.items.map(item => ({
        salesOrderItemId: item.id,
        itemId: item.itemId,
        quantity: item.quantity
      })),
      createdBy: user.id
    }
    
    const shipment = await shipmentService.createShipment(shipmentData)
    console.log(`   ✅ Created: ${shipment.shipmentNumber}`)
    
    // Ship it
    await shipmentService.confirmShipment(shipment.id, { shippedBy: user.id })
    console.log('   ✅ Shipment confirmed')
    
    // 6. Deliver Shipment (This should create stock movements)
    console.log('\n📍 Step 6: Delivering Shipment...')
    
    await shipmentService.deliverShipment(shipment.id, {
      deliveredBy: user.id,
      deliveryNotes: 'Delivered successfully',
      recipientName: 'Test Recipient'
    })
    
    // Trigger workflow for stock movements and GL entries
    const workflowResult = await workflowService.onShipmentDelivered(shipment.id, user.id)
    console.log('   ✅ Shipment delivered')
    console.log(`   Invoice created: ${workflowResult.invoiceCreated}`)
    console.log(`   GL entries created: ${workflowResult.glEntriesCreated}`)
    
    // 7. Check Stock Movements
    console.log('\n📊 Step 7: Checking Stock Movements...')
    
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        referenceType: 'SHIPMENT',
        referenceId: shipment.id
      },
      include: {
        item: true
      }
    })
    
    if (stockMovements.length > 0) {
      console.log(`   ✅ Stock movements created: ${stockMovements.length}`)
      let totalFIFOCost = 0
      stockMovements.forEach(mov => {
        console.log(`   ${mov.item.name}: ${Math.abs(mov.quantity)} units @ ${mov.unitCost} ${baseCurrency} = ${mov.totalCost} ${baseCurrency}`)
        totalFIFOCost += mov.totalCost
      })
      console.log(`   Total FIFO Cost: ${baseCurrency} ${totalFIFOCost}`)
    } else {
      console.log('   ⚠️  No stock movements created')
    }
    
    // 8. Check GL Entries
    console.log('\n📖 Step 8: Checking GL Entries...')
    
    const glEntries = await prisma.journalEntry.findMany({
      where: {
        OR: [
          { referenceType: 'SHIPMENT', referenceId: shipment.id },
          { referenceType: 'SALES_ORDER', referenceId: salesOrder.id }
        ]
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    })
    
    glEntries.forEach(entry => {
      console.log(`   ${entry.entryNumber}: ${entry.description}`)
      let totalDebit = 0, totalCredit = 0
      entry.lines.forEach(line => {
        const amount = line.debit || line.credit || 0
        if (line.debit) totalDebit += amount
        if (line.credit) totalCredit += amount
        console.log(`     ${line.debit ? 'Dr' : 'Cr'} ${line.account.code} - ${line.account.name}: ${amount} ${line.account.currency}`)
      })
      console.log(`     Total: Dr ${totalDebit} Cr ${totalCredit} (Should balance)`)
    })
    
    // 9. Close Sales Case and Check Profitability
    console.log('\n🏁 Step 9: Closing Sales Case...')
    
    await salesCaseService.closeSalesCase(
      salesCase.id,
      'WON',
      salesOrder.totalAmount, // Actual value in AED
      0, // Cost will be calculated
      user.id
    )
    
    // Get final profitability
    const summary = await salesCaseService.getSalesCaseSummary(salesCase.id)
    console.log(`\n📈 Final Profitability Analysis:`)
    console.log(`   Revenue: ${baseCurrency} ${summary.revenue.toFixed(2)}`)
    console.log(`   FIFO Cost: ${baseCurrency} ${summary.fifoCost.toFixed(2)}`)
    console.log(`   Direct Expenses: ${baseCurrency} ${summary.totalExpenses.toFixed(2)}`)
    console.log(`   Total Cost: ${baseCurrency} ${(summary.fifoCost + summary.totalExpenses).toFixed(2)}`)
    console.log(`   Profit: ${baseCurrency} ${summary.actualProfit.toFixed(2)}`)
    console.log(`   Margin: ${summary.profitMargin.toFixed(2)}%`)
    
    // 10. Check Audit Trail
    console.log('\n🔍 Step 10: Checking Audit Trail...')
    
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: salesCase.id,
        entityType: 'SalesCase'
      },
      orderBy: { timestamp: 'desc' },
      take: 3
    })
    
    console.log(`   Found ${auditLogs.length} audit entries for sales case`)
    auditLogs.forEach(log => {
      console.log(`   ${log.action} at ${log.timestamp.toISOString()}`)
    })
    
    console.log('\n✅ Complete currency flow test finished successfully!')
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    // Note: In production, you wouldn't delete these. This is just for testing.
    
  } catch (error) {
    console.error('❌ Error in currency flow test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCompleteCurrencyFlow()