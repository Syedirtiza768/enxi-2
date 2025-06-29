import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { ExpenseStatus, PaymentMethod, PaymentStatus } from '@/lib/types/shared-enums'

async function addProfitabilityTestData() {
  console.log('🔧 Adding test data for sales case profitability analysis\n')
  
  const salesCaseService = new SalesCaseService()
  
  try {
    // Get a sample user
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }
    
    // Find a WON sales case to add expenses to
    const salesCase = await prisma.salesCase.findFirst({
      where: {
        status: 'WON',
        actualValue: { gt: 0 }
      },
      include: {
        salesOrders: {
          include: {
            invoices: true
          }
        }
      }
    })
    
    if (!salesCase) {
      console.log('❌ No WON sales cases found')
      return
    }
    
    console.log(`📊 Adding test data to Sales Case: ${salesCase.caseNumber}`)
    
    // 1. Add some expenses
    console.log('\n💸 Creating expenses...')
    
    const expenseCategories = [
      { category: 'Travel', description: 'Site visit and inspection', amount: 2500 },
      { category: 'Materials', description: 'Special tools and equipment', amount: 5800 },
      { category: 'Labor', description: 'Overtime for urgent delivery', amount: 3200 },
      { category: 'Shipping', description: 'Express freight charges', amount: 1500 },
      { category: 'Consulting', description: 'Technical consultant fees', amount: 4000 }
    ]
    
    for (const expenseData of expenseCategories) {
      const expense = await salesCaseService.createExpense({
        salesCaseId: salesCase.id,
        expenseDate: new Date(),
        category: expenseData.category,
        description: expenseData.description,
        amount: expenseData.amount,
        currency: 'USD',
        vendor: `${expenseData.category} Vendor Inc`,
        createdBy: user.id
      })
      
      // Approve the expense
      await salesCaseService.approveExpense(expense.id, user.id)
      
      console.log(`   ✅ Created and approved ${expenseData.category} expense: $${expenseData.amount}`)
    }
    
    // 2. Add payments to invoices
    console.log('\n💰 Recording payments for invoices...')
    
    for (const order of salesCase.salesOrders) {
      for (const invoice of order.invoices) {
        if (invoice.totalAmount > invoice.paidAmount) {
          const paymentAmount = invoice.totalAmount - invoice.paidAmount
          
          // Find cash account
          const cashAccount = await prisma.account.findFirst({
            where: {
              OR: [
                { code: '1010' }, // Cash
                { name: { contains: 'Cash' } }
              ]
            }
          })
          
          if (!cashAccount) {
            console.log('   ⚠️  No cash account found, skipping payment')
            continue
          }
          
          // Create payment
          const payment = await prisma.payment.create({
            data: {
              paymentNumber: `PAY-${Date.now()}`,
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              accountId: cashAccount.id,
              amount: paymentAmount,
              paymentDate: new Date(),
              paymentMethod: PaymentMethod.BANK_TRANSFER,
              status: PaymentStatus.COMPLETED,
              reference: `Payment for ${invoice.invoiceNumber}`,
              createdBy: user.id
            }
          })
          
          // Update invoice paid amount
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: invoice.totalAmount,
              status: 'PAID'
            }
          })
          
          console.log(`   ✅ Recorded payment of $${paymentAmount} for invoice ${invoice.invoiceNumber}`)
        }
      }
    }
    
    // 3. Recalculate sales case profitability
    console.log('\n📈 Updating sales case profitability...')
    
    // Force update to trigger recalculation
    await salesCaseService.updateSalesCase(
      salesCase.id,
      { 
        actualValue: salesCase.actualValue // Trigger recalculation
      },
      user.id
    )
    
    // Get updated summary
    const summary = await salesCaseService.getSalesCaseSummary(salesCase.id)
    
    console.log('\n✅ Test data added successfully!')
    console.log('\n📊 Updated Profitability Summary:')
    console.log(`   Revenue: $${summary.revenue.toFixed(2)}`)
    console.log(`   FIFO Cost: $${summary.fifoCost.toFixed(2)}`)
    console.log(`   Expenses: $${summary.totalExpenses.toFixed(2)}`)
    console.log(`   Total Cost: $${(summary.fifoCost + summary.totalExpenses).toFixed(2)}`)
    console.log(`   Profit: $${summary.actualProfit.toFixed(2)}`)
    console.log(`   Margin: ${summary.profitMargin.toFixed(2)}%`)
    
  } catch (error) {
    console.error('❌ Error adding test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addProfitabilityTestData()