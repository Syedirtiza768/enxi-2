/**
 * Database cleanup utility for tests
 * Ensures clean state between test runs
 */

const { PrismaClient } = require('../../lib/generated/prisma')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db',
    },
  },
})

async function cleanupDatabase() {
  try {
    // Order matters due to foreign key constraints
    // Delete in reverse order of dependencies
    
    // Financial records
    await prisma.payment.deleteMany()
    await prisma.supplierPayment.deleteMany()
    await prisma.invoiceItem.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.supplierInvoiceItem.deleteMany()
    await prisma.supplierInvoice.deleteMany()
    
    // Inventory
    await prisma.shipmentItem.deleteMany()
    await prisma.shipment.deleteMany()
    await prisma.goodsReceiptItem.deleteMany()
    await prisma.goodsReceipt.deleteMany()
    await prisma.stockMovement.deleteMany()
    await prisma.locationStockLot.deleteMany()
    await prisma.stockLot.deleteMany()
    await prisma.inventoryBalance.deleteMany()
    
    // Orders
    await prisma.salesOrderItem.deleteMany()
    await prisma.salesOrder.deleteMany()
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany()
    await prisma.customerPO.deleteMany()
    
    // Quotes
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    
    // Cases and Leads
    await prisma.caseExpense.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.lead.deleteMany()
    
    // Master data
    await prisma.customer.deleteMany()
    await prisma.supplier.deleteMany()
    await prisma.item.deleteMany()
    await prisma.location.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unitOfMeasure.deleteMany()
    await prisma.taxRate.deleteMany()
    
    // Accounting
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.account.deleteMany()
    
    // System
    await prisma.auditLog.deleteMany()
    await prisma.companySettings.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.user.deleteMany()
    
    console.log('✅ Database cleaned successfully')
  } catch (error) {
    console.error('❌ Error cleaning database:', error)
    throw error
  }
}

module.exports = { cleanupDatabase, prisma }