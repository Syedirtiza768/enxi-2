import { prisma } from '@/lib/db/prisma'
import { InvoiceService } from '@/lib/services/invoice.service'
import { PaymentMethod, InvoiceStatus } from "@prisma/client"

async function validateSystem() {
  console.log('🔍 Starting system validation...\n')
  
  try {
    // 1. Check database connection
    console.log('1️⃣ Checking database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully\n')

    // 2. Check critical accounts exist
    console.log('2️⃣ Checking critical accounts...')
    const criticalAccounts = [
      { code: '1110', name: 'Cash on Hand' },
      { code: '1010', name: 'Bank Account' },
      { code: '1200', name: 'Accounts Receivable' },
      { code: '2110', name: 'Accounts Payable' },
      { code: '4100', name: 'Sales Revenue' },
      { code: '5010', name: 'Cost of Goods Sold' }
    ]

    for (const { code, name } of criticalAccounts) {
      const account = await prisma.account.findFirst({
        where: { code }
      })
      if (account) {
        console.log(`✅ Account ${code} - ${name} exists`)
      } else {
        console.log(`❌ Account ${code} - ${name} NOT FOUND`)
      }
    }
    console.log()

    // 3. Check if there are any unpaid invoices
    console.log('3️⃣ Checking for unpaid invoices...')
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        balanceAmount: { gt: 0 },
        status: { not: InvoiceStatus.CANCELLED }
      },
      include: {
        customer: true
      },
      take: 5
    })

    if (unpaidInvoices.length > 0) {
      console.log(`Found ${unpaidInvoices.length} unpaid invoices:`)
      unpaidInvoices.forEach(inv => {
        console.log(`  - ${inv.invoiceNumber}: ${inv.customer.name} - Balance: ${inv.currency} ${inv.balanceAmount}`)
      })
    } else {
      console.log('No unpaid invoices found')
    }
    console.log()

    // 4. Test payment recording (if there's an unpaid invoice)
    if (unpaidInvoices.length > 0) {
      console.log('4️⃣ Testing payment recording...')
      const testInvoice = unpaidInvoices[0]
      console.log(`Testing payment on invoice ${testInvoice.invoiceNumber}`)
      
      try {
        const invoiceService = new InvoiceService()
        const paymentAmount = Math.min(100, testInvoice.balanceAmount) // Pay $100 or full balance
        
        console.log(`Recording payment of ${testInvoice.currency} ${paymentAmount}...`)
        
        const startTime = Date.now()
        const payment = await invoiceService.recordPayment(testInvoice.id, {
          amount: paymentAmount,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentDate: new Date(),
          reference: `TEST-${Date.now()}`,
          notes: 'System validation test payment',
          createdBy: 'system-test'
        })
        const endTime = Date.now()
        
        console.log(`✅ Payment recorded successfully!`)
        console.log(`   Payment Number: ${payment.paymentNumber}`)
        console.log(`   Amount: ${payment.amount}`)
        console.log(`   Time taken: ${endTime - startTime}ms`)
        
        // Check updated invoice
        const updatedInvoice = await prisma.invoice.findUnique({
          where: { id: testInvoice.id }
        })
        
        console.log(`   New balance: ${updatedInvoice?.balanceAmount}`)
        console.log(`   Invoice status: ${updatedInvoice?.status}`)
      } catch (error) {
        console.error('❌ Payment recording failed:', error)
      }
    }
    console.log()

    // 5. Check system performance
    console.log('5️⃣ Checking system performance...')
    const startTime = Date.now()
    
    // Run a few queries
    await Promise.all([
      prisma.invoice.count(),
      prisma.customer.count(),
      prisma.payment.count(),
      prisma.account.count(),
      prisma.journalEntry.count()
    ])
    
    const queryTime = Date.now() - startTime
    console.log(`✅ Database queries completed in ${queryTime}ms`)
    
    if (queryTime > 1000) {
      console.log('⚠️  Queries are taking longer than expected')
    }

    console.log('\n✅ System validation completed!')
    
  } catch (error) {
    console.error('❌ System validation failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
validateSystem()