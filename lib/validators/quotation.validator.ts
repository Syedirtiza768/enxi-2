import { z } from 'zod'

// Constants for validation
export const MAX_ITEM_CODE_LENGTH = 50
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_LINE_DESCRIPTION_LENGTH = 200
export const MAX_INTERNAL_DESCRIPTION_LENGTH = 1000
export const MAX_PAYMENT_TERMS_LENGTH = 100
export const MAX_DELIVERY_TERMS_LENGTH = 200
export const MAX_NOTES_LENGTH = 1000
export const MAX_QUANTITY = 999999
export const MAX_PRICE = 9999999.99
export const MIN_MARGIN_THRESHOLD = -100 // -100% margin threshold

// Quotation item schema
export const quotationItemSchema = z.object({
  lineNumber: z.number().int().positive('Line number must be positive'),
  lineDescription: z.string().max(MAX_LINE_DESCRIPTION_LENGTH).optional(),
  isLineHeader: z.boolean(),
  itemType: z.enum(['PRODUCT', 'SERVICE']),
  itemId: z.string().optional(),
  itemCode: z.string()
    .min(1, 'Item code is required')
    .max(MAX_ITEM_CODE_LENGTH, `Item code must be ${MAX_ITEM_CODE_LENGTH} characters or less`)
    .trim(),
  description: z.string()
    .min(1, 'Description is required')
    .max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`)
    .trim(),
  internalDescription: z.string()
    .max(MAX_INTERNAL_DESCRIPTION_LENGTH, `Internal description must be ${MAX_INTERNAL_DESCRIPTION_LENGTH} characters or less`)
    .optional(),
  quantity: z.number()
    .positive('Quantity must be greater than 0')
    .max(MAX_QUANTITY, `Quantity must be less than ${MAX_QUANTITY.toLocaleString()}`)
    .refine(val => Number.isFinite(val), 'Quantity must be a valid number'),
  unitPrice: z.number()
    .min(0, 'Unit price cannot be negative')
    .max(MAX_PRICE, `Unit price must be less than ${MAX_PRICE.toLocaleString()}`)
    .refine(val => Number.isFinite(val), 'Unit price must be a valid number'),
  unitOfMeasureId: z.string().optional(),
  cost: z.number()
    .min(0, 'Cost cannot be negative')
    .max(MAX_PRICE, `Cost must be less than ${MAX_PRICE.toLocaleString()}`)
    .refine(val => Number.isFinite(val), 'Cost must be a valid number')
    .optional(),
  discount: z.number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%')
    .refine(val => Number.isFinite(val), 'Discount must be a valid number')
    .optional(),
  taxRate: z.number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .refine(val => Number.isFinite(val), 'Tax rate must be a valid number')
    .optional(),
  taxRateId: z.string().optional(),
  sortOrder: z.number().optional(),
  availabilityStatus: z.string().optional(),
  availableQuantity: z.number().optional()
}).refine(data => {
  // Business rule: Check margin if cost and price are provided
  if (data.cost !== undefined && data.cost > 0 && data.unitPrice > 0) {
    const margin = ((data.unitPrice - data.cost) / data.unitPrice) * 100
    return margin >= MIN_MARGIN_THRESHOLD
  }
  return true
}, {
  message: 'Selling price is significantly below cost'
})

// Create quotation schema
export const createQuotationSchema = z.object({
  salesCaseId: z.string().min(1, 'Sales case is required'),
  validUntil: z.date().refine(date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  }, 'Valid until date must be in the future').refine(date => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 180)
    return date <= maxDate
  }, 'Valid until date should not be more than 6 months in the future'),
  paymentTerms: z.string()
    .max(MAX_PAYMENT_TERMS_LENGTH, `Payment terms must be ${MAX_PAYMENT_TERMS_LENGTH} characters or less`)
    .optional(),
  deliveryTerms: z.string()
    .max(MAX_DELIVERY_TERMS_LENGTH, `Delivery terms must be ${MAX_DELIVERY_TERMS_LENGTH} characters or less`)
    .optional(),
  notes: z.string()
    .max(MAX_NOTES_LENGTH, `Notes must be ${MAX_NOTES_LENGTH} characters or less`)
    .optional(),
  internalNotes: z.string()
    .max(MAX_NOTES_LENGTH, `Internal notes must be ${MAX_NOTES_LENGTH} characters or less`)
    .optional(),
  items: z.array(quotationItemSchema)
    .min(1, 'At least one quotation item is required')
    .refine(items => {
      // Check for duplicate item codes within the same line
      const lineItemCodes = new Map<number, Set<string>>()
      
      for (const item of items) {
        if (!lineItemCodes.has(item.lineNumber)) {
          lineItemCodes.set(item.lineNumber, new Set())
        }
        
        const itemCode = item.itemCode.toLowerCase().trim()
        if (lineItemCodes.get(item.lineNumber)!.has(itemCode)) {
          return false
        }
        lineItemCodes.get(item.lineNumber)!.add(itemCode)
      }
      
      return true
    }, 'Duplicate item codes found within the same line')
})

// Update quotation schema
export const updateQuotationSchema = z.object({
  validUntil: z.date().refine(date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  }, 'Valid until date must be in the future').refine(date => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 180)
    return date <= maxDate
  }, 'Valid until date should not be more than 6 months in the future').optional(),
  paymentTerms: z.string()
    .max(MAX_PAYMENT_TERMS_LENGTH, `Payment terms must be ${MAX_PAYMENT_TERMS_LENGTH} characters or less`)
    .optional(),
  deliveryTerms: z.string()
    .max(MAX_DELIVERY_TERMS_LENGTH, `Delivery terms must be ${MAX_DELIVERY_TERMS_LENGTH} characters or less`)
    .optional(),
  notes: z.string()
    .max(MAX_NOTES_LENGTH, `Notes must be ${MAX_NOTES_LENGTH} characters or less`)
    .optional(),
  internalNotes: z.string()
    .max(MAX_NOTES_LENGTH, `Internal notes must be ${MAX_NOTES_LENGTH} characters or less`)
    .optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one quotation item is required').optional()
})

// Type exports
export type CreateQuotationData = z.infer<typeof createQuotationSchema>
export type UpdateQuotationData = z.infer<typeof updateQuotationSchema>
export type QuotationItemData = z.infer<typeof quotationItemSchema>

// Validation helper functions
export function validateQuotationData(data: unknown): CreateQuotationData {
  return createQuotationSchema.parse(data)
}

export function validateUpdateQuotationData(data: unknown): UpdateQuotationData {
  return updateQuotationSchema.parse(data)
}

// Field-specific validation functions for real-time validation
export function validateItemCode(code: string): string | null {
  if (!code || code.trim().length === 0) return 'Item code is required'
  if (code.length > MAX_ITEM_CODE_LENGTH) return `Item code must be ${MAX_ITEM_CODE_LENGTH} characters or less`
  return null
}

export function validateDescription(description: string): string | null {
  if (!description || description.trim().length === 0) return 'Description is required'
  if (description.length > MAX_DESCRIPTION_LENGTH) return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
  return null
}

export function validateQuantity(quantity: number, isLineHeader?: boolean): string | null {
  // Allow 0 quantity for line headers
  if (isLineHeader && quantity === 0) return null
  
  if (!quantity || quantity <= 0) return 'Quantity must be greater than 0'
  if (quantity > MAX_QUANTITY) return `Quantity must be less than ${MAX_QUANTITY.toLocaleString()}`
  if (!Number.isFinite(quantity)) return 'Quantity must be a valid number'
  return null
}

export function validatePrice(price: number): string | null {
  if (price < 0) return 'Price cannot be negative'
  if (price > MAX_PRICE) return `Price must be less than ${MAX_PRICE.toLocaleString()}`
  if (!Number.isFinite(price)) return 'Price must be a valid number'
  return null
}

export function validateDiscount(discount: number | undefined): string | null {
  if (discount === undefined || discount === null) return null
  if (discount < 0) return 'Discount cannot be negative'
  if (discount > 100) return 'Discount cannot exceed 100%'
  if (!Number.isFinite(discount)) return 'Discount must be a valid number'
  return null
}

export function validateTaxRate(taxRate: number | undefined): string | null {
  if (taxRate === undefined || taxRate === null) return null
  if (taxRate < 0) return 'Tax rate cannot be negative'
  if (taxRate > 100) return 'Tax rate cannot exceed 100%'
  if (!Number.isFinite(taxRate)) return 'Tax rate must be a valid number'
  return null
}

export function validateMargin(unitPrice: number, cost: number | undefined): string | null {
  if (cost === undefined || cost === null || cost === 0) return null
  if (unitPrice === 0) return null
  
  const margin = ((unitPrice - cost) / unitPrice) * 100
  if (margin < MIN_MARGIN_THRESHOLD) return 'Selling price is significantly below cost'
  
  return null
}

export function validatePaymentTerms(terms: string): string | null {
  if (!terms || terms.trim().length === 0) return 'Payment terms are required'
  if (terms.length > MAX_PAYMENT_TERMS_LENGTH) return `Payment terms must be ${MAX_PAYMENT_TERMS_LENGTH} characters or less`
  
  // Validate payment terms format
  const validTerms = ['Net 7', 'Net 14', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'Due on Receipt', 'COD', 'Custom']
  const customTermPattern = /^Net \d{1,3}$/
  
  if (!validTerms.includes(terms) && !customTermPattern.test(terms)) {
    return 'Please use standard payment terms (e.g., Net 30) or "Custom"'
  }
  
  return null
}

export function validateValidUntilDate(date: Date | string): string | null {
  const validUntilDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (validUntilDate <= today) return 'Valid until date must be in the future'
  
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 180)
  if (validUntilDate > maxDate) return 'Valid until date should not be more than 6 months in the future'
  
  return null
}