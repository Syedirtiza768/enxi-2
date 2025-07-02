import { prisma } from '@/lib/db/prisma'

async function checkSalesCaseProfitabilityData() {
  console.log('🔍 Checking Sales Case Profitability Data\n')
  
  try {
    // Get sales cases with various data
    const salesCases = await prisma.salesCase.findMany({
      where: {
        status: { in: ['WON', 'LOST'] }
      },
      include: {
        customer: true,
        quotations: true,
        salesOrders: {
          include: {
            items: true
          }
        },
        expenses: true,
        _count: {
          select: {
            quotations: true,
            salesOrders: true,
            expenses: true
          }
        }
      },
      take: 5
    })
    
    console.log(`Found ${salesCases.length} closed sales cases\n`)
    
    for (const salesCase of salesCases) {
      console.log(`📊 Sales Case: ${salesCase.caseNumber}`)
      console.log(`   Title: ${salesCase.title}`)
      console.log(`   Status: ${salesCase.status}`)
      console.log(`   Customer: ${salesCase.customer.name}`)
      console.log(`   Estimated Value: $${salesCase.estimatedValue.toFixed(2)}`)
      console.log(`   Actual Value: $${salesCase.actualValue.toFixed(2)}`)
      console.log(`   Cost: $${salesCase.cost.toFixed(2)}`)
      console.log(`   Profit Margin: ${salesCase.profitMargin.toFixed(2)}%`)
      console.log(`   Quotations: ${salesCase._count.quotations}`)
      console.log(`   Sales Orders: ${salesCase._count.salesOrders}`)
      console.log(`   Expenses: ${salesCase._count.expenses}`)
      
      // Check for related invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          salesOrderId: {
            in: salesCase.salesOrders.map(so => so.id)
          }
        }
      })
      
      console.log(`   Invoices: ${invoices.length}`)
      
      if (invoices.length > 0) {
        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
        console.log(`   Total Invoiced: $${totalInvoiced.toFixed(2)}`)
        console.log(`   Total Paid: $${totalPaid.toFixed(2)}`)
      }
      
      // Check delivered items for FIFO cost calculation
      const deliveredItems = await prisma.shipmentItem.findMany({
        where: {
          shipment: {
            salesOrderId: {
              in: salesCase.salesOrders.map(so => so.id)
            },
            status: 'DELIVERED'
          }
        },
        include: {
          item: true,
          shipment: true
        }
      })
      
      console.log(`   Delivered Items: ${deliveredItems.length}`)
      
      console.log('---')
    }
    
    // Check for any sales cases with expenses
    const casesWithExpenses = await prisma.salesCase.findMany({
      where: {
        expenses: {
          some: {
            status: { in: ['APPROVED', 'PAID'] }
          }
        }
      },
      include: {
        expenses: {
          where: {
            status: { in: ['APPROVED', 'PAID'] }
          }
        }
      }
    })
    
    console.log(`\n📝 Sales Cases with Approved/Paid Expenses: ${casesWithExpenses.length}`)
    
    for (const sc of casesWithExpenses) {
      const totalExpenses = sc.expenses.reduce((sum, exp) => sum + exp.baseAmount, 0)
      console.log(`   ${sc.caseNumber}: ${sc.expenses.length} expenses totaling $${totalExpenses.toFixed(2)}`)
    }
    
    // Check inventory movements for FIFO calculation
    const stockMovements = await prisma.stockMovement.count({
      where: {
        movementType: 'SALE'
      }
    })
    
    console.log(`\n📦 Stock Movements (SALE type): ${stockMovements}`)
    
    // Check if FIFO cost calculation is implemented
    const firstStockLot = await prisma.stockLot.findFirst({
      orderBy: {
        receivedDate: 'asc'
      }
    })
    
    if (firstStockLot) {
      console.log(`\n💰 FIFO Data Available:`)
      console.log(`   First Stock Lot: ${firstStockLot.lotNumber}`)
      console.log(`   Unit Cost: $${firstStockLot.unitCost.toFixed(2)}`)
      console.log(`   Available Qty: ${firstStockLot.availableQty}`)
    } else {
      console.log(`\n⚠️  No stock lots found for FIFO calculation`)
    }
    
  } catch (error) {
    console.error('❌ Error checking profitability data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSalesCaseProfitabilityData()