import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  lineHeader: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    marginBottom: 5,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 5,
    fontWeight: 'bold',
  },
  col1: { width: '10%' },
  col2: { width: '50%' },
  col3: { width: '10%' },
  col4: { width: '15%' },
  col5: { width: '15%' },
})

export const QuotationPDFDebug = ({ quotation, viewType }: any) => {
  const formatCurrency = (amount: any) => {
    const currency = quotation.currency || 'USD'
    const value = Number(amount) || 0
    return `${currency} ${value.toFixed(2)}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Quotation {quotation.quotationNumber}</Text>
        <Text>View Type: {viewType}</Text>
        <Text>Currency: {quotation.currency || 'USD'}</Text>
        <Text>Has Lines: {quotation.lines ? 'Yes' : 'No'}</Text>
        <Text>Lines Count: {quotation.lines?.length || 0}</Text>
        
        <View style={styles.section}>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>Items & Services:</Text>
          
          {viewType === 'client' && quotation.lines ? (
            <View>
              <Text style={{ marginBottom: 10 }}>CLIENT VIEW - Lines Only</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.col1}>Line</Text>
                  <Text style={styles.col2}>Description</Text>
                  <Text style={styles.col3}>Qty</Text>
                  <Text style={styles.col4}>Total</Text>
                </View>
                {quotation.lines.map((line: any) => (
                  <View key={line.lineNumber} style={styles.tableRow}>
                    <Text style={styles.col1}>{line.lineNumber}</Text>
                    <Text style={styles.col2}>{line.lineDescription || 'No description'}</Text>
                    <Text style={styles.col3}>{line.quantity || '-'}</Text>
                    <Text style={styles.col4}>{formatCurrency(line.totalAmount || line.lineTotalAmount || 0)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : viewType === 'internal' && quotation.lines ? (
            <View>
              <Text style={{ marginBottom: 10 }}>INTERNAL VIEW - Lines with Items</Text>
              {quotation.lines.map((line: any) => (
                <View key={line.lineNumber} style={{ marginBottom: 15 }}>
                  <View style={styles.lineHeader}>
                    <Text style={{ fontWeight: 'bold' }}>
                      Line {line.lineNumber}: {line.lineDescription || 'No description'}
                    </Text>
                    <Text style={{ fontSize: 10 }}>
                      {line.itemCount || 0} items • Total: {formatCurrency(line.totalAmount || line.lineTotalAmount || 0)}
                    </Text>
                  </View>
                  
                  {line.items && line.items.length > 0 ? (
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.col1}>Code</Text>
                        <Text style={styles.col2}>Description</Text>
                        <Text style={styles.col3}>Qty</Text>
                        <Text style={styles.col4}>Price</Text>
                        <Text style={styles.col5}>Total</Text>
                      </View>
                      {line.items.map((item: any, idx: number) => (
                        <View key={idx} style={styles.tableRow}>
                          <Text style={styles.col1}>{item.itemCode}</Text>
                          <Text style={styles.col2}>{item.description}</Text>
                          <Text style={styles.col3}>{item.quantity}</Text>
                          <Text style={styles.col4}>{formatCurrency(item.unitPrice)}</Text>
                          <Text style={styles.col5}>{formatCurrency(item.totalAmount)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ padding: 10, color: '#6B7280' }}>No items in this line</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text>No data to display</Text>
          )}
        </View>
        
        <View style={{ marginTop: 20 }}>
          <Text>Total Amount: {formatCurrency(quotation.totalAmount)}</Text>
        </View>
      </Page>
    </Document>
  )
}