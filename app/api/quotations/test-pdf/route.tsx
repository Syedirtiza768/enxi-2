import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  text: {
    fontSize: 12,
    marginBottom: 10,
  }
})

const TestPDF = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Test PDF</Text>
      <Text style={styles.text}>This is a test PDF document</Text>
      <Text style={styles.text}>If you can see this, React PDF is working correctly</Text>
    </Page>
  </Document>
)

export async function GET(request: NextRequest) {
  try {
    const pdfBuffer = await renderToBuffer(<TestPDF />)
    
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', 'inline; filename="test.pdf"')
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('PDF Error:', error)
    return NextResponse.json(
      { error: 'PDF generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}