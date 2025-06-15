import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'

export interface CompanySettings {
  id: string
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
  defaultCurrency: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  updatedBy?: string | null
}

export interface UpdateCompanySettingsInput {
  companyName?: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
  defaultCurrency?: string
  updatedBy: string
}

export class CompanySettingsService extends BaseService {
  private auditService: AuditService
  private static instance: CompanySettings | null = null

  constructor() {
    super('CompanySettingsService')
    this.auditService = new AuditService()
  }

  /**
   * Get or create company settings (singleton pattern)
   */
  async getSettings(): Promise<CompanySettings> {
    return this.withLogging('getSettings', async () => {
      // Check cache first
      if (CompanySettingsService.instance) {
        return CompanySettingsService.instance
      }

      let settings = await prisma.companySettings.findFirst({
        where: { isActive: true }
      })

      // Create default settings if none exist
      if (!settings) {
        settings = await prisma.companySettings.create({
          data: {
            companyName: 'EnXi ERP',
            defaultCurrency: 'USD',
            isActive: true
          }
        })

        await this.auditService.logAction({
          userId: 'system',
          action: 'CREATE',
          entityType: 'CompanySettings',
          entityId: settings.id,
          metadata: { action: 'Default settings created' }
        })
      }

      CompanySettingsService.instance = settings as CompanySettings
      return settings as CompanySettings
    })
  }

  /**
   * Update company settings
   */
  async updateSettings(data: UpdateCompanySettingsInput): Promise<CompanySettings> {
    return this.withLogging('updateSettings', async () => {
      const currentSettings = await this.getSettings()

      // Validate currency if provided
      if (data.defaultCurrency) {
        const supportedCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'PKR']
        if (!supportedCurrencies.includes(data.defaultCurrency)) {
          throw new Error(`Unsupported currency: ${data.defaultCurrency}. Supported currencies: ${supportedCurrencies.join(', ')}`)
        }
      }

      const updatedSettings = await prisma.companySettings.update({
        where: { id: currentSettings.id },
        data: {
          companyName: data.companyName ?? currentSettings.companyName,
          address: data.address !== undefined ? data.address : currentSettings.address,
          phone: data.phone !== undefined ? data.phone : currentSettings.phone,
          email: data.email !== undefined ? data.email : currentSettings.email,
          website: data.website !== undefined ? data.website : currentSettings.website,
          logoUrl: data.logoUrl !== undefined ? data.logoUrl : currentSettings.logoUrl,
          defaultCurrency: data.defaultCurrency ?? currentSettings.defaultCurrency,
          updatedBy: data.updatedBy
        }
      })

      // Clear cache
      CompanySettingsService.instance = null

      // Audit log
      await this.auditService.logAction({
        userId: data.updatedBy,
        action: 'UPDATE',
        entityType: 'CompanySettings',
        entityId: updatedSettings.id,
        metadata: {
          changes: data,
          previousCurrency: currentSettings.defaultCurrency !== data.defaultCurrency ? currentSettings.defaultCurrency : undefined
        }
      })

      // Trigger event for other parts of the system
      if (data.defaultCurrency && data.defaultCurrency !== currentSettings.defaultCurrency) {
        this.logger.info('Default currency changed', {
          from: currentSettings.defaultCurrency,
          to: data.defaultCurrency
        })
      }

      CompanySettingsService.instance = updatedSettings as CompanySettings
      return updatedSettings as CompanySettings
    })
  }

  /**
   * Get the default currency
   */
  async getDefaultCurrency(): Promise<string> {
    const settings = await this.getSettings()
    return settings.defaultCurrency
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Array<{ code: string; name: string }> {
    return [
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: 'Euro' },
      { code: 'GBP', name: 'British Pound' },
      { code: 'AED', name: 'UAE Dirham' },
      { code: 'PKR', name: 'Pakistani Rupee' }
    ]
  }

  /**
   * Clear settings cache (useful for testing or after direct DB updates)
   */
  clearCache(): void {
    CompanySettingsService.instance = null
  }
}