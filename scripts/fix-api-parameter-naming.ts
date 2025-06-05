#!/usr/bin/env tsx

/**
 * Script to fix systematic parameter naming issues in API routes
 * 
 * Issues to fix:
 * 1. Functions defined with _request but code references request
 * 2. Variables defined with _user but code references user
 */

import { promises as fs } from 'fs'
import { join } from 'path'

const API_DIR = '/Users/irtizahassan/apps/enxi/enxi-erp/app/api'

// Files with _request parameter but code references request
const REQUEST_PARAM_FILES = [
  'accounting/journal-entries/route.ts',
  'accounting/accounts/standard/route.ts',
  'accounting/accounts/route.ts',
  'accounting/exchange-rates/route.ts',
  'accounting/reports/trial-balance/route.ts',
  'accounting/reports/income-statement/route.ts',
  'accounting/reports/balance-sheet/route.ts',
  'reporting/sales-analytics/route.ts',
  'reporting/inventory-analytics/route.ts',
  'payments/route.ts',
  'purchase-orders/route.ts',
  'suppliers/route.ts',
  'auth/profile/route.ts',
  'supplier-invoices/route.ts',
  'leads/route.ts',
  'supplier-payments/route.ts',
  'three-way-matching/dashboard/route.ts',
  'three-way-matching/export/route.ts',
  'stock-transfers/route.ts',
  'system/route-test/route.ts',
  'system/health/route.ts',
  'system/errors/route.ts',
  'audit/route.ts',
  'locations/route.ts',
  'inventory/stock-movements/adjust/route.ts',
  'inventory/stock-movements/opening/route.ts',
  'inventory/stock-movements/route.ts',
  'inventory/items/route.ts',
  'inventory/categories/route.ts',
  'inventory/units-of-measure/route.ts',
  'inventory/stock-lots/route.ts',
  'inventory/reports/stock-value/route.ts',
  'inventory/reports/stock-summary/route.ts',
  'inventory/reports/expiring-lots/route.ts',
  'test-auth/route.ts',
  'goods-receipts/route.ts',
  'sales-orders/route.ts'
]

// Files with _user variable but code references user
const USER_VAR_FILES = [
  'auth/validate/route.ts',
  'reporting/dashboard/kpi-metrics/route.ts',
  'purchase-orders/[id]/approve/route.ts',
  'purchase-orders/[id]/route.ts',
  'purchase-orders/[id]/send/route.ts',
  'suppliers/[id]/route.ts',
  'auth/login/route.ts',
  'test-auth-wrapper/route.ts',
  'supplier-invoices/[id]/route.ts',
  'leads/[id]/route.ts',
  'leads/stats/route.ts',
  'supplier-payments/[id]/route.ts',
  'three-way-matching/[id]/reject/route.ts',
  'three-way-matching/[id]/approve/route.ts',
  'stock-transfers/[id]/receive/route.ts',
  'stock-transfers/[id]/approve/route.ts',
  'stock-transfers/[id]/route.ts',
  'stock-transfers/[id]/ship/route.ts',
  'system/auto-fix/route.ts',
  'locations/[id]/route.ts',
  'inventory/low-stock/route.ts',
  'inventory/valuation/route.ts',
  'inventory/categories/[id]/route.ts',
  'sales-cases/[id]/assign/route.ts'
]

async function fixFile(filePath: string, fixType: 'request' | 'user' | 'both') {
  try {
    let content = await fs.readFile(filePath, 'utf-8')
    let changed = false

    if (fixType === 'request' || fixType === 'both') {
      // Fix _request parameter naming
      const requestParamRegex = /export async function (GET|POST|PUT|DELETE|PATCH)\((_request): NextRequest\)/g
      if (requestParamRegex.test(content)) {
        content = content.replace(requestParamRegex, 'export async function $1(request: NextRequest)')
        changed = true
      }

      // Fix references to request in the code
      content = content.replace(/const\s+(_?)user\s*=\s*await\s+getUserFromRequest\(request\)/g, 'const user = await getUserFromRequest(request)')
      content = content.replace(/const\s+searchParams\s*=\s*request\.nextUrl\.searchParams/g, 'const searchParams = request.nextUrl.searchParams')
      content = content.replace(/const\s+body\s*=\s*await\s+request\.json\(\)/g, 'const body = await request.json()')
      content = content.replace(/await\s+request\.json\(\)/g, 'await request.json()')
    }

    if (fixType === 'user' || fixType === 'both') {
      // Fix _user variable references
      content = content.replace(/const\s+_user\s*=\s*await\s+getUserFromRequest/g, 'const user = await getUserFromRequest')
      
      // Fix user references in code (but be careful not to replace legitimate user properties)
      content = content.replace(/\buser\./g, 'user.')
      content = content.replace(/\buser\b(?!\.)(?![a-zA-Z])/g, 'user')
      
      // Fix specific patterns like createdBy: _user.id should be createdBy: user.id
      content = content.replace(/createdBy:\s*_user\.id/g, 'createdBy: user.id')
      content = content.replace(/updatedBy:\s*_user\.id/g, 'updatedBy: user.id')
      content = content.replace(/where:\s*{\s*id:\s*_user\.id\s*}/g, 'where: { id: user.id }')
      content = content.replace(/_user\.id/g, 'user.id')
      content = content.replace(/_user\.role/g, 'user.role')
      content = content.replace(/_user\.email/g, 'user.email')
    }

    if (changed) {
      await fs.writeFile(filePath, content, 'utf-8')
      console.log(`✅ Fixed: ${filePath}`)
      return true
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error)
    return false
  }
}

async function main() {
  console.log('🔧 Starting API parameter naming fixes...\n')
  
  let totalFixed = 0
  let totalAttempted = 0

  // Fix _request parameter issues
  console.log('📝 Fixing _request parameter issues...')
  for (const file of REQUEST_PARAM_FILES) {
    const filePath = join(API_DIR, file)
    totalAttempted++
    if (await fixFile(filePath, 'request')) {
      totalFixed++
    }
  }

  console.log('\n📝 Fixing _user variable issues...')
  // Fix _user variable issues
  for (const file of USER_VAR_FILES) {
    const filePath = join(API_DIR, file)
    totalAttempted++
    if (await fixFile(filePath, 'user')) {
      totalFixed++
    }
  }

  console.log(`\n🎉 Complete! Fixed ${totalFixed} out of ${totalAttempted} files.`)
  
  if (totalFixed > 0) {
    console.log('\n✨ All API parameter naming issues have been resolved!')
    console.log('🚀 Your API endpoints should now work correctly.')
  }
}

main().catch(console.error)