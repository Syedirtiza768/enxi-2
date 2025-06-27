'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeftRight, 
  FileText, 
  Calendar,
  Receipt,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { QuotationStatus } from "@prisma/client";
import { toast } from '@/components/ui/use-toast';

interface QuotationVersion {
  id: string;
  quotationNumber: string;
  version: number;
  status: QuotationStatus;
  createdAt: string;
  validUntil: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  items: Array<{
    id: string;
    lineNumber: number;
    lineDescription?: string;
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalAmount: number;
  }>;
}

interface QuotationComparisonProps {
  salesCaseId: string;
  currentQuotationId?: string;
}

export function QuotationComparison({ salesCaseId, currentQuotationId }: QuotationComparisonProps) {
  const [versions, setVersions] = useState<QuotationVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[string?, string?]>([]);
  const [comparison, setComparison] = useState<{
    left?: QuotationVersion;
    right?: QuotationVersion;
  }>({});

  useEffect(() => {
    fetchVersions();
  }, [salesCaseId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await apiClient<{ data: QuotationVersion[] }>(
        `/api/quotations/versions/${salesCaseId}`
      );
      
      if (response.ok && response.data) {
        setVersions(response.data.data);
        
        // Auto-select versions if only 2 exist
        if (response.data.data.length === 2) {
          setSelectedVersions([response.data.data[0].id, response.data.data[1].id]);
          setComparison({
            left: response.data.data[0],
            right: response.data.data[1]
          });
        } else if (currentQuotationId && response.data.data.length > 1) {
          // Select current and previous version
          const currentIndex = response.data.data.findIndex(v => v.id === currentQuotationId);
          if (currentIndex > 0) {
            setSelectedVersions([response.data.data[currentIndex - 1].id, currentQuotationId]);
            setComparison({
              left: response.data.data[currentIndex - 1],
              right: response.data.data[currentIndex]
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch quotation versions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (position: 'left' | 'right', versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    if (position === 'left') {
      setSelectedVersions([versionId, selectedVersions[1]]);
      setComparison(prev => ({ ...prev, left: version }));
    } else {
      setSelectedVersions([selectedVersions[0], versionId]);
      setComparison(prev => ({ ...prev, right: version }));
    }
  };

  const getStatusBadge = (status: QuotationStatus) => {
    const variants: Record<QuotationStatus, { label: string; className: string }> = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
      ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
      EXPIRED: { label: 'Expired', className: 'bg-orange-100 text-orange-700' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700' },
    };

    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const formatDifference = (oldValue: number, newValue: number, isCurrency = true) => {
    const diff = newValue - oldValue;
    const percentChange = oldValue !== 0 ? ((diff / oldValue) * 100).toFixed(1) : 0;
    
    if (diff === 0) {
      return (
        <span className="flex items-center gap-1 text-gray-500">
          <Minus className="h-3 w-3" />
          No change
        </span>
      );
    }
    
    const icon = diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
    const colorClass = diff > 0 ? 'text-red-600' : 'text-green-600'; // Red for increase, green for decrease in price
    const formattedDiff = isCurrency ? formatCurrency(Math.abs(diff)) : Math.abs(diff).toString();
    
    return (
      <span className={`flex items-center gap-1 ${colorClass}`}>
        {icon}
        {formattedDiff} ({percentChange}%)
      </span>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </Card>
    );
  }

  if (versions.length < 2) {
    return (
      <Card className="p-12 text-center">
        <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">No Versions to Compare</h3>
        <p className="text-gray-500">
          Create additional quotation versions to compare changes
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version Selectors */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Compare From (Older)</label>
            <Select
              value={selectedVersions[0]}
              onValueChange={(value) => handleVersionSelect('left', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem 
                    key={version.id} 
                    value={version.id}
                    disabled={version.id === selectedVersions[1]}
                  >
                    v{version.version} - {formatDate(version.createdAt)} ({version.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Compare To (Newer)</label>
            <Select
              value={selectedVersions[1]}
              onValueChange={(value) => handleVersionSelect('right', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem 
                    key={version.id} 
                    value={version.id}
                    disabled={version.id === selectedVersions[0]}
                  >
                    v{version.version} - {formatDate(version.createdAt)} ({version.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {comparison.left && comparison.right && (
        <>
          {/* Summary Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Version {comparison.left.version}</h3>
                {getStatusBadge(comparison.left.status)}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="font-medium">{formatDate(comparison.left.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valid Until</span>
                  <span className="font-medium">{formatDate(comparison.left.validUntil)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="font-medium">{formatCurrency(comparison.left.totalAmount, comparison.left.currency)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Version {comparison.right.version}</h3>
                {getStatusBadge(comparison.right.status)}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="font-medium">{formatDate(comparison.right.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valid Until</span>
                  <span className="font-medium">{formatDate(comparison.right.validUntil)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="font-medium">{formatCurrency(comparison.right.totalAmount, comparison.right.currency)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Financial Changes */}
          <Card className="p-6">
            <h3 className="font-medium mb-4">Financial Changes</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal</span>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(comparison.right.subtotal)}</div>
                  <div className="text-xs">{formatDifference(comparison.left.subtotal, comparison.right.subtotal)}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Discount</span>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(comparison.right.discountAmount)}</div>
                  <div className="text-xs">{formatDifference(comparison.left.discountAmount, comparison.right.discountAmount)}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tax</span>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(comparison.right.taxAmount)}</div>
                  <div className="text-xs">{formatDifference(comparison.left.taxAmount, comparison.right.taxAmount)}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-medium">Total</span>
                <div className="text-right">
                  <div className="font-bold text-lg">{formatCurrency(comparison.right.totalAmount)}</div>
                  <div className="text-sm">{formatDifference(comparison.left.totalAmount, comparison.right.totalAmount)}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Line Items Comparison */}
          <Card className="p-6">
            <h3 className="font-medium mb-4">Line Items Changes</h3>
            <div className="space-y-2">
              {/* Group items by line number */}
              {(() => {
                const leftLines = new Map<number, typeof comparison.left.items[0][]>();
                const rightLines = new Map<number, typeof comparison.right.items[0][]>();
                
                comparison.left.items.forEach(item => {
                  if (!leftLines.has(item.lineNumber)) {
                    leftLines.set(item.lineNumber, []);
                  }
                  leftLines.get(item.lineNumber)!.push(item);
                });
                
                comparison.right.items.forEach(item => {
                  if (!rightLines.has(item.lineNumber)) {
                    rightLines.set(item.lineNumber, []);
                  }
                  rightLines.get(item.lineNumber)!.push(item);
                });
                
                const allLineNumbers = new Set([...leftLines.keys(), ...rightLines.keys()]);
                
                return Array.from(allLineNumbers).sort().map(lineNumber => {
                  const leftItems = leftLines.get(lineNumber) || [];
                  const rightItems = rightLines.get(lineNumber) || [];
                  
                  const lineDescription = rightItems[0]?.lineDescription || leftItems[0]?.lineDescription;
                  
                  return (
                    <div key={lineNumber} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          Line {lineNumber}
                          {lineDescription && `: ${lineDescription}`}
                        </h4>
                        {leftItems.length === 0 && (
                          <Badge className="bg-green-100 text-green-700">New</Badge>
                        )}
                        {rightItems.length === 0 && (
                          <Badge className="bg-red-100 text-red-700">Removed</Badge>
                        )}
                      </div>
                      
                      {/* Compare items within the line */}
                      <div className="space-y-2 text-sm">
                        {rightItems.map((rightItem, idx) => {
                          const leftItem = leftItems.find(l => l.itemCode === rightItem.itemCode);
                          
                          return (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-gray-600">
                                {rightItem.itemCode} - {rightItem.description}
                              </span>
                              <div className="text-right">
                                <div>
                                  {rightItem.quantity} × {formatCurrency(rightItem.unitPrice)}
                                </div>
                                {leftItem && (
                                  <div className="text-xs">
                                    {formatDifference(
                                      leftItem.quantity * leftItem.unitPrice,
                                      rightItem.quantity * rightItem.unitPrice
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Items removed in new version */}
                        {leftItems
                          .filter(leftItem => !rightItems.find(r => r.itemCode === leftItem.itemCode))
                          .map((leftItem, idx) => (
                            <div key={`removed-${idx}`} className="flex justify-between items-center opacity-50 line-through">
                              <span className="text-gray-600">
                                {leftItem.itemCode} - {leftItem.description}
                              </span>
                              <div>
                                {leftItem.quantity} × {formatCurrency(leftItem.unitPrice)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </Card>

          {/* Terms Comparison */}
          <Card className="p-6">
            <h3 className="font-medium mb-4">Terms & Conditions Changes</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Payment Terms</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    {comparison.left.paymentTerms || 'Not specified'}
                  </div>
                  <div className={`p-3 rounded text-sm ${
                    comparison.left.paymentTerms !== comparison.right.paymentTerms 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-gray-50'
                  }`}>
                    {comparison.right.paymentTerms || 'Not specified'}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Delivery Terms</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    {comparison.left.deliveryTerms || 'Not specified'}
                  </div>
                  <div className={`p-3 rounded text-sm ${
                    comparison.left.deliveryTerms !== comparison.right.deliveryTerms 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-gray-50'
                  }`}>
                    {comparison.right.deliveryTerms || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}