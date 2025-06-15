import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface QuotationPDFData {
  id: string
  quotationNumber: string
  status: string
  version: number
  validUntil: Date | string
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
  currency?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paymentTerms?: string
  deliveryTerms?: string
  notes?: string
  lines?: Array<{
    lineNumber: number
    lineDescription: string
    quantity: number
    totalAmount: number
  }>
  items?: Array<{
    id: string
    itemCode: string
    description: string
    quantity: number
    unitPrice: number
    discount: number
    taxRate: number
    totalAmount: number
  }>
}

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
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
  companyInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  quotationInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  quotationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
  },
  quotationNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  quotationDetails: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'right',
    lineHeight: 1.4,
  },
  customerSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerInfo: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 4,
    border: 1,
    borderColor: '#E5E7EB',
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  customerDetails: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  itemsTable: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
  },
  itemCode: { width: '15%' },
  itemDescription: { width: '35%' },
  itemQuantity: { width: '10%', textAlign: 'right' },
  itemPrice: { width: '12%', textAlign: 'right' },
  itemDiscount: { width: '10%', textAlign: 'right' },
  itemTax: { width: '8%', textAlign: 'right' },
  itemTotal: { width: '15%', textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsTable: {
    width: '40%',
    borderTop: 1,
    borderTopColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 10,
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#F3F4F6',
    borderTop: 2,
    borderTopColor: '#1F2937',
  },
  termsSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
  },
  termsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  termsColumn: {
    width: '48%',
  },
  termTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  termValue: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 15,
  },
  notesSection: {
    marginTop: 20,
  },
  notesText: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.4,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 4,
    border: 1,
    borderColor: '#E5E7EB',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTop: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  validUntilHighlight: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: 'bold',
    borderRadius: 2,
    marginTop: 5,
  },
})

interface QuotationPDFProps {
  quotation: QuotationPDFData
  companyInfo?: {
    name: string
    address: string
    phone: string
    email: string
    website?: string
  }
}

