import { format } from 'date-fns';

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'email' | 'phone';
  format?: (value: any) => string;
  width?: number;
}

export interface ExportDataType {
  key: string;
  label: string;
  description: string;
  columns: ColumnConfig[];
  permissions: string[];
  maxRows: number;
}

export const EXPORT_DATA_TYPES: Record<string, ExportDataType> = {
  customers: {
    key: 'customers',
    label: 'Customers',
    description: 'Customer contact information and details',
    permissions: ['view_customers', 'admin'],
    maxRows: 50000,
    columns: [
      { key: 'id', label: 'Customer ID', type: 'string' },
      { key: 'name', label: 'Customer Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'creditLimit', label: 'Credit Limit', type: 'currency' },
      { key: 'primaryContact.name', label: 'Contact Name', type: 'string' },
      { key: 'primaryContact.email', label: 'Contact Email', type: 'email' },
      { key: 'primaryContact.phone', label: 'Contact Phone', type: 'phone' },
      { key: 'billingAddress.street', label: 'Billing Address', type: 'string' },
      { key: 'billingAddress.city', label: 'Billing City', type: 'string' },
      { key: 'billingAddress.state', label: 'Billing State', type: 'string' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  leads: {
    key: 'leads',
    label: 'Leads',
    description: 'Sales leads and opportunities',
    permissions: ['view_leads', 'admin'],
    maxRows: 25000,
    columns: [
      { key: 'id', label: 'Lead ID', type: 'string' },
      { key: 'title', label: 'Lead Title', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'priority', label: 'Priority', type: 'string' },
      { key: 'source', label: 'Source', type: 'string' },
      { key: 'estimatedValue', label: 'Estimated Value', type: 'currency' },
      { key: 'customer.name', label: 'Customer', type: 'string' },
      { key: 'assignedTo.username', label: 'Assigned To', type: 'string' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  'sales-orders': {
    key: 'sales-orders',
    label: 'Sales Orders',
    description: 'Sales orders and transactions',
    permissions: ['view_sales_orders', 'admin'],
    maxRows: 25000,
    columns: [
      { key: 'id', label: 'Order ID', type: 'string' },
      { key: 'orderNumber', label: 'Order Number', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'totalAmount', label: 'Total Amount', type: 'currency' },
      { key: 'customer.name', label: 'Customer', type: 'string' },
      { key: 'salesCase.title', label: 'Sales Case', type: 'string' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  quotations: {
    key: 'quotations',
    label: 'Quotations',
    description: 'Price quotations and proposals',
    permissions: ['view_quotations', 'admin'],
    maxRows: 25000,
    columns: [
      { key: 'id', label: 'Quotation ID', type: 'string' },
      { key: 'quotationNumber', label: 'Quotation Number', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'totalAmount', label: 'Total Amount', type: 'currency' },
      { key: 'validUntil', label: 'Valid Until', type: 'date' },
      { key: 'customer.name', label: 'Customer', type: 'string' },
      { key: 'lead.title', label: 'Lead', type: 'string' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  payments: {
    key: 'payments',
    label: 'Payments',
    description: 'Payment records and transactions',
    permissions: ['view_payments', 'admin'],
    maxRows: 50000,
    columns: [
      { key: 'id', label: 'Payment ID', type: 'string' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'string' },
      { key: 'paymentDate', label: 'Payment Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'customer.name', label: 'Customer', type: 'string' },
      { key: 'invoice.invoiceNumber', label: 'Invoice Number', type: 'string' },
      { key: 'createdAt', label: 'Created Date', type: 'date' }
    ]
  },
  inventory: {
    key: 'inventory',
    label: 'Inventory',
    description: 'Inventory items and stock levels',
    permissions: ['view_inventory', 'admin'],
    maxRows: 100000,
    columns: [
      { key: 'id', label: 'Item ID', type: 'string' },
      { key: 'itemCode', label: 'Item Code', type: 'string' },
      { key: 'name', label: 'Item Name', type: 'string' },
      { key: 'category.name', label: 'Category', type: 'string' },
      { key: 'unitOfMeasure.name', label: 'Unit of Measure', type: 'string' },
      { key: 'unitPrice', label: 'Unit Price', type: 'currency' },
      { key: 'stockQuantity', label: 'Stock Quantity', type: 'number' },
      { key: 'reorderLevel', label: 'Reorder Level', type: 'number' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  'purchase-orders': {
    key: 'purchase-orders',
    label: 'Purchase Orders',
    description: 'Purchase orders and procurement',
    permissions: ['view_purchase_orders', 'admin'],
    maxRows: 25000,
    columns: [
      { key: 'id', label: 'PO ID', type: 'string' },
      { key: 'orderNumber', label: 'PO Number', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'totalAmount', label: 'Total Amount', type: 'currency' },
      { key: 'supplier.name', label: 'Supplier', type: 'string' },
      { key: 'expectedDeliveryDate', label: 'Expected Delivery', type: 'date' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  invoices: {
    key: 'invoices',
    label: 'Invoices',
    description: 'Customer invoices and billing',
    permissions: ['view_invoices', 'admin'],
    maxRows: 50000,
    columns: [
      { key: 'id', label: 'Invoice ID', type: 'string' },
      { key: 'invoiceNumber', label: 'Invoice Number', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'totalAmount', label: 'Total Amount', type: 'currency' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'customer.name', label: 'Customer', type: 'string' },
      { key: 'salesOrder.orderNumber', label: 'Sales Order', type: 'string' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Updated Date', type: 'date' }
    ]
  },
  'audit-logs': {
    key: 'audit-logs',
    label: 'Audit Logs',
    description: 'System audit trail and activity logs',
    permissions: ['view_audit_logs', 'admin'],
    maxRows: 100000,
    columns: [
      { key: 'id', label: 'Log ID', type: 'string' },
      { key: 'action', label: 'Action', type: 'string' },
      { key: 'entityType', label: 'Entity Type', type: 'string' },
      { key: 'entityId', label: 'Entity ID', type: 'string' },
      { key: 'timestamp', label: 'Timestamp', type: 'date' },
      { key: 'user.username', label: 'User', type: 'string' },
      { key: 'ipAddress', label: 'IP Address', type: 'string' },
      { key: 'userAgent', label: 'User Agent', type: 'string' }
    ]
  }
};

export function formatCellValue(value: any, type: ColumnConfig['type']): string {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'date':
      if (value instanceof Date) {
        return format(value, 'yyyy-MM-dd HH:mm:ss');
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : format(date, 'yyyy-MM-dd HH:mm:ss');
      }
      return String(value);

    case 'currency':
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? '0.00' : new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED'
      }).format(num);

    case 'boolean':
      return value ? 'Yes' : 'No';

    case 'number':
      const numVal = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(numVal) ? '0' : numVal.toLocaleString();

    case 'email':
    case 'phone':
    case 'string':
    default:
      return String(value);
  }
}

export function validateExportPermissions(dataType: string, userPermissions: string[]): boolean {
  const exportType = EXPORT_DATA_TYPES[dataType];
  if (!exportType) return false;

  return exportType.permissions.some(permission => 
    userPermissions.includes(permission) || userPermissions.includes('admin')
  );
}

export function getExportFileName(dataType: string, format: string, dateRange?: { from: Date; to: Date }): string {
  const exportType = EXPORT_DATA_TYPES[dataType];
  const label = exportType?.label || dataType;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  
  let fileName = `${label.replace(/\s+/g, '_')}_${timestamp}`;
  
  if (dateRange) {
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    fileName += `_${fromStr}_to_${toStr}`;
  }
  
  return `${fileName}.${format}`;
}

export function estimateExportSize(rowCount: number, columnCount: number, format: string): number {
  // Rough estimates in bytes
  const avgCellSize = 20; // Average characters per cell
  const baseRowSize = columnCount * avgCellSize;
  
  switch (format) {
    case 'csv':
      return rowCount * baseRowSize * 1.1; // CSV overhead
    case 'excel':
      return rowCount * baseRowSize * 2.5; // Excel has more overhead
    case 'pdf':
      return rowCount * baseRowSize * 3; // PDF is largest
    default:
      return rowCount * baseRowSize;
  }
}

export function shouldCompress(estimatedSize: number): boolean {
  return estimatedSize > 10 * 1024 * 1024; // Compress files larger than 10MB
}

export function getMaxRowsForFormat(format: string, dataType: string): number {
  const baseMax = EXPORT_DATA_TYPES[dataType]?.maxRows || 10000;
  
  switch (format) {
    case 'pdf':
      return Math.min(1000, baseMax); // PDF has strict limits
    case 'excel':
      return Math.min(100000, baseMax); // Excel can handle more
    case 'csv':
      return baseMax; // CSV can handle the most
    default:
      return baseMax;
  }
}

export interface DateRangePreset {
  key: string;
  label: string;
  getRange: () => { from: Date; to: Date };
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => {
      const today = new Date();
      return {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      };
    }
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
      };
    }
  },
  {
    key: 'last7days',
    label: 'Last 7 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { from: start, to: end };
    }
  },
  {
    key: 'last30days',
    label: 'Last 30 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { from: start, to: end };
    }
  },
  {
    key: 'thismonth',
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      };
    }
  },
  {
    key: 'lastmonth',
    label: 'Last Month',
    getRange: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      };
    }
  },
  {
    key: 'thisquarter',
    label: 'This Quarter',
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1),
        to: new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59)
      };
    }
  },
  {
    key: 'thisyear',
    label: 'This Year',
    getRange: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      };
    }
  }
];

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

export function getContentType(format: string): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}