'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSearch } from '@/components/customers/customer-search';
import { CleanItemEditor } from './clean-item-editor';
import { LineBasedItemEditor } from './line-based-item-editor';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, CreditCard, Truck, Send, Save, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/format';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QuotationFormCleanProps {
  salesCaseId?: string | null;
}

export function QuotationFormClean({ salesCaseId: initialSalesCaseId }: QuotationFormCleanProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [salesCases, setSalesCases] = useState<any[]>([]);
  const [selectedSalesCase, setSelectedSalesCase] = useState<string>(initialSalesCaseId || '');
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer: null as any,
    validDays: 30,
    paymentTerms: '30 days',
    deliveryTerms: '',
    specialInstructions: '',
    internalNotes: '',
    items: [] as any[],
    lines: [] as any[],
    useLineBasedEditor: true
  });

  // Calculate dates based on validDays
  const quotationDate = new Date();
  const expiryDate = addDays(quotationDate, formData.validDays);

  useEffect(() => {
    if (initialSalesCaseId) {
      fetchSalesCaseDetails(initialSalesCaseId);
    }
  }, [initialSalesCaseId]);

  useEffect(() => {
    if (formData.customer_id && !initialSalesCaseId) {
      fetchSalesCases(formData.customer_id);
    }
  }, [formData.customer_id, initialSalesCaseId]);

  const fetchSalesCaseDetails = async (salesCaseId: string) => {
    try {
      const response = await apiClient(`/api/sales-cases/${salesCaseId}`);
      if (response.ok && response?.data) {
        const salesCase = response?.data;
        setFormData(prev => ({ 
          ...prev, 
          customer_id: salesCase.customerId,
          customer: salesCase.customer
        }));
        setSalesCases([salesCase]);
      }
    } catch (error) {
      console.error('Error fetching sales case:', error);
    }
  };

  const fetchSalesCases = async (customerId: string) => {
    try {
      const response = await apiClient(`/api/sales-cases?customerId=${customerId}&status=OPEN`);
      if (response.ok && response?.data) {
        // The API returns { success: true, data: salesCases[], ... }
        const salesCasesList = response.data || [];
        setSalesCases(salesCasesList);
        if (salesCasesList.length === 1) {
          setSelectedSalesCase(salesCasesList[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching sales cases:', error);
      setSalesCases([]);
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxTotal = formData.items.reduce((sum, item) => sum + ((item.total - item.subtotal) || 0), 0);
    return { subtotal, taxTotal, total: subtotal };
  };

  const totals = calculateTotals();

  const handleSubmit = async (status: 'draft' | 'sent') => {
    if (!formData.customer_id) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedSalesCase) {
      toast({
        title: 'Error',
        description: 'Please select a sales case',
        variant: 'destructive'
      });
      return;
    }

    if (formData.items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      
      const quotationData = {
        salesCaseId: selectedSalesCase,
        validUntil: expiryDate.toISOString(),
        paymentTerms: formData.paymentTerms,
        deliveryTerms: formData.deliveryTerms,
        notes: formData.specialInstructions,
        internalNotes: formData.internalNotes,
        items: formData.items.filter(item => item.name || item.description).map(item => ({
          lineNumber: item.lineNumber || 1,
          lineDescription: item.lineDescription || '',
          isLineHeader: item.isLineHeader || false,
          itemType: item.itemType || 'PRODUCT',
          itemId: item.inventoryItemId || item.itemId,
          itemCode: item.code || item.itemCode || '',
          description: item.description || item.name || '',
          internalDescription: item.internalDescription || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: item.unitPrice || item.price || 0,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
          taxRateId: item.taxRateId,
          unitOfMeasureId: item.unitOfMeasureId,
          cost: item.cost || 0,
          sortOrder: item.sortOrder
        }))
      };

      const response = await apiClient<{ data: { id: string; quotationNumber: string } }>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(quotationData)
      });

      if (!response.ok) {
        const errorMsg = response.message || response.error || 'Failed to create quotation';
        const errorDetails = response.details ? ` Details: ${response.details}` : '';
        throw new Error(errorMsg + errorDetails);
      }

      const result = response?.data;

      if (!result || !result.id) {
        throw new Error('Invalid response from server - no quotation ID received');
      }

      if (status === 'sent') {
        await apiClient(`/api/quotations/${result.id}/send`, {
          method: 'POST'
        });
      }

      toast({
        title: 'Success',
        description: `Quotation ${status === 'sent' ? 'sent' : 'saved'} successfully`
      });

      router.push(`/quotations/${result.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save quotation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Customer & Sales Case Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Customer</Label>
              <CustomerSearch
                value={formData.customer_id}
                onChange={(customerId, customer) => {
                  setFormData(prev => ({ ...prev, customer_id: customerId, customer }));
                }}
                disabled={!!initialSalesCaseId}
              />
            </div>

            {formData.customer_id && (
              <>
                {salesCases.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">No open sales cases. Please create one first.</span>
                  </div>
                ) : (
                  <div>
                    <Label>Sales Case</Label>
                    <Select value={selectedSalesCase} onValueChange={setSelectedSalesCase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales case" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesCases.map((sc) => (
                          <SelectItem key={sc.id} value={sc.id}>
                            {sc.caseNumber} - {sc.title || 'Untitled'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Quote Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData(prev => ({ ...prev, useLineBasedEditor: !prev.useLineBasedEditor }))}
              className="gap-2"
            >
              {formData.useLineBasedEditor ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {formData.useLineBasedEditor ? 'Line-based View' : 'Simple View'}
            </Button>
          </div>
          
          {formData.useLineBasedEditor ? (
            <LineBasedItemEditor
              lines={formData.lines}
              onLinesChange={(lines) => {
                // Convert lines to flat items array for backend compatibility
                const items = lines.flatMap(line => 
                  line.items.map((item, index) => ({
                    ...item,
                    lineNumber: line.lineNumber,
                    lineDescription: line.lineDescription,
                    isLineHeader: index === 0,
                    sortOrder: (line.lineNumber - 1) * 100 + index
                  }))
                );
                setFormData(prev => ({ ...prev, lines, items }));
              }}
            />
          ) : (
            <CleanItemEditor
              items={formData.items}
              onItemsChange={(items) => setFormData(prev => ({ ...prev, items }))}
            />
          )}
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label>Validity</Label>
            </div>
            <Select 
              value={formData.validDays.toString()} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, validDays: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="45">45 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Valid until {format(expiryDate, 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <Label>Payment Terms</Label>
            </div>
            <Select 
              value={formData.paymentTerms} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, paymentTerms: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="7 days">Net 7 days</SelectItem>
                <SelectItem value="15 days">Net 15 days</SelectItem>
                <SelectItem value="30 days">Net 30 days</SelectItem>
                <SelectItem value="45 days">Net 45 days</SelectItem>
                <SelectItem value="60 days">Net 60 days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-gray-500" />
              <Label>Delivery Terms</Label>
            </div>
            <Input
              value={formData.deliveryTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryTerms: e.target.value }))}
              placeholder="Ex-Works, FOB, CIF..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Collapsible>
        <Card>
          <CardContent className="pt-6">
            <CollapsibleTrigger className="w-full">
              <div className="flex justify-between items-center cursor-pointer hover:text-gray-700">
                <span className="font-medium">Additional Information</span>
                <span className="text-sm text-gray-500">Click to expand</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Special Instructions</Label>
                  <Textarea
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    placeholder="Any special instructions for the customer..."
                    rows={3}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Internal Notes</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInternalNotes(!showInternalNotes)}
                    >
                      {showInternalNotes ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  {showInternalNotes && (
                    <Textarea
                      value={formData.internalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                      placeholder="Notes for internal use only..."
                      rows={3}
                      className="bg-yellow-50"
                    />
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Summary & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal - totals.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(totals.taxTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSubmit('draft')}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSubmit('sent')}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}