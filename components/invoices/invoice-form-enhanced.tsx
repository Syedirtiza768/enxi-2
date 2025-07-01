'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Save, X, FileText, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { InvoiceLineEditor } from './invoice-line-editor'
import { ClientInvoiceView } from './client-invoice-view'
import { useCurrency } from '@/lib/contexts/currency-context'

interface InvoiceLine {
  lineNumber: number
  lineDescription: string
  items: InvoiceItem[]
}

interface InvoiceItem {
  id?: string
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  itemType: string
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount: number
  taxRate: number
  taxRateId?: string
  unitOfMeasureId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  sortOrder: number
}

interface Invoice {
  id?: string
  invoiceNumber?: string
  customerId: string
  salesOrderId?: string
  type: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  billingAddress: string
  notes: string
  internalNotes?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  items: InvoiceItem[]
  lines?: InvoiceLine[]
}

interface Customer {
  id: string
  name: string
  email: string
  address?: string
  currency?: string
}

interface InvoiceFormEnhancedProps {
  invoice?: Invoice
  fromSalesOrder?: string
  fromQuotation?: string
  viewMode?: 'internal' | 'client'
  onSubmit: (invoice: Partial<Invoice>) => Promise<void>
  onCancel: () => void
}

export function InvoiceFormEnhanced({ 
  invoice, 
  fromSalesOrder,
  fromQuotation,
  viewMode: initialViewMode = 'internal',
  onSubmit, 
  onCancel 
}: InvoiceFormEnhancedProps): React.JSX.Element {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  
  // View mode state
  const [viewMode, setViewMode] = useState<'internal' | 'client'>(initialViewMode)
  
  // Form state
  const [formData, setFormData] = useState<Partial<Invoice>>({
    customerId: invoice?.customerId || '',
    salesOrderId: invoice?.salesOrderId || fromSalesOrder || '',
    type: invoice?.type || 'SALES',
    status: invoice?.status || 'DRAFT',
    invoiceDate: invoice?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || '',
    paymentTerms: invoice?.paymentTerms || 'Net 30',
    billingAddress: invoice?.billingAddress || '',
    notes: invoice?.notes || '',
    internalNotes: invoice?.internalNotes || '',
    subtotal: invoice?.subtotal || 0,
    taxAmount: invoice?.taxAmount || 0,
    discountAmount: invoice?.discountAmount || 0,
    totalAmount: invoice?.totalAmount || 0,
    paidAmount: invoice?.paidAmount || 0,
    balanceAmount: invoice?.balanceAmount || 0,
    items: invoice?.items || [],
    lines: invoice?.lines || [],
    ...(invoice?.id && { id: invoice.id }),
    ...(invoice?.invoiceNumber && { invoiceNumber: invoice.invoiceNumber })
  })

  // Line state
  const [lines, setLines] = useState<InvoiceLine[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([])

  // Initialize lines from invoice items
  useEffect(() => {
    if (invoice?.lines && invoice.lines.length > 0) {
      setLines(invoice.lines)
    } else if (invoice?.items && invoice.items.length > 0) {
      // Convert flat items to line structure
      const itemsByLine = new Map<number, InvoiceItem[]>()
      
      invoice.items.forEach(item => {
        const lineNumber = item.lineNumber || 1
        if (!itemsByLine.has(lineNumber)) {
          itemsByLine.set(lineNumber, [])
        }
        itemsByLine.get(lineNumber)?.push(item)
      })

      const newLines: InvoiceLine[] = Array.from(itemsByLine.entries()).map(([lineNumber, items]) => {
        const lineHeader = items.find(item => item.isLineHeader)
        return {
          lineNumber,
          lineDescription: lineHeader?.lineDescription || lineHeader?.description || '',
          items: items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        }
      })

      setLines(newLines.sort((a, b) => a.lineNumber - b.lineNumber))
    }
  }, [invoice])

  // Load reference data
  useEffect(() => {
    const fetchReferenceData = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch customers
        const customersResponse = await apiClient('/api/customers', {
          method: 'GET'
        })
        if (customersResponse.ok) {
          const customersData = customersResponse.data?.data || customersResponse.data || []
          setCustomers(Array.isArray(customersData) ? customersData : [])
        }

        // Load quotation data if creating from quotation
        if (fromQuotation) {
          const quotationResponse = await apiClient(`/api/quotations/${fromQuotation}`, {
            method: 'GET'
          })
          if (quotationResponse.ok) {
            const quotationData = quotationResponse.data?.data || quotationResponse.data
            if (quotationData) {
              console.log('Quotation data loaded:', {
                quotationNumber: quotationData.quotationNumber,
                customer: quotationData.salesCase?.customer?.name,
                total: quotationData.totalAmount
              })
              
              // Calculate due date (30 days from today)
              const dueDate = new Date()
              dueDate.setDate(dueDate.getDate() + 30)
              
              // For quotation-based invoices, we only need basic info
              // The actual items will be handled by the API
              setFormData(prev => ({
                ...prev,
                customerId: quotationData.salesCase?.customerId || '',
                paymentTerms: quotationData.paymentTerms || 'Net 30',
                dueDate: dueDate.toISOString().split('T')[0],
                notes: `Invoice created from quotation ${quotationData.quotationNumber}`,
                billingAddress: quotationData.salesCase?.customer?.billingAddress || quotationData.salesCase?.customer?.address || ''
              }))
              
              // Set a placeholder line to show in the UI
              const placeholderLines: InvoiceLine[] = [{
                lineNumber: 1,
                lineDescription: `Items from ${quotationData.quotationNumber}`,
                items: [{
                  lineNumber: 1,
                  lineDescription: `Items will be copied from ${quotationData.quotationNumber}`,
                  isLineHeader: true,
                  itemType: 'SERVICE',
                  itemCode: 'PLACEHOLDER',
                  description: 'Invoice items will be automatically created from the quotation',
                  quantity: 1,
                  unitPrice: quotationData.totalAmount || 0,
                  discount: 0,
                  taxRate: 0,
                  subtotal: quotationData.totalAmount || 0,
                  discountAmount: 0,
                  taxAmount: 0,
                  totalAmount: quotationData.totalAmount || 0,
                  sortOrder: 0
                }]
              }]
              
              setLines(placeholderLines)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch reference data:', err)
        setError('Failed to load required data')
      } finally {
        setLoading(false)
      }
    }

    fetchReferenceData()
  }, [fromQuotation])

  // Calculate totals from lines
  const calculateTotals = useCallback((updatedLines: InvoiceLine[]) => {
    let subtotal = 0
    let discountAmount = 0
    let taxAmount = 0
    let totalAmount = 0

    updatedLines.forEach(line => {
      line.items.forEach(item => {
        subtotal += item.subtotal || 0
        discountAmount += item.discountAmount || 0
        taxAmount += item.taxAmount || 0
        totalAmount += item.totalAmount || 0
      })
    })

    const balanceAmount = totalAmount - (formData.paidAmount || 0)

    setFormData(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      balanceAmount
    }))
  }, [formData.paidAmount])

  // Handle line changes
  const handleLinesChange = (newLines: InvoiceLine[]) => {
    setLines(newLines)
    calculateTotals(newLines)
  }

  // Convert lines to flat items for submission
  const convertLinesToItems = (lines: InvoiceLine[]): InvoiceItem[] => {
    const items: InvoiceItem[] = []
    let sortOrder = 0

    console.log('Converting lines to items:', {
      lineCount: lines.length,
      lines: lines.map(l => ({
        lineNumber: l.lineNumber,
        lineDescription: l.lineDescription,
        itemCount: l.items.length,
        hasLineHeader: l.items.some(i => i.isLineHeader)
      }))
    })

    lines.forEach(line => {
      // Check if there's already a line header item in the items
      const hasLineHeaderItem = line.items.some(item => item.isLineHeader)
      
      // Only add a synthetic line header if there isn't one already and we have a description
      if (line.lineDescription && !hasLineHeaderItem) {
        console.log(`Adding synthetic line header for line ${line.lineNumber}`)
        items.push({
          lineNumber: line.lineNumber,
          lineDescription: line.lineDescription,
          isLineHeader: true,
          itemType: 'SERVICE',
          itemId: undefined,
          itemCode: `LINE-${line.lineNumber}`,
          description: line.lineDescription,
          internalDescription: undefined,
          quantity: 0,
          unitPrice: 0,
          cost: undefined,
          discount: 0,
          taxRate: 0,
          taxRateId: undefined,
          unitOfMeasureId: undefined,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          sortOrder: sortOrder++
        })
      }

      // Add all line items (including line headers with actual data)
      line.items.forEach(item => {
        console.log(`Adding item from line ${line.lineNumber}:`, {
          itemCode: item.itemCode,
          isLineHeader: item.isLineHeader,
          quantity: item.quantity,
          sortOrder: sortOrder
        })
        items.push({
          ...item,
          lineNumber: line.lineNumber,
          // Preserve all original item properties including isLineHeader
          sortOrder: sortOrder++
        })
      })
    })

    console.log('Converted items total:', items.length)
    return items
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.customerId) {
      errors.customerId = 'Customer is required'
    }

    if (!formData.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required'
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required'
    }

    // Skip item validation if creating from quotation
    if (!fromQuotation && (lines.length === 0 || lines.every(line => line.items.length === 0))) {
      errors.items = 'At least one item is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      setError(null)

      let submitData: any
      
      // If creating from quotation, don't include items
      if (fromQuotation) {
        submitData = {
          dueDate: formData.dueDate ? `${formData.dueDate}T00:00:00.000Z` : '',
          paymentTerms: formData.paymentTerms || null,
          billingAddress: formData.billingAddress || null,
          notes: formData.notes || null,
          internalNotes: formData.internalNotes || null
        }
      } else {
        const items = convertLinesToItems(lines)
        
        // Clean items to ensure no undefined values that should be null
        const cleanedItems = items.map(item => ({
          lineNumber: item.lineNumber,
          lineDescription: item.lineDescription || null,
          isLineHeader: item.isLineHeader || false,
          itemType: item.itemType || 'PRODUCT',
          itemId: item.itemId || null,
          itemCode: item.itemCode,
          description: item.description,
          internalDescription: item.internalDescription || null,
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          cost: item.cost ?? null,
          discount: item.discount ?? 0,
          taxRate: item.taxRate ?? 0,
          taxRateId: item.taxRateId || null,
          unitOfMeasureId: item.unitOfMeasureId || null,
          subtotal: item.subtotal || 0,
          discountAmount: item.discountAmount || 0,
          taxAmount: item.taxAmount || 0,
          totalAmount: item.totalAmount || 0,
          sortOrder: item.sortOrder || 0
        }))
        
        // Convert date strings to datetime format
        submitData = {
          ...formData,
          dueDate: formData.dueDate ? `${formData.dueDate}T00:00:00.000Z` : '',
          paymentTerms: formData.paymentTerms || null,
          billingAddress: formData.billingAddress || null,
          notes: formData.notes || null,
          internalNotes: formData.internalNotes || null,
          salesOrderId: formData.salesOrderId || null,
          items: cleanedItems,
          createdBy: user?.id || 'system'
        }
      }
      // Note: 'lines' is not sent to API, only used internally in the form
      
      console.log('Submitting invoice data:', {
        customerId: submitData.customerId,
        itemCount: items.length,
        lineCount: lines.length,
        firstItem: items[0],
        lines: lines.map(l => ({ 
          lineNumber: l.lineNumber, 
          lineDescription: l.lineDescription, 
          itemCount: l.items.length 
        }))
      })
      
      // Log the full items array for debugging
      console.log('All items being submitted:', items)
      console.log('Full submit data:', submitData)
      
      await onSubmit(submitData)
    } catch (err: any) {
      console.error('Failed to save invoice:', err)
      setError(err.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  // Handle customer change
  const handleCustomerChange = (customerId: string) => {
    setFormData(prev => ({ ...prev, customerId }))
    
    // Update billing address
    const customer = customers.find(c => c.id === customerId)
    if (customer?.address) {
      setFormData(prev => ({ ...prev, billingAddress: customer.address || '' }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {invoice?.id ? `Edit Invoice ${invoice.invoiceNumber}` : 'Create New Invoice'}
          </h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'internal' ? 'client' : 'internal')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {viewMode === 'internal' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {viewMode === 'internal' ? 'Internal View' : 'Client View'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <select
                id="customerId"
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.customerId ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {validationErrors.customerId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.customerId}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Invoice['type'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SALES">Sales Invoice</option>
                <option value="CREDIT_NOTE">Credit Note</option>
                <option value="DEBIT_NOTE">Debit Note</option>
                <option value="PROFORMA">Proforma Invoice</option>
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                id="invoiceDate"
                value={formData.invoiceDate}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.invoiceDate ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {validationErrors.invoiceDate && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.invoiceDate}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {validationErrors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.dueDate}</p>
              )}
            </div>

            {/* Payment Terms */}
            <div>
              <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <select
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Net 30">Net 30</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
              </select>
            </div>

            {/* Status */}
            {invoice?.id && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Invoice['status'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="VIEWED">Viewed</option>
                  <option value="PARTIAL">Partially Paid</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
            )}

            {/* Billing Address */}
            <div className="md:col-span-2">
              <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Billing Address
              </label>
              <textarea
                id="billingAddress"
                rows={3}
                value={formData.billingAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter billing address..."
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Customer Visible)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes visible to the customer..."
              />
            </div>

            {/* Internal Notes - Only show in internal view */}
            {viewMode === 'internal' && (
              <div className="md:col-span-2">
                <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  id="internalNotes"
                  rows={3}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Internal notes for staff only..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Line Items</h2>
          
          {viewMode === 'internal' ? (
            <InvoiceLineEditor
              lines={lines}
              onLinesChange={handleLinesChange}
              viewMode={viewMode}
              readOnly={false}
            />
          ) : (
            <ClientInvoiceView
              lines={lines.map(line => ({
                lineNumber: line.lineNumber,
                lineDescription: line.lineDescription,
                quantity: line.items.reduce((sum, item) => sum + item.quantity, 0),
                totalAmount: line.items.reduce((sum, item) => sum + item.totalAmount, 0)
              }))}
              items={[]}
            />
          )}
          
          {validationErrors.items && (
            <p className="mt-2 text-sm text-red-600">{validationErrors.items}</p>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Totals</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(formData.subtotal || 0)}</span>
            </div>
            {formData.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span className="text-red-600">-{formatCurrency(formData.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>{formatCurrency(formData.taxAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(formData.totalAmount || 0)}</span>
            </div>
            {formData.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Paid:</span>
                  <span className="text-green-600">-{formatCurrency(formData.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(formData.balanceAmount || 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 inline mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 inline mr-2" />
            {saving ? 'Saving...' : (invoice?.id ? 'Update Invoice' : 'Create Invoice')}
          </button>
        </div>
      </form>
    </div>
  )
}