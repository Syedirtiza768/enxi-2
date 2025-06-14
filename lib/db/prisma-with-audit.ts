import { prisma } from './prisma'
import { AuditAction } from '@/lib/validators/audit.validator'

export interface AuditOptions {
  userId: string
  ipAddress?: string
  userAgent?: string
}

// Create a Prisma extension that automatically logs CRUD operations
export function prismaWithAudit(auditOptions: AuditOptions) {
  return prisma.$extends({
    query: {
      // Intercept all model operations
      $allModels: {
        async create({ model, args, query }): Promise<T> {
          const result = await query(args)
          
          // Skip audit logs for AuditLog model to prevent infinite loop
          if (model !== 'AuditLog') {
            await prisma.auditLog.create({
              data: {
                userId: auditOptions.userId,
                action: AuditAction.CREATE,
                entityType: model,
                entityId: result.id || JSON.stringify(result),
                afterData: result,
                ipAddress: auditOptions.ipAddress,
                userAgent: auditOptions.userAgent,
              },
            }).catch(console.error)
          }
          
          return result
        },
        
        async update({ model, args, query }): Promise<T> {
          // Fetch before state
          let beforeData = null
          if (model !== 'AuditLog' && args.where) {
            const findMethod = (prisma as Record<string, unknown>)[model].findUnique || (prisma as Record<string, unknown>)[model].findFirst
            beforeData = await findMethod({ where: args.where }).catch(() => null)
          }
          
          const result = await query(args)
          
          if (model !== 'AuditLog') {
            await prisma.auditLog.create({
              data: {
                userId: auditOptions.userId,
                action: AuditAction.UPDATE,
                entityType: model,
                entityId: result.id || JSON.stringify(args.where),
                beforeData: beforeData,
                afterData: result,
                ipAddress: auditOptions.ipAddress,
                userAgent: auditOptions.userAgent,
              },
            }).catch(console.error)
          }
          
          return result
        },
        
        async delete({ model, args, query }): Promise<void> {
          // Fetch before state
          let beforeData = null
          if (model !== 'AuditLog' && args.where) {
            const findMethod = (prisma as Record<string, unknown>)[model].findUnique || (prisma as Record<string, unknown>)[model].findFirst
            beforeData = await findMethod({ where: args.where }).catch(() => null)
          }
          
          const result = await query(args)
          
          if (model !== 'AuditLog') {
            await prisma.auditLog.create({
              data: {
                userId: auditOptions.userId,
                action: AuditAction.DELETE,
                entityType: model,
                entityId: beforeData?.id || JSON.stringify(args.where),
                beforeData: beforeData,
                ipAddress: auditOptions.ipAddress,
                userAgent: auditOptions.userAgent,
              },
            }).catch(console.error)
          }
          
          return result
        },
      },
    },
  })
}