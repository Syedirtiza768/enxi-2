import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice.service';
import { prisma } from '@/lib/db/prisma';
import { withUniversalErrorHandling } from '@/lib/middleware/universal-error-wrapper';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;

  // TODO: Add proper customer authentication
  // For now, we'll just check if the invoice exists
  // In production, verify that the logged-in customer has access to this invoice
  
  const invoiceService = new InvoiceService();
  const invoice = await invoiceService.getInvoiceById(invoiceId);
  
  if (!invoice) {
    return NextResponse.json(
      { error: 'Invoice not found' },
      { status: 404 }
    );
  }

  // Transform invoice data for customer view
  const customerInvoice = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type,
    status: invoice.status,
    customer: {
      name: invoice.customer.name,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
      billingAddress: invoice.customer.billingAddress
    },
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    paymentTerms: invoice.paymentTerms,
    billingAddress: invoice.billingAddress,
    notes: invoice.notes,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    discountAmount: invoice.discountAmount,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    items: invoice.items.map(item => ({
      id: item.id,
      itemCode: item.itemCode,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      subtotal: item.subtotal,
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
      totalAmount: item.totalAmount
    })),
    payments: invoice.payments ? invoice.payments.map(payment => ({
      id: payment.id,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference
    })) : []
  };

  // Mark invoice as viewed if it was sent
  if (invoice.status === 'SENT') {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'VIEWED' }
    });
  }

  return NextResponse.json(customerInvoice);
}

export const GET = withUniversalErrorHandling(handler, '/api/customer/invoices/[id]');