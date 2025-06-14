'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimplifiedItemEditor } from './simplified-item-editor';
import { CustomerSearch } from '@/components/customers/customer-search';
import { useToast } from '@/components/ui/use-toast';
import { Eye, FileText, Save, Send } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api/client';

interface QuotationFormData {
  customer_id: string;
  customer?: any;
  date: string;
  expiry_date: string;
  payment_terms: string;
  delivery_terms: string;
  special_instructions: string;
  internal_notes: string;
  discount_percentage: number;
  items: any[];
}

interface QuotationFormV2Props {
  salesCaseId?: string | null;
}

export function QuotationFormV2({ salesCaseId: initialSalesCaseId }: QuotationFormV2Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'client' | 'internal'>('client');
  const [salesCases, setSalesCases] = useState<any[]>([]);
  const [selectedSalesCase, setSelectedSalesCase] = useState<string>(initialSalesCaseId || '');
  
  const [formData, setFormData] = useState<QuotationFormData>({
    customer_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    payment_terms: '30 days',
    delivery_terms: '',
    special_instructions: '',
    internal_notes: '',
    discount_percentage: 0,
    items: []
  });

  // If we have an initial sales case ID, fetch its details
  useEffect(() => {
    if (initialSalesCaseId) {
      fetchSalesCaseDetails(initialSalesCaseId);
    }
  }, [initialSalesCaseId]);

  // Fetch sales cases when customer is selected
  useEffect(() => {
    if (formData.customer_id && !initialSalesCaseId) {
      fetchSalesCases(formData.customer_id);
    } else if (!formData.customer_id && !initialSalesCaseId) {
      setSalesCases([]);
      setSelectedSalesCase('');
    }
  }, [formData.customer_id, initialSalesCaseId]);

  const fetchSalesCaseDetails = async (salesCaseId: string) => {
    try {
      const response = await apiClient(`/api/sales-cases/${salesCaseId}`);
      if (response.ok && response.data) {
        const salesCase = response.data;
        // Set the customer from the sales case
        setFormData(prev => ({ 
          ...prev, 
          customer_id: salesCase.customerId,
          customer: salesCase.customer
        }));
        setSalesCases([salesCase]);
      }
    } catch (error) {
      console.error('Error fetching sales case details:', error);
    }
  };

  const fetchSalesCases = async (customerId: string) => {
    try {
      const response = await apiClient(`/api/sales-cases?customerId=${customerId}&status=OPEN`);
      if (response.ok && response.data) {
        setSalesCases(response.data);
        // Auto-select if only one open sales case
        if (response.data.length === 1) {
          setSelectedSalesCase(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching sales cases:', error);
    }
  };

  const calculateTotals = () => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = itemsTotal * (formData.discount_percentage / 100);
    const total = itemsTotal - discountAmount;
    
    return {
      subtotal: itemsTotal,
      discount: discountAmount,
      total: total
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'sent') => {
    e.preventDefault();
    
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
        description: 'Please select or create a sales case for this customer',
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
      // Transform form data to match API expectations
      const quotationData = {
        salesCaseId: selectedSalesCase,
        validUntil: formData.expiry_date,
        paymentTerms: formData.payment_terms,
        deliveryTerms: formData.delivery_terms,
        notes: formData.special_instructions,
        internalNotes: formData.internal_notes,
        items: formData.items.map(item => ({
          itemCode: item.code || item.itemCode || '',
          description: item.description || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || item.price || 0,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
          cost: item.cost || 0
        }))
      };

      const response = await apiClient<{ data: any[] }>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(quotationData)
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create quotation');
      }

      const result = response.data;

      // If status is 'sent', send the quotation
      if (status === 'sent' && result.id) {
        await apiClient(`/api/quotations/${result.id}/send`, {
          method: 'POST'
        });
      }

      toast({
        title: 'Success',
        description: `Quotation ${status === 'sent' ? 'sent' : 'saved as draft'} successfully`
      });

      router.push(`/quotations/${result.id}`);
    } catch (error) {
      console.error('Error creating quotation:', error);
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
    <div className="max-w-7xl mx-auto">
      {/* Header with View Toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Quotation</h1>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'client' | 'internal')}>
          <TabsList>
            <TabsTrigger value="client" className="gap-2">
              <Eye className="h-4 w-4" />
              Client View
            </TabsTrigger>
            <TabsTrigger value="internal" className="gap-2">
              <FileText className="h-4 w-4" />
              Internal View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'draft')}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerSearch
                  value={formData.customer_id}
                  onChange={(customerId, customer) => {
                    setFormData(prev => ({ ...prev, customer_id: customerId, customer }));
                  }}
                  disabled={!!initialSalesCaseId}
                />
                {formData.customer && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{formData.customer.name}</p>
                    {formData.customer.email && (
                      <p className="text-sm text-gray-600">{formData.customer.email}</p>
                    )}
                    {formData.customer.phone && (
                      <p className="text-sm text-gray-600">{formData.customer.phone}</p>
                    )}
                  </div>
                )}
                
                {/* Sales Case Selection */}
                {formData.customer_id && !initialSalesCaseId && (
                  <div className="mt-4">
                    <Label htmlFor="salesCase">Sales Case</Label>
                    <Select
                      value={selectedSalesCase}
                      onValueChange={setSelectedSalesCase}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sales case" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesCases.length === 0 ? (
                          <SelectItem value="create" disabled>
                            No open sales cases - Please create one first
                          </SelectItem>
                        ) : (
                          salesCases.map((salesCase) => (
                            <SelectItem key={salesCase.id} value={salesCase.id}>
                              {salesCase.caseNumber} - {salesCase.title || 'Untitled'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {salesCases.length === 0 && (
                      <p className="text-sm text-amber-600 mt-2">
                        Please create a sales case for this customer first before creating a quotation.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Show selected sales case when coming from sales case page */}
                {initialSalesCaseId && salesCases.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Sales Case:</span> {salesCases[0].caseNumber} - {salesCases[0].title || 'Untitled'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent className="pt-6">
                <SimplifiedItemEditor
                  items={formData.items}
                  onItemsChange={(items) => setFormData(prev => ({ ...prev, items }))}
                  viewMode={viewMode}
                />
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="delivery_terms">Delivery Terms</Label>
                  <Input
                    id="delivery_terms"
                    value={formData.delivery_terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_terms: e.target.value }))}
                    placeholder="e.g., FOB, CIF, Ex-Works"
                  />
                </div>
                
                <div>
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea
                    id="special_instructions"
                    value={formData.special_instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                    placeholder="Any special instructions for the customer..."
                    rows={3}
                  />
                </div>

                {viewMode === 'internal' && (
                  <div>
                    <Label htmlFor="internal_notes">Internal Notes</Label>
                    <Textarea
                      id="internal_notes"
                      value={formData.internal_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                      placeholder="Notes for internal use only..."
                      rows={3}
                      className="bg-yellow-50"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quotation Details */}
            <Card>
              <CardHeader>
                <CardTitle>Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expiry_date">Valid Until</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
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
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">AED {totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm flex-1">Discount</span>
                    <Input
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount_percentage: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-20"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <span className="text-sm">%</span>
                    <span className="text-sm font-medium w-24 text-right">
                      -AED {totals.discount.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">AED {totals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {viewMode === 'internal' && formData.items.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Total Cost</span>
                          <span>AED {formData.items.reduce((sum, item) => sum + (Number(item.cost || 0) * Number(item.quantity || 0)), 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Gross Margin</span>
                          <span className="font-medium">
                            {totals.total > 0 
                              ? `${(((totals.total - formData.items.reduce((sum, item) => sum + (Number(item.cost || 0) * Number(item.quantity || 0)), 0)) / totals.total) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={(e) => handleSubmit(e as any, 'sent')}
                  disabled={loading}
                >
                  <Send className="h-4 w-4" />
                  Send Quotation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}