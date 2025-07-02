import { lazy } from 'react'
import { LoadingSpinner, FormLoadingFallback, TableLoadingFallback } from './lazy-loading'

// Page-level dynamic imports for route-based code splitting
export const DynamicPages = {
  // Dashboard
  Dashboard: lazy(() => import('@/app/(auth)/dashboard/page')),
  
  // Sales pages
  Leads: lazy(() => import('@/app/(auth)/leads/page')),
  Quotations: lazy(() => import('@/app/(auth)/quotations/page')),
  QuotationNew: lazy(() => import('@/app/(auth)/quotations/new/page')),
  SalesOrders: lazy(() => import('@/app/(auth)/sales-orders/page')),
  SalesCases: lazy(() => import('@/app/(auth)/sales-cases/page')),
  
  // Customer pages
  Customers: lazy(() => import('@/app/(auth)/customers/page')),
  CustomerPOs: lazy(() => import('@/app/(auth)/customer-pos/page')),
  
  // Supplier pages
  Suppliers: lazy(() => import('@/app/(auth)/suppliers/page')),
  PurchaseOrders: lazy(() => import('@/app/(auth)/purchase-orders/page')),
  
  // Inventory pages
  Inventory: lazy(() => import('@/app/(auth)/inventory/page')),
  InventoryItems: lazy(() => import('@/app/(auth)/inventory/items/page')),
  InventoryCategories: lazy(() => import('@/app/(auth)/inventory/categories/page')),
  
  // Financial pages
  Invoices: lazy(() => import('@/app/(auth)/invoices/page')),
  Payments: lazy(() => import('@/app/(auth)/payments/page')),
  
  // Accounting pages
  Accounting: lazy(() => import('@/app/(auth)/accounting/page')),
  Accounts: lazy(() => import('@/app/(auth)/accounting/accounts/page')),
  JournalEntries: lazy(() => import('@/app/(auth)/accounting/journal-entries/page')),
  
  // Reports
  BalanceSheet: lazy(() => import('@/app/(auth)/accounting/reports/balance-sheet/page')),
  IncomeStatement: lazy(() => import('@/app/(auth)/accounting/reports/income-statement/page')),
  TrialBalance: lazy(() => import('@/app/(auth)/accounting/reports/trial-balance/page')),
  
  // Shipments
  Shipments: lazy(() => import('@/app/(auth)/shipments/page')),
  
  // Three-way matching
  ThreeWayMatching: lazy(() => import('@/app/(auth)/three-way-matching/page')),
  
  // Admin
  Users: lazy(() => import('@/app/(auth)/users/page')),
  Settings: lazy(() => import('@/app/(auth)/settings/company/page')),
}

// Heavy component dynamic imports
export const DynamicComponents = {
  // Forms
  QuotationForm: lazy(() => import('@/components/quotations/quotation-form')),
  SalesOrderForm: lazy(() => import('@/components/sales-orders/sales-order-form')),
  PurchaseOrderForm: lazy(() => import('@/components/purchase-orders/purchase-order-form')),
  CustomerForm: lazy(() => import('@/components/customers/customer-form')),
  SupplierForm: lazy(() => import('@/components/suppliers/supplier-form')),
  ItemForm: lazy(() => import('@/components/inventory/item-form')),
  InvoiceForm: lazy(() => import('@/components/invoices/invoice-form')),
  PaymentForm: lazy(() => import('@/components/payments/payment-form')),
  
  // Lists and tables
  ItemList: lazy(() => import('@/components/inventory/item-list')),
  CustomerList: lazy(() => import('@/components/customers/customer-list')),
  // SupplierList: lazy(() => import('@/components/suppliers/supplier-list')),
  
  // Complex components
  ThreeWayMatchingDashboard: lazy(() => import('@/components/three-way-matching/three-way-matching-dashboard')),
  ThreeWayMatchingDetail: lazy(() => import('@/components/three-way-matching/three-way-matching-detail')),
  
  // Charts and visualizations
  // DashboardCharts: lazy(() => import('@/components/dashboard/charts')),
  InventoryCharts: lazy(() => import('@/components/inventory/charts')),
  SalesCharts: lazy(() => import('@/components/sales/charts')),
  
  // PDF and export components
  PDFViewer: lazy(() => import('@/components/pdf/pdf-viewer')),
  ExcelExporter: lazy(() => import('@/components/export/excel-exporter')),
  
  // Advanced editors
  RichTextEditor: lazy(() => import('@/components/editors/rich-text-editor')),
  CodeEditor: lazy(() => import('@/components/editors/code-editor')),
}

