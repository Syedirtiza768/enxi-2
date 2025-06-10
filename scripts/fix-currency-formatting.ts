#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Files to update
const filesToUpdate = [
  // Pages
  'app/(auth)/sales-cases/page.tsx',
  'app/(auth)/sales-cases/[id]/page.tsx',
  'app/(auth)/sales-orders/page.tsx',
  'app/(auth)/sales-orders/[id]/page.tsx',
  'app/(auth)/sales-orders/[id]/edit/page.tsx',
  'app/(auth)/invoices/page.tsx',
  'app/(auth)/invoices/[id]/page.tsx',
  'app/(auth)/payments/page.tsx',
  'app/(auth)/leads/page.tsx',
  'app/(auth)/customers/page.tsx',
  'app/(auth)/customers/[id]/page.tsx',
  'app/(auth)/customer-pos/page.tsx',
  'app/(auth)/customer-pos/[id]/page.tsx',
  'app/(auth)/inventory/items/[id]/page.tsx',
  'app/(auth)/inventory/stock-in/page.tsx',
  'app/(auth)/inventory/reports/reports-content.tsx',
  'app/(auth)/sales-team/page.tsx',
  'app/(auth)/accounting/accounts/page.tsx',
  'app/(auth)/accounting/journal-entries/page.tsx',
  'app/(auth)/accounting/journal-entries/[id]/page.tsx',
  'app/(auth)/accounting/reports/balance-sheet/page.tsx',
  'app/(auth)/accounting/reports/income-statement/page.tsx',
  'app/(auth)/goods-receipts/page.tsx',
  'app/(auth)/goods-receipts/[id]/page.tsx',
  'app/(auth)/purchase-orders/[id]/page.tsx',
  'app/(auth)/supplier-invoices/[id]/page.tsx',
  'app/(auth)/supplier-payments/page.tsx',
  'app/(auth)/supplier-payments/[id]/page.tsx',
  
  // Components
  'components/inventory/item-list.tsx',
  'components/quotations/quotation-form.tsx',
  'components/quotations/line-item-editor.tsx',
  'components/quotations/line-item-editor-v2.tsx',
  'components/quotations/line-item-editor-enhanced.tsx',
  'components/quotations/simple-item-editor.tsx',
  'components/invoices/invoice-form.tsx',
  'components/payments/payment-form.tsx',
  'components/payments/customer-ledger.tsx',
  'components/payments/customer-business-history.tsx',
  'components/customers/customer-form.tsx',
  'components/customers/customer-detail-tabs.tsx',
  'components/customer-pos/customer-po-form.tsx',
  'components/sales-cases/sales-case-detail-tabs.tsx',
  'components/sales-cases/expense-manager.tsx',
  'components/supplier-invoices/supplier-invoice-form.tsx',
  'components/supplier-payments/supplier-payment-form.tsx',
  'components/purchase-orders/purchase-order-form.tsx',
  'components/goods-receipts/goods-receipt-form.tsx',
  'components/three-way-matching/three-way-matching-dashboard.tsx',
  'components/three-way-matching/three-way-matching-detail.tsx',
  'components/shipments/shipment-detail.tsx',
  
  // PDF
  'lib/pdf/quotation-template.tsx',
]

// Pattern replacements
const replacements = [
  // Replace formatCurrency functions that use hardcoded USD
  {
    pattern: /const formatCurrency = \(amount: number\) => {\s*return new Intl\.NumberFormat\('en-US', {\s*style: 'currency',\s*currency: 'USD'\s*}\)\.format\(amount\)\s*}/g,
    replacement: '// formatCurrency function removed - use useCurrency hook instead'
  },
  
  // Replace inline Intl.NumberFormat with USD
  {
    pattern: /new Intl\.NumberFormat\('en-US', {\s*style: 'currency',\s*currency: 'USD'\s*}\)/g,
    replacement: "new Intl.NumberFormat('en-US', { style: 'currency', currency: defaultCurrency || 'USD' })"
  },
  
  // Replace toLocaleString with USD
  {
    pattern: /\.toLocaleString\('en-US', {\s*style: 'currency',\s*currency: 'USD'\s*}\)/g,
    replacement: ".toLocaleString('en-US', { style: 'currency', currency: defaultCurrency || 'USD' })"
  },
  
  // Replace direct $ usage in template literals
  {
    pattern: /\$\{([^}]+)\.toFixed\(2\)\}/g,
    replacement: '${formatCurrency($1)}'
  },
  
  // Replace direct $ usage with space
  {
    pattern: /\$ \{([^}]+)\.toFixed\(2\)\}/g,
    replacement: '${formatCurrency($1)}'
  }
]

// Function to update a file
function updateFile(filePath: string) {
  const fullPath = path.join(rootDir, filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8')
  let modified = false
  
  // Check if file is a React component
  const isReactComponent = content.includes('import React') || content.includes("'use client'")
  
  // Apply replacements
  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement)
      modified = true
    }
  })
  
  // Add currency import if needed and file was modified
  if (modified && isReactComponent) {
    // Check if it already imports useCurrency
    if (!content.includes('useCurrency') && !content.includes('@/lib/utils/currency')) {
      // Add import after the last import statement
      const importMatch = content.match(/(import[^;]+;[\s]*)+/)
      if (importMatch) {
        const lastImportEnd = importMatch.index! + importMatch[0].length
        
        // Check if it's a client component
        if (content.includes("'use client'")) {
          content = content.slice(0, lastImportEnd) + 
            "import { useCurrency } from '@/lib/contexts/currency-context'\n" +
            content.slice(lastImportEnd)
        } else {
          // For server components, import the utility
          content = content.slice(0, lastImportEnd) + 
            "import { formatCurrency } from '@/lib/utils/currency'\n" +
            content.slice(lastImportEnd)
        }
      }
    }
    
    // Add useCurrency hook in components
    if (content.includes("'use client'") && content.includes('export default function')) {
      const functionMatch = content.match(/export default function \w+\(\) {\s*/)
      if (functionMatch && !content.includes('const { formatCurrency }')) {
        const insertPos = functionMatch.index! + functionMatch[0].length
        content = content.slice(0, insertPos) + 
          '\n  const { formatCurrency } = useCurrency()\n' +
          content.slice(insertPos)
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content)
    console.log(`✅ Updated: ${filePath}`)
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`)
  }
}

// Main execution
console.log('🔧 Fixing currency formatting across the codebase...\n')

filesToUpdate.forEach(file => {
  try {
    updateFile(file)
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error)
  }
})

console.log('\n✨ Currency formatting update complete!')
console.log('\nNote: Some files may need manual review, especially:')
console.log('- Files using direct $ symbols')
console.log('- Service files that need defaultCurrency from settings')
console.log('- Complex currency calculations')