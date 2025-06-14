import React, { lazy, Suspense, ComponentType } from 'react'
import { Card } from '@/components/ui/card'

// Generic loading fallback
export const LoadingSpinner = (): void => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
)

// Form loading fallback
export const FormLoadingFallback = (): void => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded w-1/2 animate-pulse"></div>
    </div>
  </Card>
)

// Table loading fallback
export const TableLoadingFallback = (): void => (
  <div className="space-y-3">
    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
    ))}
  </div>
)

// Higher-order component for lazy loading with custom fallback
export function withLazyLoading<P = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback: React.ComponentType = LoadingSpinner
): (props: P) => React.JSX.Element {
  const LazyComponent = lazy(importFunc)
  
  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={<fallback />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// Lazy load heavy forms
export const LazyQuotationForm = withLazyLoading(
  () => import('@/components/quotations/quotation-form'),
  FormLoadingFallback
)

export const LazySalesOrderForm = withLazyLoading(
  () => import('@/components/sales-orders/sales-order-form'),
  FormLoadingFallback
)

export const LazyPurchaseOrderForm = withLazyLoading(
  () => import('@/components/purchase-orders/purchase-order-form'),
  FormLoadingFallback
)

export const LazyCustomerForm = withLazyLoading(
  () => import('@/components/customers/customer-form'),
  FormLoadingFallback
)

export const LazySupplierForm = withLazyLoading(
  () => import('@/components/suppliers/supplier-form'),
  FormLoadingFallback
)

export const LazyInventoryForm = withLazyLoading(
  () => import('@/components/inventory/item-form'),
  FormLoadingFallback
)

// Lazy load heavy lists/tables
export const LazyItemList = withLazyLoading(
  () => import('@/components/inventory/item-list'),
  TableLoadingFallback
)

export const LazyThreeWayMatchingDashboard = withLazyLoading(
  () => import('@/components/three-way-matching/three-way-matching-dashboard'),
  TableLoadingFallback
)

// Dynamic import utilities
export const dynamicImport = {
  // Charts and visualizations
  charts: (): void => import('@/components/charts'),
  
  // PDF generators
  pdfGenerator: (): void => import('@/lib/pdf-generator'),
  
  // Excel export
  excelExport: (): void => import('@/lib/excel-export'),
  
  // Advanced forms
  advancedForms: (): void => import('@/components/forms/advanced'),
  
  // Reports
  reports: (): void => import('@/components/reports'),
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  
  React.useEffect(() => {
    if (!elementRef.current || isIntersecting) return
    
    const observer = new IntersectionObserver(
      ([entry]): void => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )
    
    observer.observe(elementRef.current)
    
    return (): void => observer.disconnect()
  }, [elementRef, isIntersecting, options])
  
  return isIntersecting
}