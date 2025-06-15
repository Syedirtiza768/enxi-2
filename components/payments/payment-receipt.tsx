'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/lib/contexts/currency-context'
import { Download, Mail, Printer } from 'lucide-react'

interface PaymentReceiptProps {
  payment: {
    id: string
    paymentNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
    reference?: string | null
    notes?: string | null
  }
  invoice: {
    invoiceNumber: string
    invoiceDate: string
    totalAmount: number
    paidAmount: number
    balanceAmount: number
  }
  customer: {
    name: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
  }
  company: {
    name: string
    address?: string
    phone?: string
    email?: string
    taxId?: string
    logo?: string
  }
  currency?: string
}

export function PaymentReceipt({
  payment,
  invoice,
  customer,
  company,
  currency = 'AED'
}: PaymentReceiptProps): React.JSX.Element {
  const { formatCurrency } = useCurrency()

  const getPaymentMethodLabel = (method: string): void => {
    const labels: Record<string, string> = {
      BANK_TRANSFER: 'Bank Transfer',
      WIRE_TRANSFER: 'Wire Transfer',
      CHECK: 'Check',
      CASH: 'Cash',
      CREDIT_CARD: 'Credit Card',
      DEBIT_CARD: 'Debit Card',
      ONLINE: 'Online Payment'
    }
    return (labels[method] as any) || method
  }

  const handlePrint = (): void => {
    window.print()
  }

  const handleDownload = async (): Promise<void> => {
    // In a real implementation, this would generate a PDF
    // For now, we'll use the browser's print to PDF functionality
    window.print()
  }

  const handleEmail = async (): Promise<void> => {
    // In a real implementation, this would send the receipt via email
    alert('Email functionality would be implemented here')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Actions Bar - Hidden in print */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email Receipt
        </Button>
      </div>

      {/* Receipt Content */}
      <Card className="print:shadow-none">
        <CardHeader className="text-center border-b">
          {company.logo && (
            <img src={company.logo} alt={company.name} className="h-16 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold">{company.name}</h1>
          {company.address && <p className="text-sm text-gray-600">{company.address}</p>}
          <div className="text-sm text-gray-600">
            {company.phone && <span>{company.phone}</span>}
            {company.phone && company.email && <span> • </span>}
            {company.email && <span>{company.email}</span>}
          </div>
          {company.taxId && (
            <p className="text-sm text-gray-600">Tax ID: {company.taxId}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Receipt Title */}
          <div className="text-center">
            <h2 className="text-xl font-semibold">PAYMENT RECEIPT</h2>
            <p className="text-sm text-gray-600">Receipt No: {payment.paymentNumber}</p>
          </div>

          {/* Customer Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Received From:</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">{customer.name}</p>
              {customer.address && <p className="text-gray-600">{customer.address}</p>}
              <div className="text-gray-600">
                {customer.phone && <span>{customer.phone}</span>}
                {customer.phone && customer.email && <span> • </span>}
                {customer.email && <span>{customer.email}</span>}
              </div>
              {customer.taxId && <p className="text-gray-600">Tax ID: {customer.taxId}</p>}
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Date</p>
                <p className="font-medium">{new Date(payment.paymentDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium">{getPaymentMethodLabel(payment.paymentMethod)}</p>
              </div>
            </div>

            {payment.reference && (
              <div>
                <p className="text-sm text-gray-600">Reference</p>
                <p className="font-medium">{payment.reference}</p>
              </div>
            )}

            <div className="border-t border-b py-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Amount Received:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(payment.amount, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Applied to Invoice:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Invoice Number:</span>
                <span className="ml-2 font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Invoice Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(invoice.invoiceDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Invoice Total:</span>
                <span className="ml-2 font-medium">{formatCurrency(invoice.totalAmount, currency)}</span>
              </div>
              <div>
                <span className="text-gray-600">Previous Balance:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(invoice.balanceAmount + payment.amount, currency)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Payment Amount:</span>
                <span className="ml-2 font-medium text-green-600">
                  {formatCurrency(payment.amount, currency)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">New Balance:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(invoice.balanceAmount, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div>
              <h3 className="font-semibold mb-1">Notes:</h3>
              <p className="text-sm text-gray-600">{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 mt-6">
            <p className="text-center text-sm text-gray-600">
              Thank you for your payment!
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}