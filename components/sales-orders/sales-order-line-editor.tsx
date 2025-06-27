'use client';

import React from 'react';
import { CleanLineEditor } from '@/components/quotations/clean-line-editor';

// Updated interface to match the full structure from sales-order-form.tsx
interface SalesOrderItem {
  id?: string;
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
  taxRateId?: string;
  unitOfMeasureId?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  availableQuantity?: number;
}

// QuotationItem type for CleanLineEditor
interface QuotationItem {
  id: string;
  lineNumber: number;
  sortOrder: number;
  isLineHeader?: boolean;
  lineDescription?: string;
  itemId?: string;
  itemCode: string;
  description: string;
  internalDescription?: string;
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

    // Convert directly - maintain the line structure
    return salesOrderItems.map(item => ({
      id: item.id || `item-${Date.now()}-${item.sortOrder}`,
      lineNumber: item.lineNumber,
      sortOrder: item.sortOrder,
      isLineHeader: item.isLineHeader,
      lineDescription: item.lineDescription,
      itemId: item.itemId,
      itemCode: item.itemCode,
      description: item.description,
      internalDescription: item.internalDescription,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      cost: item.cost,
      discount: item.discount,
      taxRate: item.taxRate,
      taxRateId: item.taxRateId,
      subtotal: item.subtotal,
      totalAmount: item.totalAmount,
      itemType: item.itemType
    }));
  };

  // Convert quotation items back to sales order items
  const convertToSalesOrderItems = (quotationItems: QuotationItem[]): SalesOrderItem[] => {
    return quotationItems.map(item => {
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = subtotal * ((item.discount || 0) / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * ((item.taxRate || 0) / 100);
      const totalAmount = afterDiscount + taxAmount;

      return {
        id: item.id,
        lineNumber: item.lineNumber,
        lineDescription: item.lineDescription,
        isLineHeader: item.isLineHeader || false,
        sortOrder: item.sortOrder,
        itemType: item.itemType,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        internalDescription: item.internalDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: item.cost,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
        taxRateId: item.taxRateId,
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