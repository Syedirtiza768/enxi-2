import { z } from 'zod'

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

export const auditLogSchema = z.object({
  userId: z.string(),
  action: z.nativeEnum(AuditAction),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.record(z.any()).optional(),
  beforeData: z.record(z.any()).optional(),
  afterData: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export const auditFilterSchema = z.object({
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

export const paginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(10),
})

export type AuditLog = z.infer<typeof auditLogSchema>
export type AuditFilter = z.infer<typeof auditFilterSchema>
export type Pagination = z.infer<typeof paginationSchema>