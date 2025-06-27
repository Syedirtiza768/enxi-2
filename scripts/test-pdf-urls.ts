#!/usr/bin/env npx tsx

import fetch from 'node-fetch'
import fs from 'fs/promises'
import path from 'path'

async function testPDFUrls(quotationId: string) {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing PDF URLs for quotation:', quotationId)
  console.log('Base URL:', baseUrl)
  
  // Test URLs
  const urls = [
    {
      name: 'Client View',
      url: `${baseUrl}/api/quotations/${quotationId}/pdf?view=client`,
      filename: 'test-url-client.pdf'
    },
    {
      name: 'Internal View', 
      url: `${baseUrl}/api/quotations/${quotationId}/pdf?view=internal`,
      filename: 'test-url-internal.pdf'
    }
  ]
  
  for (const { name, url, filename } of urls) {
    console.log(`\n📄 Testing ${name}:`)
    console.log('URL:', url)
    
    try {
      const response = await fetch(url)
      
      console.log('Status:', response.status)
      console.log('Content-Type:', response.headers.get('content-type'))
      console.log('Content-Length:', response.headers.get('content-length'))
      
      if (response.ok && response.headers.get('content-type')?.includes('pdf')) {
        const buffer = await response.buffer()
        const filepath = path.join(process.cwd(), filename)
        await fs.writeFile(filepath, buffer)
        
        console.log(`✅ PDF downloaded successfully`)
        console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB`)
        console.log(`   Saved to: ${filepath}`)
      } else {
        console.error('❌ Failed to download PDF')
        const text = await response.text()
        console.error('Response:', text.substring(0, 500))
      }
      
    } catch (error) {
      console.error('❌ Error:', error)
    }
  }
  
  // Also test the debug route
  console.log('\n📄 Testing Debug PDF Route:')
  const debugUrl = `${baseUrl}/api/quotations/test-pdf`
  console.log('URL:', debugUrl)
  
  try {
    const response = await fetch(debugUrl)
    console.log('Status:', response.status)
    console.log('Content-Type:', response.headers.get('content-type'))
    
    if (response.ok) {
      const buffer = await response.buffer()
      const filepath = path.join(process.cwd(), 'test-debug-route.pdf')
      await fs.writeFile(filepath, buffer)
      console.log(`✅ Debug PDF works - Size: ${(buffer.length / 1024).toFixed(2)} KB`)
    }
  } catch (error) {
    console.error('❌ Debug route error:', error)
  }
}

// Run test
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'
testPDFUrls(quotationId)