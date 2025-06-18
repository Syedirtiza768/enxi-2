import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { OrderStatus } from '@/lib/generated/prisma'

// GET /api/sales-orders/export - Export sales orders report
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const status = searchParams.get('status')
    const salesCaseId = searchParams.get('salesCaseId')
    const customerId = searchParams.get('customerId')

    const salesOrderService = new SalesOrderService()
    
    // Build filter conditions
    const where: any = {}
    
    if (dateFrom || dateTo) {
      where.orderDate = {}
      if (dateFrom) where.orderDate.gte = new Date(dateFrom)
      if (dateTo) where.orderDate.lte = new Date(dateTo)
    }
    
    if (status) {
      where.status = status
    }
    
    if (salesCaseId) {
      where.salesCaseId = salesCaseId
    }
    
    if (customerId) {
      where.salesCase = {
        customerId: customerId
      }
    }

    const orders = await salesOrderService.getSalesOrders({
      where,
      orderBy: { orderDate: 'desc' },
      take: 1000 // Limit export to 1000 records
    })

    // Generate CSV content
    const csvHeaders = [
      'Order Number',
      'Customer',
      'Sales Case',
      'Status',
      'Order Date',
      'Requested Date',
      'Promised Date',
      'Total Amount',
      'Fulfilled Amount',
      'Shipped Amount',
      'Invoiced Amount',
      'Payment Terms',
      'Shipping Terms',
      'Customer PO',
      'Created By',
      'Created At'
    ]

    const csvRows = orders.map(order => [
      order.orderNumber,
      order.salesCase.customer.name,
      order.salesCase.title,
      order.status,
      new Date(order.orderDate).toLocaleDateString(),
      order.requestedDate ? new Date(order.requestedDate).toLocaleDateString() : '',
      order.promisedDate ? new Date(order.promisedDate).toLocaleDateString() : '',
      order.totalAmount.toFixed(2),
      order.fulfilledAmount.toFixed(2),
      order.shippedAmount.toFixed(2),
      order.invoicedAmount.toFixed(2),
      order.paymentTerms || '',
      order.shippingTerms || '',
      order.customerPO || '',
      order.createdBy,
      new Date(order.createdAt).toLocaleDateString()
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sales-orders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting sales orders:', error)
    return NextResponse.json(
      { error: 'Failed to export sales orders' },
      { status: 500 }
    )
  }
}