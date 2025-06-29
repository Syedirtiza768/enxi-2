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

interface InvoiceLineViewEnhancedProps {
  items: InvoiceItem[];
}

export function InvoiceLineViewEnhanced({ items }: InvoiceLineViewEnhancedProps) {
  const { formatCurrency } = useCurrency();

  // Process items to extract line information and clean descriptions
  const processedItems = (items || []).map(item => {
    const lineMatch = item.description.match(/^LINE:(\d+):([^|]+)\|(.*)$/);
    
    if (lineMatch) {
      return {
        ...item,
        lineNumber: parseInt(lineMatch[1]),
        lineDescription: lineMatch[2],
        cleanDescription: lineMatch[3],
        hasLineInfo: true
      };
    }
    
    return {
      ...item,
      lineNumber: 1,
      lineDescription: null,
      cleanDescription: item.description,
      hasLineInfo: false
    };
  });

  // Group items by line number
  const lineGroups = new Map<number, typeof processedItems>();
  processedItems.forEach(item => {
    const lineNum = item.lineNumber;
    if (!lineGroups.has(lineNum)) {
      lineGroups.set(lineNum, []);
    }
    lineGroups.get(lineNum)?.push(item);
  });

  return (
    <div className="space-y-6">
      {Array.from(lineGroups.entries())
        .sort(([a], [b]) => a - b)
        .map(([lineNumber, lineItems]) => {
          const lineHeader = lineItems.find(item => item.hasLineInfo);
          const lineDescription = lineHeader?.lineDescription || `Line ${lineNumber}`;
          
          return (
            <div key={lineNumber} className="border rounded-lg overflow-hidden">
              {lineHeader && (
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h4 className="text-sm font-medium text-gray-900">{lineDescription}</h4>
                </div>
              )}
              
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
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
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.itemCode}</div>
                        <div className="text-sm text-gray-500">{item.cleanDescription}</div>
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
                  ))}
                </tbody>
                {lineItems.length > 1 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        Line Total
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(lineItems.reduce((sum, item) => sum + item.totalAmount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          );
        })}
    </div>
  );
}