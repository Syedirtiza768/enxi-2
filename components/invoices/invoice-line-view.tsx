'use client';

import React from 'react';
import { useCurrency } from '@/lib/contexts/currency-context';

interface InvoiceItem {
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
}

interface InvoiceLineViewProps {
  items: InvoiceItem[];
}

export function InvoiceLineView({ items }: InvoiceLineViewProps) {
  const { formatCurrency } = useCurrency();

  // Filter out empty items (items with no code or description)
  const validItems = (items || []).filter(item => item.itemCode || item.description);

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Qty
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Discount
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tax
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {validItems.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                No items
              </td>
            </tr>
          ) : (
            validItems.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{item.itemCode}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {item.quantity}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {item.discount > 0 ? `${item.discount}%` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(item.totalAmount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}