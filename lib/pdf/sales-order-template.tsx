import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

interface SalesOrderPDFData {
  id: string
  orderNumber: string
  status: string
  version: number
  orderDate: Date | string
  requestedDate?: Date | string
  promisedDate?: Date | string
  createdAt: Date | string
  salesCase: {
    caseNumber: string
    title: string
    description?: string
    customer: {
      name: string
      email: string
      phone?: string
      address?: string
    }
  }
  quotation?: {
    quotationNumber: string
  }
  currency?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  customerPO?: string
  notes?: string
  internalNotes?: string
  lines?: Array<{
    lineNumber: number
    lineDescription: string
    quantity: number
    totalAmount: number
  }>
  items?: Array<{
    id: string
    lineNumber: number
    lineDescription?: string
    isLineHeader: boolean
    itemCode: string
    description: string
    internalDescription?: string
    quantity: number
    unitPrice: number
    discount: number
    taxRate: number
    totalAmount: number
    cost?: number
    margin?: number
    quantityReserved?: number
    quantityShipped?: number
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
    height: 50,
    marginBottom: 10,
    objectFit: 'contain',
  },
  companyInfo: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
  },
  orderInfo: {
    textAlign: 'right',
    minWidth: 200,
  },
  orderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
  },
  orderDetails: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginRight: 10,
    minWidth: 80,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  detailValue: {
    minWidth: 100,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
  },
  addresses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  addressBlock: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  customerInfo: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 35,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 35,
    alignItems: 'center',
  },
  lineHeader: {
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  tableCol: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  colItem: { width: '35%' },
  colQty: { width: '10%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colDiscount: { width: '10%', textAlign: 'right' },
  colTax: { width: '10%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'Helvetica-Bold',
  },
  itemCode: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 10,
    color: '#111827',
  },
  internalNote: {
    fontSize: 9,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 250,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  notes: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  notesText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#374151',
  },
})

interface SalesOrderPDFProps {
  salesOrder: SalesOrderPDFData
  companyInfo: {
    name: string
    address?: string
    email?: string
    phone?: string
    website?: string
    logo?: string
    footerText?: string
  }
  showLogo?: boolean
  showTaxBreakdown?: boolean
  viewType?: 'client' | 'internal'
}

