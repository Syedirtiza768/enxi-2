#!/usr/bin/env tsx

/**
 * Cron Job Starter Script
 * Initializes all scheduled background jobs for the ERP system
 */

import { initializeQuotationExpiryCron } from '@/lib/cron/quotation-expiry'

async function startCronJobs() {
  console.warn('Starting ERP system cron jobs...')
  
  try {
    // Initialize quotation expiry cron
    initializeQuotationExpiryCron()
    
    console.warn('All cron jobs initialized successfully')
    console.warn('Cron scheduler is running. Press Ctrl+C to stop.')
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.warn('\nReceived SIGINT. Shutting down cron jobs gracefully...')
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      console.warn('\nReceived SIGTERM. Shutting down cron jobs gracefully...')
      process.exit(0)
    })
    
    // Keep the process alive
    setInterval(() => {
      // Heartbeat - log every hour that cron is still running
      const now = new Date()
      if (now.getMinutes() === 0) {
        console.warn(`Cron heartbeat: ${now.toISOString()}`)
      }
    }, 60000) // Check every minute
    
} catch {}

// Start the cron jobs if this script is run directly
if (require.main === module) {
  startCronJobs()
}

export { startCronJobs }