'use client'

import React from 'react'
import { useCurrency } from '@/lib/contexts/currency-context'

interface ClientLine {
  lineNumber: number
  lineDescription: string
  quantity: number
  totalAmount: number
}

interface ClientQuotationViewProps {
  lines: ClientLine[]
  items: any[]
}

export function ClientQuotationView({ lines, items }: ClientQuotationViewProps) {
  const { formatCurrency } = useCurrency()

  // If lines are provided from the API, use them
  if (lines && lines.length > 0) {
    return (
      <div className="space-y-2">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
            <div className="col-span-1">Line</div>
            <div className="col-span-7">Description</div>
            <div className="col-span-2 text-right">Quantity</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
        </div>
        
        {lines.map((line) => (
          <div key={line.lineNumber} className="bg-white p-4 border rounded-lg">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1 text-sm text-gray-600">
                {line.lineNumber}
              </div>
              <div className="col-span-7">
                <p className="text-sm font-medium text-gray-900">
                  {line.lineDescription || 'No description'}
                </p>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm text-gray-900">{line.quantity}</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(line.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Fallback: Group items by line number if lines not provided
  const lineGroups = new Map<number, typeof items>()
  
  items.forEach(item => {
    if (!lineGroups.has(item.lineNumber)) {
      lineGroups.set(item.lineNumber, [])
    }
    lineGroups.get(item.lineNumber)?.push(item)
  })

  const clientLines = Array.from(lineGroups.entries()).map(([lineNumber, lineItems]) => {
    const lineHeader = lineItems.find((item: any) => item.isLineHeader)
    const lineTotal = lineItems.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
    const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
    
    return {
      lineNumber,
      lineDescription: lineHeader?.lineDescription || lineHeader?.description || '',
      quantity: totalQuantity,
      totalAmount: lineTotal
    }
  })

  return (
    <div className="space-y-2">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-1">Line</div>
          <div className="col-span-7">Description</div>
          <div className="col-span-2 text-right">Quantity</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
      </div>
      
      {clientLines.map((line) => (
        <div key={line.lineNumber} className="bg-white p-4 border rounded-lg">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-1 text-sm text-gray-600">
              {line.lineNumber}
            </div>
            <div className="col-span-7">
              <p className="text-sm font-medium text-gray-900">
                {line.lineDescription || 'No description'}
              </p>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-sm text-gray-900">{line.quantity}</span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(line.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}