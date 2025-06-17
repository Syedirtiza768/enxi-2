'use client';

import React from 'react';
import { CleanLineEditor } from '@/components/quotations/clean-line-editor';

interface SalesOrderItem {
  id?: string;
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
  itemId?: string;
}

interface QuotationItem {
  id: string;
  lineNumber: number;
  sortOrder: number;
  isLineHeader?: boolean;
  lineDescription?: string;
  itemId?: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRateId?: string;
  taxRate?: number;
  subtotal: number;
  totalAmount: number;
  itemType: 'PRODUCT' | 'SERVICE';
  cost?: number;
}

interface SalesOrderLineEditorProps {
  items: SalesOrderItem[];
  onChange: (items: SalesOrderItem[]) => void;
  disabled?: boolean;
}

export function SalesOrderLineEditor({ items, onChange, disabled = false }: SalesOrderLineEditorProps) {
  // Convert sales order items to quotation items format
  const convertToQuotationItems = (salesOrderItems: SalesOrderItem[]): QuotationItem[] => {
    if (salesOrderItems.length === 0) {
      // Start with one empty line
      return [{
        id: `line-${Date.now()}`,
        lineNumber: 1,
        sortOrder: 0,
        isLineHeader: true,
        lineDescription: '',
        itemCode: '',
        description: '',
        quantity: 0,
        unitPrice: 0,
        subtotal: 0,
        totalAmount: 0,
        itemType: 'PRODUCT'
      }];
    }

    // Group items by line (for now, put all items in line 1)
    // In future, we can support multiple lines based on some grouping logic
    const quotationItems: QuotationItem[] = [];
    
    // Add header for line 1
    quotationItems.push({
      id: `line-header-1`,
      lineNumber: 1,
      sortOrder: 0,
      isLineHeader: true,
      lineDescription: 'Sales Order Items',
      itemCode: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      subtotal: 0,
      totalAmount: 0,
      itemType: 'PRODUCT'
    });

    // Add all items to line 1
    salesOrderItems.forEach((item, index) => {
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = subtotal * (item.discount / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (item.taxRate / 100);
      const totalAmount = afterDiscount + taxAmount;

      quotationItems.push({
        id: item.id || `item-${Date.now()}-${index}`,
        lineNumber: 1,
        sortOrder: index + 1,
        isLineHeader: false,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        subtotal: subtotal,
        totalAmount: totalAmount,
        itemType: 'PRODUCT',
        cost: 0
      });
    });

    return quotationItems;
  };

  // Convert quotation items back to sales order items
  const convertToSalesOrderItems = (quotationItems: QuotationItem[]): SalesOrderItem[] => {
    return quotationItems
      .filter(item => !item.isLineHeader) // Exclude line headers
      .map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = subtotal * ((item.discount || 0) / 100);
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * ((item.taxRate || 0) / 100);
        const totalAmount = afterDiscount + taxAmount;

        return {
          id: item.id,
          itemId: item.itemId,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
          subtotal: subtotal,
          discountAmount: discountAmount,
          taxAmount: taxAmount,
          totalAmount: totalAmount
        };
      });
  };

  const quotationItems = convertToQuotationItems(items);

  const handleChange = (newQuotationItems: QuotationItem[]) => {
    const salesOrderItems = convertToSalesOrderItems(newQuotationItems);
    onChange(salesOrderItems);
  };

  return (
    <CleanLineEditor
      items={quotationItems}
      onChange={handleChange}
      viewMode="internal"
      disabled={disabled}
    />
  );
}