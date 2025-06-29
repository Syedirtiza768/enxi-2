/**
 * Prisma Mock Factory
 * Provides utilities for creating consistent Prisma mocks in tests
 */

let mockIdCounter = 0

/**
 * Generate a consistent mock ID
 */
export function generateMockId(prefix = 'mock'): string {
  return `${prefix}_${++mockIdCounter}`
}

/**
 * Reset the ID counter between tests
 */
export function resetMockIdCounter(): void {
  mockIdCounter = 0
}

/**
 * Create a base entity with common fields
 */
export function createBaseEntity(overrides = {}) {
  return {
    id: generateMockId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

/**
 * Create mock implementations for common Prisma operations
 */
export function createPrismaMock<T>(modelName: string, defaults: Partial<T> = {}) {
  const records: Map<string, T> = new Map()

  return {
    create: jest.fn().mockImplementation(({ data, include }: any) => {
      const record = {
        ...createBaseEntity(),
        ...defaults,
        ...data
      } as T

      records.set((record as any).id, record)

      // Handle includes
      if (include) {
        return handleIncludes(record, include)
      }

      return Promise.resolve(record)
    }),

    findUnique: jest.fn().mockImplementation(({ where, include }: any) => {
      const record = records.get(where.id)
      
      if (!record) {
        return Promise.resolve(null)
      }

      if (include) {
        return Promise.resolve(handleIncludes(record, include))
      }

      return Promise.resolve(record)
    }),

    findFirst: jest.fn().mockImplementation(({ where, include }: any) => {
      const record = Array.from(records.values()).find(r => 
        Object.entries(where || {}).every(([key, value]) => 
          (r as any)[key] === value
        )
      )

      if (!record) {
        return Promise.resolve(null)
      }

      if (include) {
        return Promise.resolve(handleIncludes(record, include))
      }

      return Promise.resolve(record)
    }),

    findMany: jest.fn().mockImplementation(({ where, include, orderBy, take, skip }: any) => {
      let results = Array.from(records.values())

      // Apply where filter
      if (where) {
        results = results.filter(r => 
          Object.entries(where).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle complex where conditions
              if ('in' in value) {
                return value.in.includes((r as any)[key])
              }
              if ('contains' in value) {
                return (r as any)[key]?.includes(value.contains)
              }
              if ('gte' in value || 'lte' in value) {
                const val = (r as any)[key]
                return (!value.gte || val >= value.gte) && 
                       (!value.lte || val <= value.lte)
              }
            }
            return (r as any)[key] === value
          })
        )
      }

      // Apply orderBy
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        results.sort((a, b) => {
          const aVal = (a as any)[field]
          const bVal = (b as any)[field]
          const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return direction === 'desc' ? -compare : compare
        })
      }

      // Apply pagination
      if (skip) {
        results = results.slice(skip)
      }
      if (take) {
        results = results.slice(0, take)
      }

      // Apply includes
      if (include) {
        results = results.map(r => handleIncludes(r, include))
      }

      return Promise.resolve(results)
    }),

    update: jest.fn().mockImplementation(({ where, data, include }: any) => {
      const record = records.get(where.id)
      
      if (!record) {
        throw new Error('Record not found')
      }

      const updated = {
        ...record,
        ...data,
        updatedAt: new Date()
      }

      records.set((updated as any).id, updated)

      if (include) {
        return Promise.resolve(handleIncludes(updated, include))
      }

      return Promise.resolve(updated)
    }),

    updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
      let count = 0
      
      records.forEach((record, id) => {
        if (Object.entries(where || {}).every(([key, value]) => 
          (record as any)[key] === value
        )) {
          records.set(id, {
            ...record,
            ...data,
            updatedAt: new Date()
          })
          count++
        }
      })

      return Promise.resolve({ count })
    }),

    delete: jest.fn().mockImplementation(({ where }: any) => {
      const record = records.get(where.id)
      
      if (!record) {
        throw new Error('Record not found')
      }

      records.delete(where.id)
      return Promise.resolve(record)
    }),

    deleteMany: jest.fn().mockImplementation(({ where }: any) => {
      let count = 0
      
      records.forEach((record, id) => {
        if (!where || Object.entries(where).every(([key, value]) => 
          (record as any)[key] === value
        )) {
          records.delete(id)
          count++
        }
      })

      return Promise.resolve({ count })
    }),

    count: jest.fn().mockImplementation(({ where }: any) => {
      let count = 0
      
      records.forEach(record => {
        if (!where || Object.entries(where).every(([key, value]) => 
          (record as any)[key] === value
        )) {
          count++
        }
      })

      return Promise.resolve(count)
    }),

    // Helper methods for testing
    _reset: () => records.clear(),
    _getAll: () => Array.from(records.values()),
    _setRecords: (newRecords: T[]) => {
      records.clear()
      newRecords.forEach(r => records.set((r as any).id, r))
    }
  }
}

/**
 * Handle Prisma includes (relations)
 */
function handleIncludes<T>(record: T, include: any): T {
  const result = { ...record }

  Object.entries(include).forEach(([key, value]) => {
    if (value === true) {
      // Add default relation value
      (result as any)[key] = getDefaultRelation(key)
    } else if (typeof value === 'object') {
      // Handle nested includes
      (result as any)[key] = handleIncludes(
        getDefaultRelation(key),
        value
      )
    }
  })

  return result
}

/**
 * Get default values for relations
 */
function getDefaultRelation(relationName: string): any {
  // Common relation patterns
  if (relationName.endsWith('s') || relationName === 'children') {
    return [] // Many relation
  }
  
  if (relationName === '_count') {
    return {} // Count relation
  }
  
  // Single relation
  return null
}

/**
 * Create a factory for generating test data
 */
export function createFactory<T>(
  generator: (overrides?: Partial<T>) => T
) {
  return {
    build: (overrides?: Partial<T>) => generator(overrides),
    
    buildMany: (count: number, overrides?: Partial<T>) => {
      return Array.from({ length: count }, () => generator(overrides))
    },
    
    buildWithRelations: (overrides?: Partial<T>, relations?: any) => {
      const base = generator(overrides)
      return { ...base, ...relations }
    }
  }
}

/**
 * Common test data factories
 */
export const factories = {
  user: createFactory(() => ({
    id: generateMockId('user'),
    username: `user_${mockIdCounter}`,
    email: `user${mockIdCounter}@example.com`,
    password: 'hashedpassword',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  customer: createFactory(() => ({
    id: generateMockId('customer'),
    customerNumber: `CUST-${Date.now()}`,
    name: `Customer ${mockIdCounter}`,
    email: `customer${mockIdCounter}@example.com`,
    phone: '1234567890',
    address: '123 Main St',
    currency: 'AED',
    creditLimit: 0,
    paymentTerms: 30,
    createdBy: generateMockId('user'),
    accountId: null,
    leadId: null,
    assignedToId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  product: createFactory(() => ({
    id: generateMockId('product'),
    itemCode: `PROD-${mockIdCounter}`,
    name: `Product ${mockIdCounter}`,
    description: 'Test product',
    unitPrice: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  invoice: createFactory(() => ({
    id: generateMockId('invoice'),
    invoiceNumber: `INV-${mockIdCounter}`,
    customerId: generateMockId('customer'),
    type: 'SALES',
    status: 'DRAFT',
    invoiceDate: new Date(),
    dueDate: new Date(),
    subtotal: 1000,
    taxAmount: 100,
    totalAmount: 1100,
    paidAmount: 0,
    balanceAmount: 1100,
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}