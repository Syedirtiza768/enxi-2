import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import path from 'path'

interface InvoicePDFData {
  id: string
  invoiceNumber: string
  status: string
  invoiceDate: Date | string
  dueDate: Date | string
  createdAt: Date | string
  customer: {
    name: string
    email?: string
    phone?: string
    address?: string
  }
  billingAddress?: string
  shippingAddress?: string
  currency?: string
  subtotal: number | string
  subtotalAmount?: number
  discountAmount: number | string
  taxAmount: number | string
  totalAmount: number | string
  paidAmount?: number | string
  balanceAmount?: number | string
  paymentTerms?: string
  notes?: string
  internalNotes?: string
  lines?: Array<{
    lineNumber: number
    lineDescription: string
    items: Array<{
      id?: string
      lineNumber: number
      lineDescription?: string
      isLineHeader: boolean
      itemType: string
      itemId?: string
      itemCode: string
      description: string
      internalDescription?: string
      quantity: number
      unitPrice: number | string
      cost?: number
      discount: number
      taxRate: number
      taxRateId?: string
      unitOfMeasureId?: string
      subtotal: number | string
      discountAmount: number | string
      taxAmount: number | string
      totalAmount: number | string
      sortOrder: number
    }>
  }>
  items?: Array<{
    id?: string
    lineNumber: number
    lineDescription?: string
    isLineHeader: boolean
    itemType: string
    itemId?: string
    itemCode: string
    description: string
    internalDescription?: string
    quantity: number
    unitPrice: number | string
    cost?: number
    discount: number
    taxRate: number
    taxRateId?: string
    unitOfMeasureId?: string
    subtotal: number | string
    discountAmount: number | string
    taxAmount: number | string
    totalAmount: number | string
    sortOrder: number
  }>
}

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  logo: {
    width: 150,
    height: 60,
    marginBottom: 10,
    objectFit: 'contain',
  },
  companyInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1F2937',
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  documentNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 3,
  },
  customerSection: {
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customerInfo: {
    flex: 1,
  },
  documentInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  text: {
    fontSize: 11,
    color: '#4B5563',
    marginBottom: 3,
  },
  boldText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: 2,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
    minHeight: 35,
  },
  colDescription: {
    width: '40%',
    paddingRight: 10,
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '15%',
    textAlign: 'right',
  },
  colAmount: {
    width: '30%',
    textAlign: 'right',
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 10,
    color: '#1F2937',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#4B5563',
  },
  totalValue: {
    fontSize: 11,
    color: '#1F2937',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: 2,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  notesSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  notesText: {
    fontSize: 10,
    color: '#4B5563',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    borderTop: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  paidBadge: {
    backgroundColor: '#10B981',
  },
  unpaidBadge: {
    backgroundColor: '#EF4444',
  },
  partialBadge: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
})

interface InvoicePDFProps {
  invoice: InvoicePDFData
  companyInfo: {
    name: string
    address?: string
    phone?: string
    email?: string
    taxNumber?: string
  }
  showLogo?: boolean
  showTaxBreakdown?: boolean
  viewType?: 'client' | 'internal'
}

// Helper function to format currency
const formatCurrency = (amount: number | string, currency: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}

