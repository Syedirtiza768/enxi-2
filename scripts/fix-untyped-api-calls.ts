#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface FixConfig {
  file: string
  endpoint: string
  responseType: string
}

// Define the response types for each endpoint pattern
const endpointTypes: Record<string, string> = {
  '/api/accounting/accounts': '{ data: any[] }',
  '/api/inventory/categories/tree': '{ data: any }',
  '/api/inventory/items': '{ data: any[] }',
  '/api/inventory/categories': '{ data: any[] }',
  '/api/locations': '{ data: any[] }',
  '/api/inventory/stock-movements': '{ data: any[] }',
  '/api/inventory/reports/export': '{ data: any }',
  '/api/invoices': '{ data: any[] }',
  '/api/customers': '{ data: any[] }',
  '/api/quotations': '{ data: any[] }',
  '/api/sales-cases': '{ data: any[] }',
  '/api/supplier-invoices': '{ data: any[] }',
  '/api/supplier-payments': '{ data: any[] }',
  '/api/suppliers': '{ data: any[] }',
  '/api/tax-categories': '{ data: any[] }',
  '/api/purchases/orders': '{ data: any[] }',
  '/api/inventory/levels': '{ data: any }',
  '/api/purchases/items': '{ data: any[] }',
  '/api/suppliers/check-code': '{ exists: boolean }',
  
  // Single item endpoints
  '/api/invoices/${': '{ data: any }',
  '/api/quotations/${': '{ data: any }',
  '/api/sales-cases/${': '{ data: any }',
  '/api/supplier-invoices/${': '{ data: any }',
  '/api/supplier-payments/${': '{ data: any }',
  '/api/suppliers/${': '{ data: any }',
  
  // Action endpoints
  '/send': '{ success: boolean }',
  '/duplicate': '{ data: any }',
  '/accept': '{ data: any }',
  '/reject': '{ data: any }',
  '/timeline': '{ data: any[] }',
  '/post': '{ success: boolean }',
  '/expenses': '{ data: any[] }',
  '/documents': '{ data: any[] }',
  '/quotes': '{ data: any[] }',
}

function getResponseType(endpoint: string): string {
  // Check for exact matches first
  for (const [pattern, type] of Object.entries(endpointTypes)) {
    if (endpoint.includes(pattern)) {
      return type
    }
  }
  
  // Default fallback
  return '{ data: any }'
}

function fixFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  let modified = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Look for untyped apiClient calls
    const match = line.match(/const response = await apiClient\(([^,]+),/)
    if (match && !line.includes('apiClient<')) {
      // Extract the endpoint
      const endpointPart = match[1].trim()
      
      // Check if response.data is used in the next few lines
      let hasResponseData = false
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('response.data')) {
          hasResponseData = true
          break
        }
      }
      
      if (hasResponseData) {
        // Determine the response type
        const responseType = getResponseType(endpointPart)
        
        // Replace the line
        const newLine = line.replace(
          'await apiClient(',
          `await apiClient<${responseType}>(`
        )
        
        if (newLine !== line) {
          lines[i] = newLine
          modified = true
          console.log(`Fixed: ${filePath}:${i + 1}`)
          console.log(`  Old: ${line.trim()}`)
          console.log(`  New: ${newLine.trim()}`)
        }
      }
    }
  }
  
  if (modified) {
    writeFileSync(filePath, lines.join('\n'))
    console.log(`✅ Updated ${filePath}\n`)
  }
}

// Get list of files from the analysis
const filesToFix = [
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/accounting/accounts/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/inventory/categories/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/inventory/items/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/inventory/movements/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/inventory/reports/reports-content.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/inventory/stock-out/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/invoices/[id]/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/invoices/new/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/invoices/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/quotations/[id]/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/quotations/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/sales-cases/[id]/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/supplier-invoices/[id]/edit/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/supplier-invoices/[id]/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/supplier-invoices/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/supplier-payments/[id]/edit/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/supplier-payments/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/suppliers/[id]/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/suppliers/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/app/(auth)/tax-configuration/page.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/customers/customer-detail-tabs.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/customers/customer-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/customers/customer-list.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/customers/customer-search.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/forms/enhanced-customer-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/goods-receipts/goods-receipt-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/inventory/item-selector-modal.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/leads/lead-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/payments/multi-invoice-payment.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/payments/payment-form-enhanced.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/payments/payment-history.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/purchase-orders/purchase-order-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/quotations/clean-item-editor.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/quotations/quotation-form-clean.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/quotations/quotation-form-enhanced.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/quotations/quotation-form-v2.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/sales-cases/expense-manager.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/sales-cases/sales-case-detail-tabs.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/sales-cases/sales-case-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/supplier-invoices/supplier-invoice-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/suppliers/supplier-form.tsx',
  '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/components/suppliers/supplier-list.tsx',
]

console.log(`Fixing ${filesToFix.length} files...\n`)

filesToFix.forEach(file => {
  try {
    fixFile(file)
  } catch (error) {
    console.error(`Error fixing ${file}:`, error)
  }
})

console.log('Done!')