import { z } from 'zod'

export enum AuditAction {
  // Basic CRUD operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // Authentication & Authorization
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  
  // Workflow & Approval Actions
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  WITHDRAW = 'WITHDRAW',
  CANCEL = 'CANCEL',
  REOPEN = 'REOPEN',
  CLOSE = 'CLOSE',
  CONVERT = 'CONVERT',
  
  // Status Changes
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSIGN = 'ASSIGN',
  UNASSIGN = 'UNASSIGN',
  TRANSFER = 'TRANSFER',
  
  // Financial Operations
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_SENT = 'PAYMENT_SENT',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  ADJUSTMENT_MADE = 'ADJUSTMENT_MADE',
  
  // Inventory Operations
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  STOCK_TRANSFER = 'STOCK_TRANSFER',
  PHYSICAL_COUNT = 'PHYSICAL_COUNT',
  
  // Data Operations
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  DATA_MIGRATION = 'DATA_MIGRATION',
  
  // System Operations
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  BACKUP_CREATED = 'BACKUP_CREATED',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  
  // Security Operations
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  DATA_ACCESS = 'DATA_ACCESS',
  SENSITIVE_DATA_VIEW = 'SENSITIVE_DATA_VIEW',
  REPORT_GENERATED = 'REPORT_GENERATED',
}

export enum EntityType {
  // Core Business Entities
  USER = 'User',
  CUSTOMER = 'Customer',
  SUPPLIER = 'Supplier',
  LEAD = 'Lead',
  
  // Sales Entities
  SALES_CASE = 'SalesCase',
  QUOTATION = 'Quotation',
  SALES_ORDER = 'SalesOrder',
  CUSTOMER_PO = 'CustomerPO',
  
  // Inventory Entities
  ITEM = 'Item',
  CATEGORY = 'Category',
  STOCK_MOVEMENT = 'StockMovement',
  STOCK_LOT = 'StockLot',
  STOCK_TRANSFER = 'StockTransfer',
  PHYSICAL_COUNT = 'PhysicalCount',
  LOCATION = 'Location',
  
  // Purchase Entities
  PURCHASE_ORDER = 'PurchaseOrder',
  GOODS_RECEIPT = 'GoodsReceipt',
  SUPPLIER_INVOICE = 'SupplierInvoice',
  SUPPLIER_PAYMENT = 'SupplierPayment',
  
  // Financial Entities
  INVOICE = 'Invoice',
  PAYMENT = 'Payment',
  JOURNAL_ENTRY = 'JournalEntry',
  ACCOUNT = 'Account',
  EXPENSE = 'CaseExpense',
  
  // Logistics
  SHIPMENT = 'Shipment',
  
  // Configuration
  TAX_RATE = 'TaxRate',
  UNIT_OF_MEASURE = 'UnitOfMeasure',
  COMPANY_SETTINGS = 'CompanySettings',
  
  // System
  SESSION = 'UserSession',
  PERMISSION = 'Permission',
  AUDIT_LOG = 'AuditLog',
}

export const auditLogSchema = z.object({
  userId: z.string(),
  action: z.nativeEnum(AuditAction),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string(),
  metadata: z.record(z.any()).optional(),
  beforeData: z.record(z.any()).optional(),
  afterData: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(), // For tracking related operations
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  tags: z.array(z.string()).optional(), // For categorization
})

export const bulkAuditLogSchema = z.object({
  logs: z.array(auditLogSchema),
  batchId: z.string().optional(),
})

export const auditFilterSchema = z.object({
  userId: z.string().optional(),
  entityType: z.nativeEnum(EntityType).optional(),
  entityId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(), // For searching in metadata, descriptions
  ipAddress: z.string().optional(),
  correlationId: z.string().optional(),
})

export const auditExportSchema = z.object({
  filters: auditFilterSchema.optional(),
  format: z.enum(['CSV', 'JSON', 'PDF']).default('CSV'),
  includeMetadata: z.boolean().default(true),
  includeBeforeAfter: z.boolean().default(false),
})

export const paginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(1000).default(50),
  sortBy: z.string().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const auditStatsSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  groupBy: z.enum(['action', 'entityType', 'user', 'day', 'hour']).default('action'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

export const auditComplianceSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  entityTypes: z.array(z.nativeEnum(EntityType)).optional(),
  includeFailedActions: z.boolean().default(true),
  includeSecurityEvents: z.boolean().default(true),
})

// Types
export type AuditLog = z.infer<typeof auditLogSchema>
export type BulkAuditLog = z.infer<typeof bulkAuditLogSchema>
export type AuditFilter = z.infer<typeof auditFilterSchema>
export type AuditExport = z.infer<typeof auditExportSchema>
export type Pagination = z.infer<typeof paginationSchema>
export type AuditStats = z.infer<typeof auditStatsSchema>
export type AuditCompliance = z.infer<typeof auditComplianceSchema>

// Helper types for better categorization
export type SecurityAuditAction = 
  | AuditAction.LOGIN 
  | AuditAction.LOGOUT 
  | AuditAction.LOGIN_FAILED 
  | AuditAction.PASSWORD_CHANGED
  | AuditAction.PERMISSION_GRANTED
  | AuditAction.PERMISSION_REVOKED
  | AuditAction.SECURITY_VIOLATION
  | AuditAction.DATA_ACCESS
  | AuditAction.SENSITIVE_DATA_VIEW

export type FinancialAuditAction = 
  | AuditAction.PAYMENT_RECEIVED 
  | AuditAction.PAYMENT_SENT 
  | AuditAction.INVOICE_GENERATED
  | AuditAction.REFUND_PROCESSED
  | AuditAction.ADJUSTMENT_MADE

export type InventoryAuditAction = 
  | AuditAction.STOCK_IN 
  | AuditAction.STOCK_OUT 
  | AuditAction.STOCK_ADJUSTMENT
  | AuditAction.STOCK_TRANSFER
  | AuditAction.PHYSICAL_COUNT

export type WorkflowAuditAction = 
  | AuditAction.APPROVE 
  | AuditAction.REJECT 
  | AuditAction.SUBMIT
  | AuditAction.WITHDRAW
  | AuditAction.CANCEL
  | AuditAction.CONVERT

// Audit configuration constants
export const AUDIT_CONFIG = {
  RETENTION_DAYS: 2555, // 7 years for compliance
  BATCH_SIZE: 100,
  MAX_METADATA_SIZE: 10000, // 10KB
  SENSITIVE_FIELDS: ['password', 'token', 'ssn', 'creditCard'],
  HIGH_PRIORITY_ACTIONS: [
    AuditAction.DELETE,
    AuditAction.SECURITY_VIOLATION,
    AuditAction.PERMISSION_GRANTED,
    AuditAction.PERMISSION_REVOKED,
    AuditAction.DATA_MIGRATION,
    AuditAction.CONFIGURATION_CHANGE,
  ],
  CRITICAL_ENTITIES: [
    EntityType.USER,
    EntityType.PAYMENT,
    EntityType.INVOICE,
    EntityType.SUPPLIER_PAYMENT,
    EntityType.JOURNAL_ENTRY,
  ],
} as const