import { z } from 'zod';

/**
 * Common validation schemas matching backend requirements
 * These validators ensure frontend validation matches backend expectations
 */

// String length constraints from backend
export const MAX_NAME_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_NOTES_LENGTH = 1000;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_CODE_LENGTH = 50;
export const MAX_URL_LENGTH = 255;
export const MAX_PHONE_LENGTH = 20;

// Common string validators
export const nameValidator = z
  .string()
  .min(1, 'Name is required')
  .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
  .trim();

export const emailValidator = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(MAX_EMAIL_LENGTH, `Email must be less than ${MAX_EMAIL_LENGTH} characters`)
  .toLowerCase()
  .trim();

export const phoneValidator = z
  .string()
  .max(MAX_PHONE_LENGTH, `Phone must be less than ${MAX_PHONE_LENGTH} characters`)
  .regex(/^[\d\s\-\+\(\)]+$/, 'Phone can only contain numbers, spaces, and +()-')
  .optional()
  .or(z.literal(''));

export const urlValidator = z
  .string()
  .max(MAX_URL_LENGTH, `URL must be less than ${MAX_URL_LENGTH} characters`)
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

export const codeValidator = z
  .string()
  .min(1, 'Code is required')
  .max(MAX_CODE_LENGTH, `Code must be less than ${MAX_CODE_LENGTH} characters`)
  .regex(/^[A-Z0-9\-_]+$/, 'Code can only contain uppercase letters, numbers, hyphens, and underscores')
  .trim();

export const descriptionValidator = z
  .string()
  .max(MAX_DESCRIPTION_LENGTH, `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`)
  .optional()
  .or(z.literal(''));

export const notesValidator = z
  .string()
  .max(MAX_NOTES_LENGTH, `Notes must be less than ${MAX_NOTES_LENGTH} characters`)
  .optional()
  .or(z.literal(''));

export const addressValidator = z
  .string()
  .max(MAX_ADDRESS_LENGTH, `Address must be less than ${MAX_ADDRESS_LENGTH} characters`)
  .optional()
  .or(z.literal(''));

// Number validators
export const positiveNumberValidator = z
  .number()
  .positive('Must be a positive number')
  .finite('Must be a valid number');

export const nonNegativeNumberValidator = z
  .number()
  .nonnegative('Cannot be negative')
  .finite('Must be a valid number');

export const percentageValidator = z
  .number()
  .min(0, 'Percentage cannot be less than 0')
  .max(100, 'Percentage cannot exceed 100')
  .finite('Must be a valid percentage');

export const currencyAmountValidator = z
  .number()
  .multipleOf(0.01, 'Amount must have at most 2 decimal places')
  .nonnegative('Amount cannot be negative')
  .finite('Must be a valid amount');

export const quantityValidator = z
  .number()
  .positive('Quantity must be greater than 0')
  .finite('Must be a valid quantity');

// Date validators
export const futureDateValidator = z
  .date()
  .refine((date) => date > new Date(), {
    message: 'Date must be in the future',
  });

export const pastOrPresentDateValidator = z
  .date()
  .refine((date) => date <= new Date(), {
    message: 'Date cannot be in the future',
  });

// Currency list from backend
export const SUPPORTED_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'OMR', 'KWD', 'BHD'] as const;

export const currencyValidator = z.enum(SUPPORTED_CURRENCIES, {
  errorMap: (): void => ({ message: 'Invalid currency selection' }),
});

// Payment terms (in days)
export const PAYMENT_TERMS_OPTIONS = [0, 7, 15, 30, 45, 60, 90] as const;

export const paymentTermsValidator = z
  .number()
  .int('Payment terms must be a whole number')
  .nonnegative('Payment terms cannot be negative')
  .refine((val) => val <= 365, {
    message: 'Payment terms cannot exceed 365 days',
  });

// Common enum validators based on Prisma schema
export const leadSourceValidator = z.enum([
  'WEBSITE',
  'REFERRAL',
  'SOCIAL_MEDIA',
  'EMAIL_CAMPAIGN',
  'PHONE_CALL',
  'TRADE_SHOW',
  'PARTNER',
  'OTHER']);

export const leadStatusValidator = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATION',
  'CONVERTED',
  'LOST']);

export const paymentMethodValidator = z.enum([
  'CASH',
  'CHECK',
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'DEBIT_CARD']);

// Business rule validators
export const creditLimitValidator = z
  .number()
  .nonnegative('Credit limit cannot be negative')
  .finite('Must be a valid amount')
  .refine((val) => val <= 999999999.99, {
    message: 'Credit limit too high',
  });

export const taxIdValidator = z
  .string()
  .max(50, 'Tax ID must be less than 50 characters')
  .regex(/^[A-Z0-9\-\/]+$/, 'Tax ID can only contain uppercase letters, numbers, hyphens, and slashes')
  .optional()
  .or(z.literal(''));

// File upload validators
export const fileUploadValidator = z.object({
  name: z.string().max(255, 'File name too long'),
  size: z.number().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),
  type: z.string().regex(/^(image\/(jpeg|jpg|png|gif)|application\/pdf)$/, 'Only images and PDFs are allowed'),
});

// Utility functions for form validation
export function validateRequired<T>(value: T, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const result = emailValidator.safeParse(email);
  return result.success ? null : result.error.errors[0].message;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null; // Phone is optional
  const result = phoneValidator.safeParse(phone);
  return result.success ? null : result.error.errors[0].message;
}

export function validateUrl(url: string): string | null {
  if (!url) return null; // URL is optional
  const result = urlValidator.safeParse(url);
  return result.success ? null : result.error.errors[0].message;
}

export function validatePercentage(value: number): string | null {
  const result = percentageValidator.safeParse(value);
  return result.success ? null : result.error.errors[0].message;
}

export function validateCurrency(amount: number): string | null {
  const result = currencyAmountValidator.safeParse(amount);
  return result.success ? null : result.error.errors[0].message;
}

// Helper to format validation errors
export function formatValidationError(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}

// Helper to check if value exceeds max length
export function checkMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (value && value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  return null;
}

// Export all validators for use in forms
export const validators = {
  name: nameValidator,
  email: emailValidator,
  phone: phoneValidator,
  url: urlValidator,
  code: codeValidator,
  description: descriptionValidator,
  notes: notesValidator,
  address: addressValidator,
  positiveNumber: positiveNumberValidator,
  nonNegativeNumber: nonNegativeNumberValidator,
  percentage: percentageValidator,
  currencyAmount: currencyAmountValidator,
  quantity: quantityValidator,
  futureDate: futureDateValidator,
  pastOrPresentDate: pastOrPresentDateValidator,
  currency: currencyValidator,
  paymentTerms: paymentTermsValidator,
  leadSource: leadSourceValidator,
  leadStatus: leadStatusValidator,
  paymentMethod: paymentMethodValidator,
  creditLimit: creditLimitValidator,
  taxId: taxIdValidator,
  fileUpload: fileUploadValidator,
};

export default validators;