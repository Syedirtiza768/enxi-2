export const ShipmentStatus = {
  PREPARING: 'PREPARING',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED'
} as const

export type ShipmentStatus = typeof ShipmentStatus[keyof typeof ShipmentStatus]