import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { CompanySettings } from "@prisma/client"

export interface UpdateCompanySettingsInput {
  companyName?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  defaultCurrency?: string
  defaultTaxRateId?: string
  taxRegistrationNumber?: string
  quotationTermsAndConditions?: string
  quotationFooterNotes?: string
  quotationValidityDays?: number
  quotationPrefix?: string
  quotationNumberFormat?: string
  showCompanyLogoOnQuotations?: boolean
  showTaxBreakdown?: boolean
  // Sales Order settings
  orderPrefix?: string
  orderNumberFormat?: string
  defaultOrderPaymentTerms?: string
  defaultOrderShippingTerms?: string
  defaultShippingMethod?: string
  autoReserveInventory?: boolean
  requireCustomerPO?: boolean
  orderApprovalThreshold?: number
  orderConfirmationTemplate?: string
  showCompanyLogoOnOrders?: boolean
  // Default GL Accounts
  defaultInventoryAccountId?: string | null
  defaultCogsAccountId?: string | null
  defaultSalesAccountId?: string | null
  // Default Inventory Settings
  defaultTrackInventory?: boolean
}

export class CompanySettingsService extends BaseService {
  constructor() {
    super('CompanySettingsService')
  }

  async getSettings(): Promise<CompanySettings> {
    return this.withLogging('getSettings', async () => {
      // Get the first active settings record
      let settings = await prisma.companySettings.findFirst({
        where: { isActive: true },
        include: {
          defaultInventoryAccount: true,
          defaultCogsAccount: true,
          defaultSalesAccount: true
        }
      })

      // If no settings exist, create default settings
      if (!settings) {
        settings = await prisma.companySettings.create({
          data: {
            companyName: 'EnXi ERP',
            defaultCurrency: 'AED',
            quotationValidityDays: 30,
            quotationPrefix: 'QUOT',
            quotationNumberFormat: 'PREFIX-YYYY-NNNN',
            showCompanyLogoOnQuotations: true,
            showTaxBreakdown: true,
            // Sales Order defaults
            orderPrefix: 'SO',
            orderNumberFormat: 'PREFIX-YYYY-NNNN',
            autoReserveInventory: true,
            requireCustomerPO: false,
            showCompanyLogoOnOrders: true
          },
          include: {
            defaultInventoryAccount: true,
            defaultCogsAccount: true,
            defaultSalesAccount: true
          }
        })
      }

      return settings
    })
  }

