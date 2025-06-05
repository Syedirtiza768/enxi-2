import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoiceType, InvoiceStatus } from '@/lib/generated/prisma'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  salesOrderId: z.string().optional(),
  customerId: z.string(),
  type: z.nativeEnum(InvoiceType).optional(),
  dueDate: z.string().datetime(),
  paymentTerms: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(),
    itemCode: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional()
  })).min(1)
})

export async function GET(_request: NextRequest) {
  try {
    const invoiceService = new InvoiceService()
    const { searchParams } = new URL(_request.url)
    
    const filters = {
      status: searchParams.get('status') as InvoiceStatus || undefined,
      type: searchParams.get('type') as InvoiceType || undefined,
      customerId: searchParams.get('customerId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      overdue: searchParams.get('overdue') === 'true'
    }

    const invoices = await invoiceService.getAllInvoices(filters)
    
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error getting invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await _request.json()
    const data = createInvoiceSchema.parse(body)
    
    const invoiceService = new InvoiceService()
    
    const invoiceData = {
      ...data,
      dueDate: new Date(data.dueDate),
      createdBy: userId
    }
    
    const invoice = await invoiceService.createInvoice(invoiceData)
    
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}