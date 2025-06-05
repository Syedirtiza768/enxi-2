import cron from 'node-cron'
import { QuotationService } from '@/lib/services/quotation.service'
import { AuditService } from '@/lib/services/audit.service'

/**
 * Quotation Expiry Cron Job
 * Runs daily at 02:00 server time to check and mark expired quotations
 */
export function initializeQuotationExpiryCron() {
  // Validate that cron should run in this environment
  const enableCron = process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production'
  
  if (!enableCron) {
    console.warn('Quotation expiry cron job disabled (ENABLE_CRON_JOBS not set to true)')
    return
  }

  console.warn('Initializing quotation expiry cron job...')

  // Schedule: Run daily at 2:00 AM server time
  // Cron format: second minute hour day month weekday
  // '0 0 2 * * *' = At 02:00:00 every day
  cron.schedule('0 0 2 * * *', async () => {
    console.warn('Running quotation expiry check...', new Date().toISOString())

    try {
      const quotationService = new QuotationService()
      const auditService = new AuditService()

      // Get quotations that will be expired before processing
      const sentQuotations = await quotationService.getAllQuotations({
        status: 'SENT'
      })

      const expiredQuotations = sentQuotations.filter(q => 
        new Date(q.validUntil) < new Date()
      )

      console.warn(`Found ${expiredQuotations.length} expired quotations to process`)

      // Run the expiry check
      await quotationService.checkExpiredQuotations()

      // Log the job execution
      await auditService.logAction({
        userId: 'system',
        action: 'UPDATE',
        entityType: 'System',
        entityId: 'quotation-expiry-cron',
        metadata: {
          type: 'scheduled-job',
          expiredCount: expiredQuotations.length,
          executionTime: new Date().toISOString(),
          expiredQuotations: expiredQuotations.map(q => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            validUntil: q.validUntil,
            salesCaseId: q.salesCaseId
          }))
        }
      })

      console.warn(`Quotation expiry check completed. Expired ${expiredQuotations.length} quotations.`)
    } catch (error) {
      console.error('Quotation expiry cron job failed:', error)
      
      // Try to log the error to audit
      try {
        const auditService = new AuditService()
        await auditService.logAction({
          userId: 'system',
          action: 'ERROR',
          entityType: 'System',
          entityId: 'quotation-expiry-cron',
          metadata: {
            type: 'scheduled-job-error',
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: new Date().toISOString()
          }
        })
      } catch (auditError) {
        console.error('Failed to log cron error to audit:', auditError)
      }
    }
  }, {
    scheduled: true,
    timezone: process.env.CRON_TIMEZONE || 'UTC'
  })

  console.warn('Quotation expiry cron job scheduled (daily at 02:00)')
}

/**
 * Manual execution for testing purposes
 */
export async function runQuotationExpiryCheck() {
  console.warn('Running manual quotation expiry check...')

  try {
    const quotationService = new QuotationService()
    const auditService = new AuditService()

    // Get quotations that will be expired
    const sentQuotations = await quotationService.getAllQuotations({
      status: 'SENT'
    })

    const expiredQuotations = sentQuotations.filter(q => 
      new Date(q.validUntil) < new Date()
    )

    console.warn(`Found ${expiredQuotations.length} expired quotations`)

    // Run the expiry check
    await quotationService.checkExpiredQuotations()

    // Log the manual execution
    await auditService.logAction({
      userId: 'system',
      action: 'UPDATE',
      entityType: 'System',
      entityId: 'quotation-expiry-manual',
      metadata: {
        type: 'manual-execution',
        expiredCount: expiredQuotations.length,
        executionTime: new Date().toISOString(),
        expiredQuotations: expiredQuotations.map(q => ({
          id: q.id,
          quotationNumber: q.quotationNumber,
          validUntil: q.validUntil
        }))
      }
    })

    return {
      success: true,
      expiredCount: expiredQuotations.length,
      expiredQuotations: expiredQuotations.map(q => q.quotationNumber)
    }
  } catch (error) {
    console.error('Manual quotation expiry check failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}