'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageLayout, PageHeader, VStack, Text, Button } from '@/components/design-system'
import { SupplierInvoiceForm } from '@/components/supplier-invoices/supplier-invoice-form'
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface SupplierInvoiceFormData {
  id: string
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  status: 'DRAFT' | 'POSTED' | 'CANCELLED'
  currency: string
  items: Array<{
    goodsReceiptItemId: string
    description: string
    quantity: number
    unitPrice: number
    totalAmount: number
    accountId: string
    taxAmount: number
  }>
  subtotal: number
  taxAmount: number
  totalAmount: number
  taxAccountId?: string
  notes?: string
}

export default function EditSupplierInvoicePage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<SupplierInvoiceFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInvoice = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient(`/api/supplier-invoices/${invoiceId}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error(response.data?.error || 'Failed to fetch supplier invoice')
      }
      
      const invoiceData = response.data
      
      // Check if invoice is editable
      if (invoiceData.status !== 'DRAFT') {
        throw new Error('Only draft invoices can be edited')
      }
      
      // Transform the data for the form
      const formData: SupplierInvoiceFormData = {
        id: invoiceData.id,
        supplierId: invoiceData.supplierId,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        status: invoiceData.status,
        currency: invoiceData.currency,
        items: invoiceData.items.map((item: Record<string, unknown>) => ({
          goodsReceiptItemId: item.goodsReceiptItemId || item.goodsReceiptItem?.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
          accountId: item.accountId || item.account?.id,
          taxAmount: item.taxAmount || 0
        })),
        subtotal: invoiceData.subtotal,
        taxAmount: invoiceData.taxAmount,
        totalAmount: invoiceData.totalAmount,
        taxAccountId: invoiceData.taxAccountId,
        notes: invoiceData.notes
      }
      
      setInvoice(formData)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    router.push(`/supplier-invoices/${invoiceId}`)
  }

  const handleCancel = () => {
    router.push(`/supplier-invoices/${invoiceId}`)
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <FileText className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier invoice...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !invoice) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <AlertTriangle className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Cannot edit supplier invoice</Text>
            <Text color="secondary">{error || 'Supplier invoice not found or not editable'}</Text>
          </VStack>
          <VStack gap="sm">
            <Button variant="primary" onClick={() => router.push(`/supplier-invoices/${invoiceId}`)}>
              View Invoice
            </Button>
            <Button variant="ghost" onClick={() => router.push('/supplier-invoices')}>
              Back to Invoices
            </Button>
          </VStack>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title={`Edit Invoice ${invoice.invoiceNumber}`}
          description="Update supplier invoice details and line items"
          centered={false}
          actions={
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft />}
              onClick={handleCancel}
            >
              Back to Invoice
            </Button>
          }
        />

        <SupplierInvoiceForm 
          supplierInvoice={invoice}
          onSuccess={handleSuccess} 
        />
      </VStack>
    </PageLayout>
  )
}