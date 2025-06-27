/**
 * Account Type Constants
 * Since AccountType is not defined as an enum in Prisma schema,
 * we define it as a constant object here
 */
export const AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE'
} as const

export type AccountTypeValue = typeof AccountType[keyof typeof AccountType]

// For backward compatibility
export default AccountType