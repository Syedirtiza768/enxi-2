export const QuotationStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const;

export type QuotationStatusType = typeof QuotationStatus[keyof typeof QuotationStatus];