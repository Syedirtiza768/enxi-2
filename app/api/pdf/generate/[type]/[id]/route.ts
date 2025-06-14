import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#4B5563',
  },
  value: {
    width: '70%',
    color: '#1F2937',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 8,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableCell: {
    fontSize: 10,
    color: '#1F2937',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const options = await request.json();

    // Fetch document data based on type
    let documentData;
    
    switch (type) {
      case 'invoice':
        documentData = await fetchInvoiceData(id);
        break;
      case 'quotation':
        documentData = await fetchQuotationData(id);
        break;
      case 'purchase-order':
        documentData = await fetchPurchaseOrderData(id);
        break;
      case 'delivery-note':
        documentData = await fetchDeliveryNoteData(id);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported document type' },
          { status: 400 }
        );
    }

    if (!documentData) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfDoc = React.createElement(DocumentPDF, { data: documentData });
    const pdfBuffer = await renderToBuffer(pdfDoc);

    // Save PDF file
    const fileId = uuidv4();
    const fileName = `${type}-${id}-${fileId}.pdf`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'pdfs', fileName);
    
    await writeFile(filePath, pdfBuffer);

    // Generate URL
    const fileUrl = `/uploads/pdfs/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: fileName,
      size: pdfBuffer.length,
      pages: 1, // Could be calculated from PDF
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF generation failed' 
      },
      { status: 500 }
    );
  }
}

// Document PDF Component
const DocumentPDF: React.FC<{ data: any }> = ({ data }) => (
  React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, {},
          React.createElement(Text, { style: styles.title }, data.title),
          data.subtitle && React.createElement(Text, { style: styles.subtitle }, data.subtitle)
        ),
        React.createElement(View, {},
          data.date && React.createElement(Text, {}, `Date: ${data.date}`)
        )
      ),

      // Company Information
      data.company && React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'From'),
        React.createElement(Text, {}, data.company.name),
        React.createElement(Text, {}, data.company.address),
        data.company.phone && React.createElement(Text, {}, `Phone: ${data.company.phone}`),
        data.company.email && React.createElement(Text, {}, `Email: ${data.company.email}`)
      ),

      // Customer Information
      data.customer && React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'To'),
        React.createElement(Text, {}, data.customer.name),
        React.createElement(Text, {}, data.customer.address),
        data.customer.phone && React.createElement(Text, {}, `Phone: ${data.customer.phone}`),
        data.customer.email && React.createElement(Text, {}, `Email: ${data.customer.email}`)
      ),

      // Items Table
      data.items && data.items.length > 0 && React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Items'),
        React.createElement(View, { style: styles.table },
          // Table Header
          React.createElement(View, { style: styles.tableRow },
            React.createElement(View, { style: styles.tableColHeader },
              React.createElement(Text, { style: styles.tableCellHeader }, 'Description')
            ),
            React.createElement(View, { style: styles.tableColHeader },
              React.createElement(Text, { style: styles.tableCellHeader }, 'Quantity')
            ),
            React.createElement(View, { style: styles.tableColHeader },
              React.createElement(Text, { style: styles.tableCellHeader }, 'Unit Price')
            ),
            React.createElement(View, { style: styles.tableColHeader },
              React.createElement(Text, { style: styles.tableCellHeader }, 'Total')
            )
          ),
          
          // Table Rows
          ...data.items.map((item: any, index: number) =>
            React.createElement(View, { style: styles.tableRow, key: index },
              React.createElement(View, { style: styles.tableCol },
                React.createElement(Text, { style: styles.tableCell }, item.description)
              ),
              React.createElement(View, { style: styles.tableCol },
                React.createElement(Text, { style: styles.tableCell }, item.quantity.toString())
              ),
              React.createElement(View, { style: styles.tableCol },
                React.createElement(Text, { style: styles.tableCell }, `$${item.unitPrice.toFixed(2)}`)
              ),
              React.createElement(View, { style: styles.tableCol },
                React.createElement(Text, { style: styles.tableCell }, `$${item.total.toFixed(2)}`)
              )
            )
          )
        )
      ),

      // Totals
      data.totals && React.createElement(View, { style: [styles.section, { alignItems: 'flex-end' }] },
        React.createElement(View, { style: { width: '40%' } },
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Subtotal:'),
            React.createElement(Text, { style: styles.value }, `$${data.totals.subtotal.toFixed(2)}`)
          ),
          data.totals.tax && React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Tax:'),
            React.createElement(Text, { style: styles.value }, `$${data.totals.tax.toFixed(2)}`)
          ),
          React.createElement(View, { style: [styles.row, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 5 }] },
            React.createElement(Text, { style: [styles.label, { fontWeight: 'bold' }] }, 'Total:'),
            React.createElement(Text, { style: [styles.value, { fontWeight: 'bold' }] }, `$${data.totals.total.toFixed(2)}`)
          )
        )
      ),

      // Notes
      data.notes && React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Notes'),
        React.createElement(Text, {}, data.notes)
      ),

      // Footer
      React.createElement(Text, { style: styles.footer },
        `Generated on ${new Date().toLocaleDateString()} - ${data.title}`
      )
    )
  )
);

// Data fetching functions
async function fetchInvoiceData(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      invoiceItems: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  if (!invoice) return null;

  return {
    title: 'Invoice',
    subtitle: invoice.invoiceNumber,
    date: invoice.invoiceDate?.toLocaleDateString(),
    company: {
      name: 'Enxi ERP Solutions',
      address: '123 Business Street, Dubai, UAE',
      phone: '+971-4-123-4567',
      email: 'info@enxi.com',
    },
    customer: {
      name: invoice.customer.name,
      address: invoice.customer.address || '',
      phone: invoice.customer.phone || '',
      email: invoice.customer.email || '',
    },
    items: invoice.invoiceItems.map(item => ({
      description: item.inventoryItem?.name || item.description || '',
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalAmount.toString()),
    })),
    totals: {
      subtotal: parseFloat(invoice.subtotalAmount.toString()),
      tax: parseFloat(invoice.taxAmount.toString()),
      total: parseFloat(invoice.totalAmount.toString()),
    },
    notes: invoice.notes || '',
  };
}

async function fetchQuotationData(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      quotationItems: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  if (!quotation) return null;

  return {
    title: 'Quotation',
    subtitle: quotation.quotationNumber,
    date: quotation.quotationDate?.toLocaleDateString(),
    company: {
      name: 'Enxi ERP Solutions',
      address: '123 Business Street, Dubai, UAE',
      phone: '+971-4-123-4567',
      email: 'info@enxi.com',
    },
    customer: {
      name: quotation.customer.name,
      address: quotation.customer.address || '',
      phone: quotation.customer.phone || '',
      email: quotation.customer.email || '',
    },
    items: quotation.quotationItems.map(item => ({
      description: item.inventoryItem?.name || item.description || '',
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalAmount.toString()),
    })),
    totals: {
      subtotal: parseFloat(quotation.subtotalAmount.toString()),
      tax: parseFloat(quotation.taxAmount.toString()),
      total: parseFloat(quotation.totalAmount.toString()),
    },
    notes: quotation.notes || '',
  };
}

async function fetchPurchaseOrderData(id: string) {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchaseOrderItems: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  if (!purchaseOrder) return null;

  return {
    title: 'Purchase Order',
    subtitle: purchaseOrder.purchaseOrderNumber,
    date: purchaseOrder.orderDate?.toLocaleDateString(),
    company: {
      name: 'Enxi ERP Solutions',
      address: '123 Business Street, Dubai, UAE',
      phone: '+971-4-123-4567',
      email: 'info@enxi.com',
    },
    customer: {
      name: purchaseOrder.supplier.name,
      address: purchaseOrder.supplier.address || '',
      phone: purchaseOrder.supplier.phone || '',
      email: purchaseOrder.supplier.email || '',
    },
    items: purchaseOrder.purchaseOrderItems.map(item => ({
      description: item.inventoryItem?.name || item.description || '',
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalAmount.toString()),
    })),
    totals: {
      subtotal: parseFloat(purchaseOrder.subtotalAmount.toString()),
      tax: parseFloat(purchaseOrder.taxAmount.toString()),
      total: parseFloat(purchaseOrder.totalAmount.toString()),
    },
    notes: purchaseOrder.notes || '',
  };
}

async function fetchDeliveryNoteData(id: string) {
  // Simplified delivery note data - you would fetch from your delivery/shipment table
  return {
    title: 'Delivery Note',
    subtitle: `DN-${id}`,
    date: new Date().toLocaleDateString(),
    company: {
      name: 'Enxi ERP Solutions',
      address: '123 Business Street, Dubai, UAE',
      phone: '+971-4-123-4567',
      email: 'info@enxi.com',
    },
    customer: {
      name: 'Sample Customer',
      address: '456 Customer Ave, Dubai, UAE',
    },
    items: [
      {
        description: 'Sample Item',
        quantity: 1,
        unitPrice: 100,
        total: 100,
      },
    ],
    totals: {
      subtotal: 100,
      tax: 5,
      total: 105,
    },
    notes: 'Items delivered successfully.',
  };
}