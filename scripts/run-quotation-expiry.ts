#!/usr/bin/env tsx

/**
 * Manual Quotation Expiry Script
 * Runs the quotation expiry check manually for testing or one-off execution
 */

import { runQuotationExpiryCheck } from '@/lib/cron/quotation-expiry'

async function main() {
  console.log('Manual quotation expiry check starting...')
  
  try {
    const result = await runQuotationExpiryCheck()
    
    console.log('✅ Quotation expiry check completed successfully')
    console.log(`📊 Results:`)
    console.log(`   - Expired quotations: ${result.expiredCount}`)
    if (result.expiredQuotations.length > 0) {
      console.log(`   - Quotation numbers: ${result.expiredQuotations.join(', ')}`)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Quotation expiry check failed:', error)
    process.exit(1)
  }
}

main()