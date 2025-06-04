#!/usr/bin/env tsx

/**
 * Cron Job Starter Script
 * Initializes all scheduled background jobs for the ERP system
 */

import { initializeQuotationExpiryCron } from '@/lib/cron/quotation-expiry'

async function startCronJobs() {
  console.log('Starting ERP system cron jobs...')
  
  try {
    // Initialize quotation expiry cron
    initializeQuotationExpiryCron()
    
    console.log('All cron jobs initialized successfully')
    console.log('Cron scheduler is running. Press Ctrl+C to stop.')
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT. Shutting down cron jobs gracefully...')
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM. Shutting down cron jobs gracefully...')
      process.exit(0)
    })
    
    // Keep the process alive
    setInterval(() => {
      // Heartbeat - log every hour that cron is still running
      const now = new Date()
      if (now.getMinutes() === 0) {
        console.log(`Cron heartbeat: ${now.toISOString()}`)
      }
    }, 60000) // Check every minute
    
  } catch (error) {
    console.error('Failed to start cron jobs:', error)
    process.exit(1)
  }
}

// Start the cron jobs if this script is run directly
if (require.main === module) {
  startCronJobs()
}

export { startCronJobs }