export const SalesOrderPDF: React.FC<SalesOrderPDFProps> = ({
  salesOrder,
  companyInfo,
  showLogo = true,
  showTaxBreakdown = true,
  viewType = 'client'
}) => {
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatCurrency = (amount: number) => {
    // Use English literal format: CURRENCY_CODE AMOUNT
    const currency = salesOrder.currency || 'USD'
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
    return `${currency} ${formattedAmount}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#10B981'
      case 'SHIPPED':
        return '#3B82F6'
      case 'DELIVERED':
        return '#059669'
      case 'CANCELLED':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {showLogo && companyInfo.logo && (
              <Image style={styles.logo} src={companyInfo.logo} />
            )}
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            {companyInfo.address && <Text>{companyInfo.address}</Text>}
            {companyInfo.phone && <Text>Phone: {companyInfo.phone}</Text>}
            {companyInfo.email && <Text>Email: {companyInfo.email}</Text>}
            {companyInfo.website && <Text>Web: {companyInfo.website}</Text>}
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>SALES ORDER</Text>
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order #:</Text>
                <Text style={styles.detailValue}>{salesOrder.orderNumber}</Text>
              </View>
              {salesOrder.version > 1 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Version:</Text>
                  <Text style={styles.detailValue}>{salesOrder.version}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatDate(salesOrder.orderDate)}</Text>
              </View>
              {salesOrder.promisedDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Delivery:</Text>
                  <Text style={styles.detailValue}>{formatDate(salesOrder.promisedDate)}</Text>
                </View>
              )}
              {salesOrder.customerPO && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer PO:</Text>
                  <Text style={styles.detailValue}>{salesOrder.customerPO}</Text>
                </View>
              )}
              {salesOrder.quotation && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quote Ref:</Text>
                  <Text style={styles.detailValue}>{salesOrder.quotation.quotationNumber}</Text>
                </View>
              )}
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.status, { backgroundColor: getStatusColor(salesOrder.status), color: '#FFFFFF' }]}>
                {salesOrder.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer & Shipping Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.addresses}>
            <View style={styles.addressBlock}>
              <Text style={styles.addressTitle}>Bill To:</Text>
              <View style={styles.customerInfo}>
                <Text>{salesOrder.salesCase.customer.name}</Text>
                {salesOrder.billingAddress ? (
                  <Text>{salesOrder.billingAddress}</Text>
                ) : (
                  <>
                    {salesOrder.salesCase.customer.address && (
                      <Text>{salesOrder.salesCase.customer.address}</Text>
                    )}
                  </>
                )}
                {salesOrder.salesCase.customer.phone && (
                  <Text>Phone: {salesOrder.salesCase.customer.phone}</Text>
                )}
                {salesOrder.salesCase.customer.email && (
                  <Text>Email: {salesOrder.salesCase.customer.email}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.addressBlock}>
              <Text style={styles.addressTitle}>Ship To:</Text>
              <View style={styles.customerInfo}>
                <Text>{salesOrder.salesCase.customer.name}</Text>
                {salesOrder.shippingAddress ? (
                  <Text>{salesOrder.shippingAddress}</Text>
                ) : (
                  <Text>Same as billing address</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableCol, styles.colItem]}>
                <Text style={styles.tableHeaderText}>Item</Text>
              </View>
              <View style={[styles.tableCol, styles.colQty]}>
                <Text style={styles.tableHeaderText}>Qty</Text>
              </View>
              <View style={[styles.tableCol, styles.colPrice]}>
                <Text style={styles.tableHeaderText}>Unit Price</Text>
              </View>
              <View style={[styles.tableCol, styles.colDiscount]}>
                <Text style={styles.tableHeaderText}>Disc %</Text>
              </View>
              <View style={[styles.tableCol, styles.colTax]}>
                <Text style={styles.tableHeaderText}>Tax %</Text>
              </View>
              <View style={[styles.tableCol, styles.colTotal]}>
                <Text style={styles.tableHeaderText}>Total</Text>
              </View>
            </View>
            {salesOrder.items?.map((item, index) => (
              <View key={item.id} style={[styles.tableRow, item.isLineHeader && styles.lineHeader]}>
                <View style={[styles.tableCol, styles.colItem]}>
                  {item.isLineHeader ? (
                    <Text style={styles.itemDescription}>{item.lineDescription}</Text>
                  ) : (
                    <>
                      <Text style={styles.itemCode}>{item.itemCode}</Text>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                      {viewType === 'internal' && item.internalDescription && (
                        <Text style={styles.internalNote}>{item.internalDescription}</Text>
                      )}
                    </>
                  )}
                </View>
                <View style={[styles.tableCol, styles.colQty]}>
                  <Text>{item.isLineHeader ? '' : item.quantity}</Text>
                </View>
                <View style={[styles.tableCol, styles.colPrice]}>
                  <Text>{item.isLineHeader ? '' : formatCurrency(item.unitPrice)}</Text>
                </View>
                <View style={[styles.tableCol, styles.colDiscount]}>
                  <Text>{item.isLineHeader ? '' : item.discount ? `${item.discount}%` : '0%'}</Text>
                </View>
                <View style={[styles.tableCol, styles.colTax]}>
                  <Text>{item.isLineHeader ? '' : `${item.taxRate}%`}</Text>
                </View>
                <View style={[styles.tableCol, styles.colTotal]}>
                  <Text>{formatCurrency(item.totalAmount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(salesOrder.subtotal)}</Text>
          </View>
          {salesOrder.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-{formatCurrency(salesOrder.discountAmount)}</Text>
            </View>
          )}
          {showTaxBreakdown && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(salesOrder.taxAmount)}</Text>
            </View>
          )}
          {salesOrder.shippingAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Shipping:</Text>
              <Text style={styles.totalValue}>{formatCurrency(salesOrder.shippingAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(salesOrder.totalAmount)}</Text>
          </View>
        </View>

        {/* Terms and Notes */}
        {(salesOrder.paymentTerms || salesOrder.shippingTerms) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            {salesOrder.paymentTerms && (
              <Text style={styles.customerInfo}>Payment Terms: {salesOrder.paymentTerms}</Text>
            )}
            {salesOrder.shippingTerms && (
              <Text style={styles.customerInfo}>Shipping Terms: {salesOrder.shippingTerms}</Text>
            )}
          </View>
        )}

        {/* Notes */}
        {salesOrder.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{salesOrder.notes}</Text>
          </View>
        )}

        {/* Internal Notes (only in internal view) */}
        {viewType === 'internal' && salesOrder.internalNotes && (
          <View style={[styles.notes, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.notesTitle}>Internal Notes</Text>
            <Text style={styles.notesText}>{salesOrder.internalNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyInfo.footerText || 'Thank you for your business!'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}