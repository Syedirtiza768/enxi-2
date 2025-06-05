import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

// GET /api/three-way-matching/export - Export matching exceptions report
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const supplierId = searchParams.get('supplierId')
    const minVarianceAmount = searchParams.get('minVarianceAmount')

    const threeWayMatchingService = new ThreeWayMatchingService()
    const report = await threeWayMatchingService.generateExceptionsReport({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      supplierId: supplierId || undefined,
      minVarianceAmount: minVarianceAmount ? parseFloat(minVarianceAmount) : undefined
    })

    // Generate CSV content
    const csvHeaders = [
      'Purchase Order',
      'Supplier',
      'Exception Type',
      'Severity',
      'Variance Amount',
      'Variance Percentage',
      'Description',
      'Created Date'
    ]

    const csvRows = report.exceptions.map(ex => [
      ex.purchaseOrder.poNumber,
      ex.purchaseOrder.supplier.name,
      ex.type,
      ex.severity,
      ex.variance?.toFixed(2) || '',
      ex.variancePercentage?.toFixed(1) + '%' || '',
      ex.description.replace(/"/g, '""'), // Escape quotes
      new Date(ex.createdAt).toLocaleDateString()
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="three-way-matching-exceptions-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}