// Utility components
export const DynamicUtilities = {
  // Image components
  ImageGallery: lazy(() => import('@/components/media/image-gallery')),
  ImageUploader: lazy(() => import('@/components/media/image-uploader')),
  
  // Calendar and date pickers
  Calendar: lazy(() => import('@/components/calendar/calendar')),
  DateRangePicker: lazy(() => import('@/components/calendar/date-range-picker')),
  
  // File handling
  FileUploader: lazy(() => import('@/components/files/file-uploader')),
  FilePreview: lazy(() => import('@/components/files/file-preview')),
  
  // Notifications
  NotificationCenter: lazy(() => import('@/components/notifications/notification-center')),
  
  // Search and filters
  AdvancedSearch: lazy(() => import('@/components/search/advanced-search')),
  FilterPanel: lazy(() => import('@/components/filters/filter-panel')),
}

// Module federation for micro-frontends (future enhancement)
export const MicroFrontends = {
  // Accounting module
  AccountingModule: lazy(() => import('@/modules/accounting/index')),
  
  // Inventory module
  InventoryModule: lazy(() => import('@/modules/inventory/index')),
  
  // CRM module
  CRMModule: lazy(() => import('@/modules/crm/index')),
  
  // Reporting module
  ReportingModule: lazy(() => import('@/modules/reporting/index')),
}

// Feature flags for conditional loading
export const FeatureFlags = {
  ADVANCED_REPORTING: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_REPORTING === 'true',
  MULTI_CURRENCY: process.env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY === 'true',
  WORKFLOW_ENGINE: process.env.NEXT_PUBLIC_FEATURE_WORKFLOW_ENGINE === 'true',
  API_INTEGRATIONS: process.env.NEXT_PUBLIC_FEATURE_API_INTEGRATIONS === 'true',
}

// Conditional dynamic imports based on feature flags
export const ConditionalImports = {
  // AdvancedReporting: FeatureFlags.ADVANCED_REPORTING 
  //   ? lazy(() => import('@/components/reporting/advanced-reporting'))
  //   : null,
    
  // MultiCurrencySettings: FeatureFlags.MULTI_CURRENCY
  //   ? lazy(() => import('@/components/settings/multi-currency-settings'))
  //   : null,
    
  // WorkflowDesigner: FeatureFlags.WORKFLOW_ENGINE
  //   ? lazy(() => import('@/components/workflow/workflow-designer'))
  //   : null,
    
  // APIIntegrations: FeatureFlags.API_INTEGRATIONS
  //   ? lazy(() => import('@/components/integrations/api-integrations'))
  //   : null,
}

// Preload critical components
export const preloadCriticalComponents = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    // Preload dashboard components
    import('@/app/(auth)/dashboard/page')
    // import('@/components/dashboard/charts')
    
    // Preload common forms after initial load
    setTimeout(() => {
      import('@/components/quotations/quotation-form')
      import('@/components/customers/customer-form')
      import('@/components/inventory/item-list')
    }, 2000)
  }
}

// Route-specific preloading
export const preloadForRoute = (pathname: string): void => {
  const preloadMap: Record<string, () => void> = {
    '/dashboard': (): void => {
      // import('@/components/dashboard/charts')
      import('@/components/inventory/stock-alerts')
    },
    
    '/quotations': (): void => {
      import('@/components/quotations/quotation-form')
      import('@/components/quotations/line-item-editor-v2')
    },
    
    '/customers': (): void => {
      import('@/components/customers/customer-form')
      import('@/components/customers/customer-list')
    },
    
    '/inventory': (): void => {
      import('@/components/inventory/item-list')
      import('@/components/inventory/item-form')
    },
    
    '/sales-orders': (): void => {
      import('@/components/sales-orders/sales-order-form')
      import('@/components/sales-orders/order-timeline-enhanced')
    },
    
    '/purchase-orders': (): void => {
      import('@/components/purchase-orders/purchase-order-form')
      import('@/components/purchase-orders/po-approval-interface')
    }
  }
  
  const preloadFn = preloadMap[pathname]
  if (preloadFn && typeof window !== 'undefined') {
    // Preload after a short delay
    setTimeout(preloadFn, 500)
  }
}