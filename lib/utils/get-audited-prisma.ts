import { NextRequest } from 'next/server'
import { prismaWithAudit } from '@/lib/db/prisma-with-audit'
import { extractAuditContext } from './audit-context'

export function getAuditedPrisma(request: NextRequest) {
  const context = extractAuditContext(request)
  return prismaWithAudit(context)
}