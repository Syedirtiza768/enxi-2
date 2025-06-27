'use client';

import React from 'react';
import { useCurrency } from '@/lib/contexts/currency-context';

interface SalesOrderItem {
  id: string;
  lineNumber: number;
  lineDescription?: string;
  isLineHeader: boolean;
  sortOrder: number;
  itemType: 'PRODUCT' | 'SERVICE';
  itemId?: string;
  itemCode: string;
  description: string;
  internalDescription?: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  margin?: number;
}

interface SalesOrderLineViewProps {
  items: SalesOrderItem[];
  viewMode?: 'client' | 'internal';
}

export function SalesOrderLineView({ items, viewMode = 'client' }: SalesOrderLineViewProps) {
  const { formatCurrency } = useCurrency();

  // Group items by line number
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.lineNumber]) {
      acc[item.lineNumber] = {
        header: null,
        items: []
      };
    }
    
    if (item.isLineHeader) {
      acc[item.lineNumber].header = item;
    } else {
      acc[item.lineNumber].items.push(item);
    }
    
    return acc;
  }, {} as Record<number, { header: SalesOrderItem | null; items: SalesOrderItem[] }>);

  // Sort lines by line number
  const sortedLines = Object.entries(groupedItems).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="space-y-6">
      {sortedLines.map(([lineNumber, { header, items: lineItems }]) => (
        <div key={lineNumber} className="border rounded-lg overflow-hidden">
          {header && header.lineDescription && (
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h4 className="font-medium text-gray-900">
                Line {lineNumber}: {header.lineDescription}
              </h4>
            </div>
          )}
          
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
              {lineItems.length === 0 && !header?.lineDescription ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No items in this line
                  </td>
                </tr>
              ) : (
                lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.itemCode}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                      {viewMode === 'internal' && item.internalDescription && (
                        <div className="text-xs text-gray-400 italic mt-1">
                          Internal: {item.internalDescription}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                      {viewMode === 'internal' && item.cost !== undefined && (
                        <div className="text-xs text-gray-400">
                          Cost: {formatCurrency(item.cost)}
                          {item.margin !== undefined && (
                            <span className={`ml-1 ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({item.margin.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
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
      ))}
    </div>
  );
}