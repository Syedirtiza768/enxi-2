#!/usr/bin/env tsx

/**
 * Manual Quotation Expiry Script
 * Runs the quotation expiry check manually for testing or one-off execution
 */

import { runQuotationExpiryCheck } from '@/lib/cron/quotation-expiry'

async function main() {
  console.warn('Manual quotation expiry check starting...')
  
  try {
    const result = await runQuotationExpiryCheck()
    
    console.warn('✅ Quotation expiry check completed successfully')
    console.warn(`📊 Results:`)
    console.warn(`   - Expired quotations: ${result.expiredCount}`)
    if (result.expiredQuotations.length > 0) {
      console.warn(`   - Quotation numbers: ${result.expiredQuotations.join(', ')}`)
    }
    
    process.exit(0)
} catch {}

main()