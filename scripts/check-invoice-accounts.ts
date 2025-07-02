import { prisma } from '@/lib/db/prisma'
import { TRANSACTION_ACCOUNTS } from '@/lib/constants/default-accounts'

async function checkInvoiceAccounts() {
  try {
    console.log('Checking accounts required for invoice journal entries...\n')
    
    const accountCodes = [
      TRANSACTION_ACCOUNTS.SALES_INVOICE.receivable,
      TRANSACTION_ACCOUNTS.SALES_INVOICE.revenue,
      TRANSACTION_ACCOUNTS.SALES_INVOICE.tax
    ]
    
    console.log('Required account codes:')
    console.log('- Accounts Receivable:', TRANSACTION_ACCOUNTS.SALES_INVOICE.receivable)
    console.log('- Sales Revenue:', TRANSACTION_ACCOUNTS.SALES_INVOICE.revenue)
    console.log('- Sales Tax Payable:', TRANSACTION_ACCOUNTS.SALES_INVOICE.tax)
    
    const accounts = await prisma.account.findMany({
      where: {
        code: { in: accountCodes }
      }
    })
    
    console.log('\nAccounts found in database:')
    accounts.forEach(acc => {
      console.log(`- [${acc.code}] ${acc.name} (ID: ${acc.id})`)
    })
    
    // Check for missing accounts
    const foundCodes = accounts.map(a => a.code)
    const missingCodes = accountCodes.filter(code => !foundCodes.includes(code))
    
    if (missingCodes.length > 0) {
      console.log('\n❌ Missing accounts:')
      missingCodes.forEach(code => {
        console.log('- Code:', code)
      })
    } else {
      console.log('\n✅ All required accounts exist!')
    }
    
    // Check an invoice to see why amounts might be zero
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'INV2025000001' },
      include: {
        items: true
      }
    })
    
    if (invoice) {
      console.log('\nInvoice details for INV2025000001:')
      console.log('- Subtotal:', invoice.subtotal)
      console.log('- Tax Amount:', invoice.taxAmount)
      console.log('- Discount Amount:', invoice.discountAmount)
      console.log('- Total Amount:', invoice.totalAmount)
      console.log('- Items:', invoice.items.length)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkInvoiceAccounts()