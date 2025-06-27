import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { NotificationService } from './notification.service'
import { QuotationService } from './quotation.service'
import { QuotationStatus } from "@prisma/client"
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns'

export interface FollowUpConfig {
  enableAutoFollowUp: boolean
  reminderDaysBeforeExpiry: number[] // e.g., [7, 3, 1] for 7, 3, and 1 day before expiry
  followUpDaysAfterSent: number[] // e.g., [3, 7, 14] for follow-ups after sending
  autoExpireQuotations: boolean
}

export class QuotationFollowUpService extends BaseService {
  private notificationService: NotificationService
  private quotationService: QuotationService

  constructor() {
    super('QuotationFollowUpService')
    this.notificationService = new NotificationService()
    this.quotationService = new QuotationService()
  }

  /**
   * Process all quotation follow-ups
   * This should be run as a scheduled job (e.g., daily)
   */
  async processFollowUps(): Promise<void> {
    return this.withLogging('processFollowUps', async () => {
      const config = await this.getFollowUpConfig()
      
      if (!config.enableAutoFollowUp) {
        console.log('Auto follow-up is disabled')
        return
      }

      // Process different types of follow-ups in parallel
      await Promise.all([
        this.processExpiryReminders(config),
        this.processSentFollowUps(config),
        this.processExpiredQuotations(config)
      ])
    })
  }

  /**
   * Send reminders for quotations approaching expiry
   */
  private async processExpiryReminders(config: FollowUpConfig): Promise<void> {
    return this.withLogging('processExpiryReminders', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const daysBefore of config.reminderDaysBeforeExpiry) {
        const targetDate = addDays(today, daysBefore)
        targetDate.setHours(23, 59, 59, 999)

        // Find quotations expiring on the target date
        const expiringQuotations = await prisma.quotation.findMany({
          where: {
            status: QuotationStatus.SENT,
            validUntil: {
              gte: addDays(today, daysBefore),
              lte: targetDate
            },
            // Check if reminder not already sent (using metadata)
            NOT: {
              metadata: {
                path: ['reminders', `expiry_${daysBefore}d`],
                equals: true
              }
            }
          },
          include: {
            salesCase: {
              include: {
                customer: true,
                assignedTo: true
              }
            }
          }
        })

        for (const quotation of expiringQuotations) {
          await this.sendExpiryReminder(quotation, daysBefore)
        }
      }
    })
  }

  /**
   * Send follow-ups for sent quotations
   */
  private async processSentFollowUps(config: FollowUpConfig): Promise<void> {
    return this.withLogging('processSentFollowUps', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const daysAfter of config.followUpDaysAfterSent) {
        const targetDate = addDays(today, -daysAfter)
        
        // Find quotations sent on the target date
        const sentQuotations = await prisma.quotation.findMany({
          where: {
            status: QuotationStatus.SENT,
            updatedAt: {
              gte: targetDate,
              lt: addDays(targetDate, 1)
            },
            // Check if follow-up not already sent
            NOT: {
              metadata: {
                path: ['reminders', `followup_${daysAfter}d`],
                equals: true
              }
            }
          },
          include: {
            salesCase: {
              include: {
                customer: true,
                assignedTo: true
              }
            }
          }
        })

        for (const quotation of sentQuotations) {
          await this.sendFollowUpReminder(quotation, daysAfter)
        }
      }
    })
  }

  /**
   * Auto-expire quotations past their validity date
   */
  private async processExpiredQuotations(config: FollowUpConfig): Promise<void> {
    return this.withLogging('processExpiredQuotations', async () => {
      if (!config.autoExpireQuotations) {
        return
      }

      await this.quotationService.checkExpiredQuotations()
    })
  }

  /**
   * Send expiry reminder notification
   */
  private async sendExpiryReminder(quotation: any, daysBefore: number): Promise<void> {
    return this.withLogging('sendExpiryReminder', async () => {
      const { salesCase } = quotation

      // Create internal notification
      await this.notificationService.createNotification({
        type: 'QUOTATION_EXPIRY_REMINDER',
        title: `Quotation Expiring in ${daysBefore} days`,
        message: `Quotation ${quotation.quotationNumber} for ${salesCase.customer.name} is expiring in ${daysBefore} days`,
        userId: salesCase.assignedToId || salesCase.createdById,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: daysBefore <= 3 ? 'HIGH' : 'MEDIUM'
      })

      // Send email notification if configured
      if (salesCase.assignedTo?.email) {
        await this.notificationService.sendEmail({
          to: salesCase.assignedTo.email,
          subject: `Reminder: Quotation ${quotation.quotationNumber} expiring soon`,
          template: 'quotation-expiry-reminder',
          data: {
            quotationNumber: quotation.quotationNumber,
            customerName: salesCase.customer.name,
            daysRemaining: daysBefore,
            expiryDate: quotation.validUntil,
            totalAmount: quotation.totalAmount,
            currency: quotation.currency,
            viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/quotations/${quotation.id}`
          }
        })
      }

      // Mark reminder as sent
      await this.updateQuotationMetadata(quotation.id, {
        reminders: {
          ...(quotation.metadata?.reminders || {}),
          [`expiry_${daysBefore}d`]: true,
          [`expiry_${daysBefore}d_sent_at`]: new Date().toISOString()
        }
      })
    })
  }

  /**
   * Send follow-up reminder for sent quotations
   */
  private async sendFollowUpReminder(quotation: any, daysAfter: number): Promise<void> {
    return this.withLogging('sendFollowUpReminder', async () => {
      const { salesCase } = quotation

      // Create internal notification
      await this.notificationService.createNotification({
        type: 'QUOTATION_FOLLOWUP',
        title: `Follow up on Quotation ${quotation.quotationNumber}`,
        message: `It's been ${daysAfter} days since quotation was sent to ${salesCase.customer.name}`,
        userId: salesCase.assignedToId || salesCase.createdById,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: 'MEDIUM',
        actionUrl: `/quotations/${quotation.id}`,
        actionLabel: 'View Quotation'
      })

      // Send email reminder to sales person
      if (salesCase.assignedTo?.email) {
        await this.notificationService.sendEmail({
          to: salesCase.assignedTo.email,
          subject: `Follow up: Quotation ${quotation.quotationNumber}`,
          template: 'quotation-followup',
          data: {
            quotationNumber: quotation.quotationNumber,
            customerName: salesCase.customer.name,
            customerEmail: salesCase.customer.email,
            daysSinceSent: daysAfter,
            totalAmount: quotation.totalAmount,
            currency: quotation.currency,
            viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/quotations/${quotation.id}`
          }
        })
      }

      // Mark follow-up as sent
      await this.updateQuotationMetadata(quotation.id, {
        reminders: {
          ...(quotation.metadata?.reminders || {}),
          [`followup_${daysAfter}d`]: true,
          [`followup_${daysAfter}d_sent_at`]: new Date().toISOString()
        }
      })
    })
  }

  /**
   * Update quotation metadata
   */
  private async updateQuotationMetadata(quotationId: string, metadata: any): Promise<void> {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        metadata: metadata
      }
    })
  }

  /**
   * Get follow-up configuration
   */
  private async getFollowUpConfig(): Promise<FollowUpConfig> {
    // This could be stored in company settings or a separate config table
    const settings = await prisma.companySettings.findFirst()
    
    return {
      enableAutoFollowUp: settings?.quotationSettings?.enableAutoFollowUp ?? true,
      reminderDaysBeforeExpiry: settings?.quotationSettings?.reminderDaysBeforeExpiry ?? [7, 3, 1],
      followUpDaysAfterSent: settings?.quotationSettings?.followUpDaysAfterSent ?? [3, 7, 14],
      autoExpireQuotations: settings?.quotationSettings?.autoExpireQuotations ?? true
    }
  }

  /**
   * Get quotation follow-up timeline
   */
  async getQuotationTimeline(quotationId: string): Promise<{
    sent: Date | null
    reminders: Array<{ type: string; date: Date; sent: boolean }>
    expiry: Date
    followUps: Array<{ daysAfter: number; date: Date; sent: boolean }>
  }> {
    return this.withLogging('getQuotationTimeline', async () => {
      const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId }
      })

      if (!quotation) {
        throw new Error('Quotation not found')
      }

      const config = await this.getFollowUpConfig()
      const sentDate = quotation.status === QuotationStatus.SENT ? quotation.updatedAt : null
      
      const timeline = {
        sent: sentDate,
        reminders: [] as Array<{ type: string; date: Date; sent: boolean }>,
        expiry: new Date(quotation.validUntil),
        followUps: [] as Array<{ daysAfter: number; date: Date; sent: boolean }>
      }

      // Calculate expiry reminders
      for (const daysBefore of config.reminderDaysBeforeExpiry) {
        const reminderDate = addDays(new Date(quotation.validUntil), -daysBefore)
        timeline.reminders.push({
          type: `${daysBefore} days before expiry`,
          date: reminderDate,
          sent: quotation.metadata?.reminders?.[`expiry_${daysBefore}d`] || false
        })
      }

      // Calculate follow-up dates
      if (sentDate) {
        for (const daysAfter of config.followUpDaysAfterSent) {
          const followUpDate = addDays(sentDate, daysAfter)
          timeline.followUps.push({
            daysAfter,
            date: followUpDate,
            sent: quotation.metadata?.reminders?.[`followup_${daysAfter}d`] || false
          })
        }
      }

      return timeline
    })
  }

  /**
   * Manually trigger a follow-up for a specific quotation
   */
  async triggerManualFollowUp(quotationId: string, userId: string, message?: string): Promise<void> {
    return this.withLogging('triggerManualFollowUp', async () => {
      const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        include: {
          salesCase: {
            include: {
              customer: true
            }
          }
        }
      })

      if (!quotation) {
        throw new Error('Quotation not found')
      }

      // Create activity log
      await prisma.activityLog.create({
        data: {
          type: 'QUOTATION_FOLLOWUP',
          description: message || `Manual follow-up triggered for quotation ${quotation.quotationNumber}`,
          entityType: 'QUOTATION',
          entityId: quotationId,
          userId,
          metadata: {
            quotationNumber: quotation.quotationNumber,
            customerName: quotation.salesCase.customer.name,
            status: quotation.status
          }
        }
      })

      // Send notification to assigned user
      if (quotation.salesCase.assignedToId) {
        await this.notificationService.createNotification({
          type: 'QUOTATION_MANUAL_FOLLOWUP',
          title: 'Manual Follow-up Required',
          message: message || `Please follow up on quotation ${quotation.quotationNumber} for ${quotation.salesCase.customer.name}`,
          userId: quotation.salesCase.assignedToId,
          entityType: 'QUOTATION',
          entityId: quotationId,
          priority: 'HIGH'
        })
      }
    })
  }
}