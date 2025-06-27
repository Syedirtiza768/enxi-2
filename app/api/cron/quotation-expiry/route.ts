import { getUserFromRequest } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server'
import { QuotationService } from '@/lib/services/quotation.service'
import { AuditService } from '@/lib/services/audit.service'

// GET /api/cron/quotation-expiry - Check and mark expired quotations
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is running from cron (basic security)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'default-cron-secret'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const quotationService = new QuotationService()
    const auditService = new AuditService()

    // Get expired quotations before updating them
    const expiredQuotations = await quotationService.getAllQuotations({
      status: 'SENT',
      dateTo: new Date() // All sent quotations with validUntil before now
    })

    const toExpire = expiredQuotations.filter(q => 
      new Date(q.validUntil) < new Date()
    )

    // Run the expiry check
    await quotationService.checkExpiredQuotations()

    // Log the cron job execution
    await auditService.logAction({
      userId: user?.id || 'system',
      action: 'UPDATE',
      entityType: 'System',
      entityId: 'quotation-expiry-job',
      metadata: {
        expiredCount: toExpire.length,
        expiredQuotations: toExpire.map(q => ({
          id: q.id,
          quotationNumber: q.quotationNumber,
          validUntil: q.validUntil
        }))
      }
    })

    return NextResponse.json({
      success: true,
      message: `Processed quotation expiry check`,
      expiredCount: toExpire.length,
      expiredQuotations: toExpire.map(q => q.quotationNumber)
    })
  } catch (error) {
    console.error('Error in quotation expiry cron:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process quotation expiry' },
      { status: 500 }
    )
  }
}