  async updateSettings(
    data: UpdateCompanySettingsInput & { updatedBy: string }
  ): Promise<CompanySettings> {
    return this.withLogging('updateSettings', async () => {
      const settings = await this.getSettings()

      // Validate settings
      this.validateSettings(data)

      // Remove relation objects and keep only IDs
      const { 
        defaultInventoryAccount, 
        defaultCogsAccount, 
        defaultSalesAccount,
        ...updateData 
      } = data as any

      // Update settings
      const updated = await prisma.companySettings.update({
        where: { id: settings.id },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          defaultInventoryAccount: true,
          defaultCogsAccount: true,
          defaultSalesAccount: true
        }
      })

      return updated
    })
  }

  async getQuotationSettings(): Promise<{
    termsAndConditions: string | null
    footerNotes: string | null
    validityDays: number
    prefix: string
    numberFormat: string
    showLogo: boolean
    showTaxBreakdown: boolean
    defaultTaxRateId: string | null
    defaultCurrency: string
    companyInfo: {
      name: string
      address: string | null
      phone: string | null
      email: string | null
      website: string | null
      logoUrl: string | null
      taxRegistrationNumber: string | null
    }
  }> {
    return this.withLogging('getQuotationSettings', async () => {
      const settings = await this.getSettings()

      return {
        termsAndConditions: settings.quotationTermsAndConditions,
        footerNotes: settings.quotationFooterNotes,
        validityDays: settings.quotationValidityDays,
        prefix: settings.quotationPrefix,
        numberFormat: settings.quotationNumberFormat,
        showLogo: settings.showCompanyLogoOnQuotations,
        showTaxBreakdown: settings.showTaxBreakdown,
        defaultTaxRateId: settings.defaultTaxRateId,
        defaultCurrency: settings.defaultCurrency,
        companyInfo: {
          name: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          logoUrl: settings.logoUrl,
          taxRegistrationNumber: settings.taxRegistrationNumber
        }
      }
    })
  }

  async generateQuotationNumber(): Promise<string> {
    return this.withLogging('generateQuotationNumber', async () => {
      const settings = await this.getSettings()
      const format = settings.quotationNumberFormat
      const prefix = settings.quotationPrefix

      // Get current count for sequence
      const count = await prisma.quotation.count()
      const sequence = count + 1

      // Parse format and generate number
      let quotationNumber = format

      // Replace PREFIX with actual prefix
      quotationNumber = quotationNumber.replace('PREFIX', prefix)

      // Replace YYYY with current year
      const year = new Date().getFullYear()
      quotationNumber = quotationNumber.replace('YYYY', year.toString())

      // Replace YY with 2-digit year
      const shortYear = year.toString().slice(-2)
      quotationNumber = quotationNumber.replace('YY', shortYear)

      // Replace MM with month
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
      quotationNumber = quotationNumber.replace('MM', month)

      // Replace DD with day
      const day = new Date().getDate().toString().padStart(2, '0')
      quotationNumber = quotationNumber.replace('DD', day)

      // Replace NNNN with sequence (padded based on N count)
      const nCount = (format.match(/N+/) || ['NNNN'])[0].length
      const paddedSequence = sequence.toString().padStart(nCount, '0')
      quotationNumber = quotationNumber.replace(/N+/, paddedSequence)

      // Verify uniqueness
      const existing = await prisma.quotation.findUnique({
        where: { quotationNumber }
      })

      if (existing) {
        // Add timestamp suffix for uniqueness
        const timestamp = Date.now().toString().slice(-6)
        quotationNumber = `${quotationNumber}-${timestamp}`
      }

      return quotationNumber
    })
  }

  async getSalesOrderSettings(): Promise<{
    prefix: string
    numberFormat: string
    defaultPaymentTerms: string | null
    defaultShippingTerms: string | null
    defaultShippingMethod: string | null
    autoReserveInventory: boolean
    requireCustomerPO: boolean
    orderApprovalThreshold: number | null
    orderConfirmationTemplate: string | null
    showLogo: boolean
    showTaxBreakdown: boolean
    defaultTaxRateId: string | null
    defaultCurrency: string
    companyInfo: {
      name: string
      address: string | null
      phone: string | null
      email: string | null
      website: string | null
      logoUrl: string | null
      taxRegistrationNumber: string | null
    }
  }> {
    return this.withLogging('getSalesOrderSettings', async () => {
      const settings = await this.getSettings()

      return {
        prefix: settings.orderPrefix,
        numberFormat: settings.orderNumberFormat,
        defaultPaymentTerms: settings.defaultOrderPaymentTerms,
        defaultShippingTerms: settings.defaultOrderShippingTerms,
        defaultShippingMethod: settings.defaultShippingMethod,
        autoReserveInventory: settings.autoReserveInventory,
        requireCustomerPO: settings.requireCustomerPO,
        orderApprovalThreshold: settings.orderApprovalThreshold,
        orderConfirmationTemplate: settings.orderConfirmationTemplate,
        showLogo: settings.showCompanyLogoOnOrders,
        showTaxBreakdown: settings.showTaxBreakdown,
        defaultTaxRateId: settings.defaultTaxRateId,
        defaultCurrency: settings.defaultCurrency,
        companyInfo: {
          name: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          logoUrl: settings.logoUrl,
          taxRegistrationNumber: settings.taxRegistrationNumber
        }
      }
    })
  }

  async generateSalesOrderNumber(): Promise<string> {
    return this.withLogging('generateSalesOrderNumber', async () => {
      const settings = await this.getSettings()
      const format = settings.orderNumberFormat
      const prefix = settings.orderPrefix

      // Get current count for sequence
      const count = await prisma.salesOrder.count()
      const sequence = count + 1

      // Parse format and generate number
      let orderNumber = format

      // Replace PREFIX with actual prefix
      orderNumber = orderNumber.replace('PREFIX', prefix)

      // Replace YYYY with current year
      const year = new Date().getFullYear()
      orderNumber = orderNumber.replace('YYYY', year.toString())

      // Replace YY with 2-digit year
      const shortYear = year.toString().slice(-2)
      orderNumber = orderNumber.replace('YY', shortYear)

      // Replace MM with month
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
      orderNumber = orderNumber.replace('MM', month)

      // Replace DD with day
      const day = new Date().getDate().toString().padStart(2, '0')
      orderNumber = orderNumber.replace('DD', day)

      // Replace NNNN with sequence (padded based on N count)
      const nCount = (format.match(/N+/) || ['NNNN'])[0].length
      const paddedSequence = sequence.toString().padStart(nCount, '0')
      orderNumber = orderNumber.replace(/N+/, paddedSequence)

      // Verify uniqueness
      const existing = await prisma.salesOrder.findUnique({
        where: { orderNumber }
      })

      if (existing) {
        // Add timestamp suffix for uniqueness
        const timestamp = Date.now().toString().slice(-6)
        orderNumber = `${orderNumber}-${timestamp}`
      }

      return orderNumber
    })
  }

  private validateSettings(data: UpdateCompanySettingsInput): void {
    if (data.companyName && data.companyName.length > 200) {
      throw new Error('Company name must be 200 characters or less')
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format')
    }

    if (data.website && data.website.trim() && !this.isValidUrl(data.website)) {
      throw new Error('Invalid website URL format')
    }

    if (data.quotationValidityDays !== undefined) {
      if (data.quotationValidityDays < 1 || data.quotationValidityDays > 365) {
        throw new Error('Quotation validity days must be between 1 and 365')
      }
    }

    if (data.quotationPrefix && data.quotationPrefix.length > 10) {
      throw new Error('Quotation prefix must be 10 characters or less')
    }

    if (data.quotationNumberFormat) {
      // Validate format contains at least one N for sequence
      if (!data.quotationNumberFormat.includes('N')) {
        throw new Error('Quotation number format must include at least one N for sequence')
      }
      if (data.quotationNumberFormat.length > 50) {
        throw new Error('Quotation number format must be 50 characters or less')
      }
    }

    if (data.defaultCurrency && data.defaultCurrency.length !== 3) {
      throw new Error('Currency code must be 3 characters (e.g., USD, EUR)')
    }

    // Sales Order settings validation
    if (data.orderPrefix && data.orderPrefix.length > 10) {
      throw new Error('Order prefix must be 10 characters or less')
    }

    if (data.orderNumberFormat) {
      // Validate format contains at least one N for sequence
      if (!data.orderNumberFormat.includes('N')) {
        throw new Error('Order number format must include at least one N for sequence')
      }
      if (data.orderNumberFormat.length > 50) {
        throw new Error('Order number format must be 50 characters or less')
      }
    }

    if (data.orderApprovalThreshold !== undefined && data.orderApprovalThreshold < 0) {
      throw new Error('Order approval threshold cannot be negative')
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidUrl(url: string): boolean {
    try {
      // If the URL doesn't have a protocol, add https:// as default
      let urlToValidate = url.trim()
      if (!urlToValidate.match(/^https?:\/\//i)) {
        urlToValidate = 'https://' + urlToValidate
      }
      new URL(urlToValidate)
      return true
    } catch {
      return false
    }
  }

  async getInventoryDefaults(): Promise<{
    trackInventory: boolean
    inventoryAccountId: string | null
    cogsAccountId: string | null
    salesAccountId: string | null
  }> {
    return this.withLogging('getInventoryDefaults', async () => {
      const settings = await this.getSettings()
      
      return {
        trackInventory: settings.defaultTrackInventory,
        inventoryAccountId: settings.defaultInventoryAccountId,
        cogsAccountId: settings.defaultCogsAccountId,
        salesAccountId: settings.defaultSalesAccountId
      }
    })
  }

  getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
    ]
  }
}