import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice.service';
import { withUniversalErrorHandling } from '@/lib/middleware/universal-error-wrapper';
import PDFDocument from 'pdfkit';

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

  // Create PDF
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  
  // Generate PDF content
  doc.fontSize(20).text('INVOICE', 50, 50);
  doc.fontSize(14).text(`Invoice #: ${invoice.invoiceNumber}`, 50, 80);
  doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 50, 100);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 120);
  
  // Customer info
  doc.fontSize(16).text('Bill To:', 50, 160);
  doc.fontSize(12).text(invoice.customer.name, 50, 180);
  doc.text(invoice.billingAddress, 50, 200);
  
  // Items table
  let yPosition = 280;
  doc.fontSize(14).text('Items', 50, yPosition);
  yPosition += 30;
  
  // Table headers
  doc.fontSize(10);
  doc.text('Description', 50, yPosition);
  doc.text('Qty', 250, yPosition);
  doc.text('Price', 300, yPosition);
  doc.text('Total', 400, yPosition);
  yPosition += 20;
  
  // Table rows
  invoice.items.forEach((item) => {
    doc.text(item.description, 50, yPosition);
    doc.text(item.quantity.toString(), 250, yPosition);
    doc.text(`$${item.unitPrice.toFixed(2)}`, 300, yPosition);
    doc.text(`$${item.totalAmount.toFixed(2)}`, 400, yPosition);
    yPosition += 20;
  });
  
  // Totals
  yPosition += 20;
  doc.fontSize(12);
  doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 350, yPosition);
  yPosition += 20;
  if (invoice.taxAmount > 0) {
    doc.text(`Tax: $${invoice.taxAmount.toFixed(2)}`, 350, yPosition);
    yPosition += 20;
  }
  if (invoice.discountAmount > 0) {
    doc.text(`Discount: -$${invoice.discountAmount.toFixed(2)}`, 350, yPosition);
    yPosition += 20;
  }
  doc.fontSize(14).text(`Total: $${invoice.totalAmount.toFixed(2)}`, 350, yPosition);
  
  if (invoice.paidAmount > 0) {
    yPosition += 20;
    doc.fontSize(12).text(`Paid: -$${invoice.paidAmount.toFixed(2)}`, 350, yPosition);
    yPosition += 20;
    doc.fontSize(14).text(`Balance Due: $${invoice.balanceAmount.toFixed(2)}`, 350, yPosition);
  }
  
  // Notes
  if (invoice.notes) {
    yPosition += 40;
    doc.fontSize(12).text('Notes:', 50, yPosition);
    yPosition += 20;
    doc.fontSize(10).text(invoice.notes, 50, yPosition);
  }
  
  doc.end();

  // Wait for PDF generation to complete
  return new Promise<NextResponse>((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      const response = new NextResponse(pdfBuffer);
      response.headers.set('Content-Type', 'application/pdf');
      response.headers.set('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      resolve(response);
    });
  });
}

export const GET = withUniversalErrorHandling(handler, '/api/customer/invoices/[id]/pdf');