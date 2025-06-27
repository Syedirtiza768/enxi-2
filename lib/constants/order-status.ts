/**
 * Order Status Constants
 * Since OrderStatus is not defined as an enum in Prisma schema,
 * we define it as a constant object here
 */
export const OrderStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  INVOICED: 'INVOICED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD'
} as const

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus]

// For backward compatibility
export default OrderStatus