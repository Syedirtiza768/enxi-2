'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Mail, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useCurrencyFormatter } from '@/lib/contexts/currency-context';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    billingAddress: string;
  };
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  billingAddress: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  items: Array<{
    id: string;
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  payments: Array<{
    id: string;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
  }>;
}

export default function CustomerInvoiceView() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { format: formatCurrency } = useCurrencyFormatter();

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiClient(`/api/customer/invoices/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load invoice');
      }
      
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient(`/api/customer/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default';
      case 'PARTIAL':
        return 'secondary';
      case 'OVERDUE':
        return 'destructive';
      case 'SENT':
      case 'VIEWED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invoice Not Found</h3>
              <p className="text-gray-600 mb-4">
                {error || 'The invoice you are looking for could not be found.'}
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Invoice Details</CardTitle>
              <div className="mt-2">
                <Badge variant={getStatusBadgeVariant(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Invoice Date</p>
              <p className="font-semibold">
                {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
              </p>
              <p className="text-sm text-gray-600 mt-2">Due Date</p>
              <p className="font-semibold">
                {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Bill To</h3>
              <p className="font-medium">{invoice.customer.name}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {invoice.billingAddress}
              </p>
              {invoice.customer.email && (
                <p className="text-sm text-gray-600 mt-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  {invoice.customer.email}
                </p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Invoice Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Terms:</span>
                  <span className="font-medium">{invoice.paymentTerms}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="my-6 border-b border-gray-200" />

          <div className="mb-6">
            <h3 className="font-semibold mb-4">Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-600">{item.itemCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.discount > 0 ? `${item.discount}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-red-600">
                    -{formatCurrency(invoice.discountAmount)}
                  </span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="border-b border-gray-200" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid</span>
                    <span className="text-green-600">
                      -{formatCurrency(invoice.paidAmount)}
                    </span>
                  </div>
                  <div className="border-b border-gray-200" />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Balance Due</span>
                    <span className={invoice.balanceAmount > 0 ? 'text-red-600' : ''}>
                      {formatCurrency(invoice.balanceAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {invoice.notes && (
            <>
              <div className="my-6 border-b border-gray-200" />
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {invoice.notes}
                </p>
              </div>
            </>
          )}

          {invoice.payments.length > 0 && (
            <>
              <div className="my-6 border-b border-gray-200" />
              <div>
                <h3 className="font-semibold mb-4">Payment History</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}