// Helper function to format date
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Helper function to determine invoice status
const getInvoiceStatus = (invoice: InvoicePDFData): { status: string; style: any } => {
  const total = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount
  const paid = invoice.paidAmount ? (typeof invoice.paidAmount === 'string' ? parseFloat(invoice.paidAmount) : invoice.paidAmount) : 0
  
  if (paid >= total) {
    return { status: 'PAID', style: styles.paidBadge }
  } else if (paid > 0) {
    return { status: 'PARTIAL', style: styles.partialBadge }
  } else {
    return { status: 'UNPAID', style: styles.unpaidBadge }
  }
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ 
  invoice, 
  companyInfo, 
  showLogo = true,
  showTaxBreakdown = true,
  viewType = 'client' 
}) => {
  const items = invoice.items || invoice.lines || []
  const currency = invoice.currency || 'USD'
  const { status, style: statusStyle } = getInvoiceStatus(invoice)
  
  // Calculate values
  const subtotal = invoice.subtotalAmount || invoice.subtotal
  const taxAmount = typeof invoice.taxAmount === 'string' ? parseFloat(invoice.taxAmount) : invoice.taxAmount
  const discountAmount = typeof invoice.discountAmount === 'string' ? parseFloat(invoice.discountAmount) : invoice.discountAmount
  const totalAmount = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount
  const paidAmount = invoice.paidAmount ? (typeof invoice.paidAmount === 'string' ? parseFloat(invoice.paidAmount) : invoice.paidAmount) : 0
  const balanceAmount = invoice.balanceAmount ? (typeof invoice.balanceAmount === 'string' ? parseFloat(invoice.balanceAmount) : invoice.balanceAmount) : (totalAmount - paidAmount)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {showLogo && (
              <Image 
                style={styles.logo} 
                src={path.join(process.cwd(), 'public', 'logo.png')}
              />
            )}
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            {companyInfo.address && <Text style={styles.text}>{companyInfo.address}</Text>}
            {companyInfo.phone && <Text style={styles.text}>Phone: {companyInfo.phone}</Text>}
            {companyInfo.email && <Text style={styles.text}>Email: {companyInfo.email}</Text>}
            {companyInfo.taxNumber && <Text style={styles.text}>Tax No: {companyInfo.taxNumber}</Text>}
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.documentTitle}>INVOICE</Text>
              <View style={[styles.statusBadge, statusStyle]}>
                <Text style={styles.badgeText}>{status}</Text>
              </View>
            </View>
            <Text style={styles.documentNumber}>#{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Customer and Invoice Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={styles.boldText}>{invoice.customer.name}</Text>
            {invoice.billingAddress && <Text style={styles.text}>{invoice.billingAddress}</Text>}
            {!invoice.billingAddress && invoice.customer.address && <Text style={styles.text}>{invoice.customer.address}</Text>}
            {invoice.customer.phone && <Text style={styles.text}>Phone: {invoice.customer.phone}</Text>}
            {invoice.customer.email && <Text style={styles.text}>Email: {invoice.customer.email}</Text>}
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.text}>Invoice Date: {formatDate(invoice.invoiceDate)}</Text>
            <Text style={styles.text}>Due Date: {formatDate(invoice.dueDate)}</Text>
            {invoice.paymentTerms && <Text style={styles.text}>Terms: {invoice.paymentTerms}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          
          {viewType === 'client' && invoice.lines ? (
            // Client view - show line descriptions only
            invoice.lines.map((line, lineIndex) => {
              const lineTotal = line.items.reduce((sum, item) => {
                const amount = typeof item.totalAmount === 'string' ? parseFloat(item.totalAmount) : item.totalAmount
                return sum + amount
              }, 0)
              const lineQty = line.items.reduce((sum, item) => sum + item.quantity, 0)
              
              return (
                <View key={lineIndex} style={styles.tableRow}>
                  <Text style={[styles.cellText, styles.colDescription]}>
                    {line.lineDescription || `Line ${line.lineNumber}`}
                  </Text>
                  <Text style={[styles.cellText, styles.colQty]}>{lineQty}</Text>
                  <Text style={[styles.cellText, styles.colPrice]}>-</Text>
                  <Text style={[styles.cellText, styles.colAmount]}>
                    {formatCurrency(lineTotal, currency)}
                  </Text>
                </View>
              )
            })
          ) : (
            // Internal view or flat items - show all item details
            items.map((item, index) => {
              if (item.isLineHeader && item.lineDescription) {
                // Line header row
                return (
                  <View key={item.id || `header-${index}`} style={[styles.tableRow, { backgroundColor: '#F9FAFB' }]}>
                    <Text style={[styles.cellText, styles.colDescription, { fontWeight: 'bold' }]}>
                      {item.lineDescription}
                    </Text>
                    <Text style={[styles.cellText, styles.colQty]}>-</Text>
                    <Text style={[styles.cellText, styles.colPrice]}>-</Text>
                    <Text style={[styles.cellText, styles.colAmount]}>-</Text>
                  </View>
                )
              }
              
              // Regular item row
              const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice
              const totalAmount = typeof item.totalAmount === 'string' ? parseFloat(item.totalAmount) : item.totalAmount
              
              return (
                <View key={item.id || index} style={styles.tableRow}>
                  <Text style={[styles.cellText, styles.colDescription]}>
                    {item.description}
                    {viewType === 'internal' && item.internalDescription && (
                      <Text style={{ fontSize: 9, color: '#6B7280' }}>
                        {'\n'}{item.internalDescription}
                      </Text>
                    )}
                  </Text>
                  <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
                  <Text style={[styles.cellText, styles.colPrice]}>
                    {formatCurrency(unitPrice, currency)}
                  </Text>
                  <Text style={[styles.cellText, styles.colAmount]}>
                    {formatCurrency(totalAmount, currency)}
                  </Text>
                </View>
              )
            })
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal, currency)}</Text>
          </View>
          
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-{formatCurrency(discountAmount, currency)}</Text>
            </View>
          )}
          
          {showTaxBreakdown && taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(taxAmount, currency)}</Text>
            </View>
          )}
          
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(totalAmount, currency)}</Text>
          </View>
          
          {paidAmount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid:</Text>
                <Text style={styles.totalValue}>{formatCurrency(paidAmount, currency)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Balance Due:</Text>
                <Text style={styles.totalValue}>{formatCurrency(balanceAmount, currency)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && viewType === 'client' && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
        
        {invoice.internalNotes && viewType === 'internal' && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Internal Notes</Text>
            <Text style={styles.notesText}>{invoice.internalNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ marginBottom: 5 }}>Thank you for your business!</Text>
          <Text style={{ fontSize: 8 }}>
            This is a computer-generated invoice and is valid without signature.
          </Text>
          <Text style={{ fontSize: 8, marginTop: 5 }}>
            {companyInfo.name} • {companyInfo.email} • {companyInfo.phone}
          </Text>
        </View>
      </Page>
    </Document>
  )
}