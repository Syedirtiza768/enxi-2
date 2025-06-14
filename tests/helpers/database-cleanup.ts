import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function cleanupDatabase(): Promise<void> {
  // Delete in the correct order to respect foreign key constraints
  const tablesToClean = [
    // Financial/Payment related
    'supplierPayment',
    'paymentAllocation',
    'payment',
    'supplierInvoice',
    'invoiceItem',
    'invoice',
    
    // Order/Quotation related
    'shipmentItem',
    'shipment',
    'salesOrderItem',
    'salesOrder',
    'quotationItem',
    'quotation',
    
    // Purchase related
    'goodsReceiptItem',
    'goodsReceipt',
    'purchaseOrderItem',
    'purchaseOrder',
    
    // Inventory related
    'stockMovement',
    'stockLot',
    'inventoryBalance',
    'item',
    'unitOfMeasure',
    'category',
    
    // Sales related
    'salesCaseExpense',
    'salesCase',
    'lead',
    'customerPO',
    'customer',
    'supplier',
    
    // Accounting related
    'journalLine',
    'journalEntry',
    'account',
    
    // User/Auth related
    'auditLog',
    'userSession',
    'userPermission',
    'user',
    
    // Base data
    'location',
    'exchangeRate',
  ]

  for (const table of tablesToClean) {
    try {
      await (prisma as any)[table].deleteMany({})
    } catch (error) {
      // Some tables might not exist or have different names
      console.warn(`Failed to clean table ${table}:`, error)
    }
  }
}

export async function setupTestDatabase(): Promise<void> {
  await cleanupDatabase()
}

export async function teardownTestDatabase(): Promise<void> {
  await cleanupDatabase()
  await prisma.$disconnect()
}