export const QuotationPDF: React.FC<QuotationPDFProps> = ({ 
  quotation, 
  companyInfo = {
    name: 'Enxi ERP System',
    address: '123 Business Street, Enterprise City, EC 12345',
    phone: '+1 (555) 123-4567',
    email: 'info@enxi-erp.com',
    website: 'www.enxi-erp.com'
  }
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quotation.currency || 'USD',
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return { backgroundColor: '#F3F4F6', color: '#6B7280' }
      case 'SENT': return { backgroundColor: '#DBEAFE', color: '#1D4ED8' }
      case 'ACCEPTED': return { backgroundColor: '#D1FAE5', color: '#059669' }
      case 'REJECTED': return { backgroundColor: '#FEE2E2', color: '#DC2626' }
      case 'EXPIRED': return { backgroundColor: '#FEF3C7', color: '#D97706' }
      case 'CANCELLED': return { backgroundColor: '#F3F4F6', color: '#6B7280' }
      default: return { backgroundColor: '#F3F4F6', color: '#6B7280' }
    }
  }

  const isExpiringSoon = () => {
    const validUntil = new Date(quotation.validUntil)
    const now = new Date()
    const daysDiff = (validUntil.getTime() - now.getTime()) / (1000 * 3600 * 24)
    return daysDiff <= 7 && daysDiff > 0
  }

  const isExpired = () => {
    return new Date(quotation.validUntil) < new Date()
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.companyDetails}>
              {companyInfo.address}{'\n'}
              {companyInfo.phone} • {companyInfo.email}
              {companyInfo.website && `\n${companyInfo.website}`}
            </Text>
          </View>
          
          <View style={styles.quotationInfo}>
            <Text style={styles.quotationTitle}>QUOTATION</Text>
            <Text style={styles.quotationNumber}>{quotation.quotationNumber}</Text>
            <View style={{ ...styles.statusBadge, ...getStatusColor(quotation.status) }}>
              <Text>{quotation.status}</Text>
            </View>
            <Text style={styles.quotationDetails}>
              Date: {formatDate(quotation.createdAt)}{'\n'}
              Version: {quotation.version}{'\n'}
              Valid Until: {formatDate(quotation.validUntil)}
            </Text>
            {isExpiringSoon() && !isExpired() && (
              <View style={styles.validUntilHighlight}>
                <Text>Expires Soon!</Text>
              </View>
            )}
            {isExpired() && (
              <View style={{ ...styles.validUntilHighlight, backgroundColor: '#DC2626', color: '#FFFFFF' }}>
                <Text>EXPIRED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{quotation.salesCase.customer.name}</Text>
            <Text style={styles.customerDetails}>
              {quotation.salesCase.customer.email}
              {quotation.salesCase.customer.phone && `\n${quotation.salesCase.customer.phone}`}
              {quotation.salesCase.customer.address && `\n${quotation.salesCase.customer.address}`}
            </Text>
          </View>
        </View>

        {/* Sales Case Information */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Project Details:</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{quotation.salesCase.title}</Text>
            <Text style={styles.customerDetails}>
              Case Number: {quotation.salesCase.caseNumber}{'\n'}
              {quotation.salesCase.description}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <Text style={styles.sectionTitle}>Items & Services:</Text>
          
          {/* Check if we have lines (client view) or items (internal view) */}
          {quotation.lines ? (
            <>
              {/* Client View - Show Lines */}
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.itemCode, width: '10%' }}>Line</Text>
                <Text style={{ ...styles.itemDescription, width: '60%' }}>Description</Text>
                <Text style={{ ...styles.itemQuantity, width: '10%' }}>Qty</Text>
                <Text style={{ ...styles.itemTotal, width: '20%' }}>Total</Text>
              </View>
              
              {/* Line Rows */}
              {quotation.lines.map((line, index) => (
                <View key={line.lineNumber} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={{ ...styles.itemCode, width: '10%' }}>{line.lineNumber}</Text>
                  <Text style={{ ...styles.itemDescription, width: '60%' }}>{line.lineDescription || 'No description'}</Text>
                  <Text style={{ ...styles.itemQuantity, width: '10%' }}>{line.quantity}</Text>
                  <Text style={{ ...styles.itemTotal, width: '20%' }}>{formatCurrency(line.totalAmount)}</Text>
                </View>
              ))}
            </>
          ) : quotation.items ? (
            <>
              {/* Internal View - Show Items */}
              <View style={styles.tableHeader}>
                <Text style={styles.itemCode}>Item Code</Text>
                <Text style={styles.itemDescription}>Description</Text>
                <Text style={styles.itemQuantity}>Qty</Text>
                <Text style={styles.itemPrice}>Unit Price</Text>
                <Text style={styles.itemDiscount}>Disc %</Text>
                <Text style={styles.itemTax}>Tax %</Text>
                <Text style={styles.itemTotal}>Total</Text>
              </View>

              {/* Table Rows */}
              {quotation.items.map((item, index) => (
                <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.itemCode}>{item.itemCode}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemQuantity}>{item.quantity}</Text>
                  <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice)}</Text>
                  <Text style={styles.itemDiscount}>{formatPercent(item.discount)}</Text>
                  <Text style={styles.itemTax}>{formatPercent(item.taxRate)}</Text>
                  <Text style={styles.itemTotal}>{formatCurrency(item.totalAmount)}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(quotation.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Discount:</Text>
              <Text>-{formatCurrency(quotation.discountAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Tax:</Text>
              <Text>{formatCurrency(quotation.taxAmount)}</Text>
            </View>
            <View style={styles.totalRowBold}>
              <Text>Total Amount:</Text>
              <Text>{formatCurrency(quotation.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>Terms & Conditions:</Text>
          <View style={styles.termsGrid}>
            <View style={styles.termsColumn}>
              <Text style={styles.termTitle}>Payment Terms:</Text>
              <Text style={styles.termValue}>{quotation.paymentTerms || 'Net 30 days'}</Text>
              
              <Text style={styles.termTitle}>Delivery Terms:</Text>
              <Text style={styles.termValue}>{quotation.deliveryTerms || 'FOB Origin'}</Text>
            </View>
            
            <View style={styles.termsColumn}>
              <Text style={styles.termTitle}>Valid Until:</Text>
              <Text style={styles.termValue}>{formatDate(quotation.validUntil)}</Text>
              
              <Text style={styles.termTitle}>Quotation Version:</Text>
              <Text style={styles.termValue}>Version {quotation.version}</Text>
            </View>
          </View>

          {quotation.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.termTitle}>Additional Notes:</Text>
              <Text style={styles.notesText}>{quotation.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This quotation is valid until {formatDate(quotation.validUntil)}. 
          All prices are in USD and exclude applicable taxes unless otherwise stated.{'\n'}
          Generated on {formatDate(new Date())} • {companyInfo.name}
        </Text>
      </Page>
    </Document>
  )
}