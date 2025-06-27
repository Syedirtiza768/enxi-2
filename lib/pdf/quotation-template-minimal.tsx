import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30 },
  title: { fontSize: 20, marginBottom: 20 },
  section: { marginBottom: 15 },
  line: { 
    backgroundColor: '#f0f0f0', 
    padding: 10, 
    marginBottom: 5 
  },
  item: {
    marginLeft: 20,
    marginBottom: 5,
    fontSize: 10
  }
})

export const QuotationPDFMinimal = ({ quotation, viewType }: any) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {quotation.quotationNumber} - {viewType.toUpperCase()} VIEW
        </Text>
        
        <View style={styles.section}>
          <Text>Currency: {quotation.currency}</Text>
          <Text>Total: {quotation.totalAmount}</Text>
          <Text>Lines: {quotation.lines?.length || 0}</Text>
        </View>
        
        {quotation.lines?.map((line: any) => (
          <View key={line.lineNumber} style={styles.line}>
            <Text>Line {line.lineNumber}: {line.lineDescription}</Text>
            <Text>Total: {line.totalAmount || line.lineTotalAmount}</Text>
            
            {viewType === 'internal' && line.items?.map((item: any, idx: number) => (
              <Text key={idx} style={styles.item}>
                - {item.itemCode}: {item.description} (Qty: {item.quantity})
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  )
}