import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

// POST /api/customers/export - Export customers
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const { 
      customerIds, 
      format = 'csv', 
      includeBalances = false 
    } = body

    const customerService = new CustomerService()
    
    // Get customers to export
    let customers
    if (customerIds && customerIds.length > 0) {
      // Export specific customers
      customers = await Promise.all(
        customerIds.map((id: string) => customerService.getCustomer(id))
      )
      customers = customers.filter(Boolean) // Remove null values
    } else {
      // Export all customers
      const result = await customerService.getAllCustomers({})
      customers = result.customers
    }

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No customers found to export' },
        { status: 400 }
      )
    }

    // Generate export data
    const exportData = customers.map(customer => ({
      'Customer Number': customer.customerNumber,
      'Name': customer.name,
      'Email': customer.email,
      'Phone': customer.phone || '',
      'Industry': customer.industry || '',
      'Website': customer.website || '',
      'Address': customer.address || '',
      'Tax ID': customer.taxId || '',
      'Currency': customer.currency,
      'Credit Limit': customer.creditLimit,
      'Payment Terms': customer.paymentTerms,
      'Status': customer.isActive ? 'Active' : 'Inactive',
      ...(includeBalances && {
        'Account Balance': customer.account?.balance || 0
      }),
      'Created Date': new Date(customer.createdAt).toLocaleDateString(),
      'Updated Date': new Date(customer.updatedAt).toLocaleDateString()
    }))

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (format === 'xlsx') {
      // For XLSX, we'd need a library like xlsx
      // For now, return JSON that can be processed by the frontend
      return NextResponse.json({
        success: true,
        data: exportData,
        format: 'xlsx',
        filename: `customers-${new Date().toISOString().split('T')[0]}.xlsx`
      })
    }

    return NextResponse.json({
      success: true,
      data: exportData
    })
    
  } catch (error: unknown) {
    console.error('Error exporting customers:', error)
    
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    )
  }
}