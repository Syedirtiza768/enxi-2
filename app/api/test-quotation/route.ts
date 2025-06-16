import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Test 1: Database connection
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Database connection test:', dbTest)

    // Test 2: Count sales cases
    const salesCaseCount = await prisma.salesCase.count()
    console.log('Sales cases count:', salesCaseCount)

    // Test 3: Get first open sales case
    const openSalesCase = await prisma.salesCase.findFirst({
      where: { status: 'OPEN' },
      include: { customer: true }
    })
    console.log('Open sales case:', openSalesCase?.id, 'Customer:', openSalesCase?.customer?.name)

    // Test 4: Check company settings
    const settings = await prisma.companySettings.findFirst()
    console.log('Company settings:', settings?.id)

    return NextResponse.json({
      success: true,
      tests: {
        database: 'OK',
        salesCaseCount,
        hasOpenSalesCase: !!openSalesCase,
        hasCustomer: !!openSalesCase?.customer,
        hasSettings: !!settings,
        openSalesCaseId: openSalesCase?.id,
        customerName: openSalesCase?.customer?.name
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}