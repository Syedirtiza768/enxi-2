import { prisma } from '@/lib/db/prisma'
import { SalesCaseService } from '@/lib/services/sales-case.service'

async function recalculateSalesCaseCosts() {
  console.log('🔧 Recalculating costs for all sales cases\n')
  
  const salesCaseService = new SalesCaseService()
  
  try {
    // Get a sample user for audit trail
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }
    
    // Get all non-open sales cases
    const salesCases = await prisma.salesCase.findMany({
      where: {
        status: { not: 'OPEN' }
      }
    })
    
    console.log(`Found ${salesCases.length} closed sales cases to recalculate\n`)
    
    let updated = 0
    
    for (const salesCase of salesCases) {
      // Trigger cost recalculation by updating the case
      await salesCaseService.updateSalesCase(
        salesCase.id,
        {
          // Just trigger the update without changing values
          actualValue: salesCase.actualValue
        },
        user.id
      )
      
      updated++
      
      // Get the updated case
      const updatedCase = await salesCaseService.getSalesCase(salesCase.id)
      if (updatedCase) {
        console.log(`✅ ${updatedCase.caseNumber}: Cost=$${updatedCase.cost.toFixed(2)}, Margin=${updatedCase.profitMargin.toFixed(2)}%`)
      }
    }
    
    console.log(`\n✅ Recalculated costs for ${updated} sales cases`)
    
  } catch (error) {
    console.error('❌ Error recalculating costs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

recalculateSalesCaseCosts()