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
import { CleanItemEditor } from '@/components/quotations/clean-item-editor';
import { LineItemEditorV3 } from '@/components/quotations/line-item-editor-v3';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, CreditCard, Truck, Send, Save, AlertCircle, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/format';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';

interface SalesOrderFormCleanProps {
  salesCaseId?: string | null;
  quotationId?: string | null;
  initialData?: any;
  viewMode?: 'internal' | 'client';
}

export function SalesOrderFormClean({ 
  salesCaseId: initialSalesCaseId, 
  quotationId,
  initialData,
  viewMode: initialViewMode = 'internal' 
}: SalesOrderFormCleanProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [salesCases, setSalesCases] = useState<any[]>([]);
  const [selectedSalesCase, setSelectedSalesCase] = useState<string>(initialSalesCaseId || '');
  const [viewMode, setViewMode] = useState<'internal' | 'client'>(initialViewMode);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer: null as any,
    quotationId: quotationId || '',
    requestedDate: '',
    promisedDate: '',
    paymentTerms: '30 days',
    shippingTerms: '',
    shippingAddress: '',
    billingAddress: '',
    customerPO: '',
    notes: '',
    internalNotes: '',
    items: [] as any[],
    useLineBasedEditor: true,
    status: 'PENDING' as const,
    version: 1
  });

  // Calculate dates
  const orderDate = new Date();
  const defaultPromisedDate = addDays(orderDate, 7);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
        customer_id: initialData.salesCase?.customerId || initialData.customer_id,
        customer: initialData.salesCase?.customer || initialData.customer,
        items: initialData.items || [],
        useLineBasedEditor: initialData.items?.some((item: any) => item.lineNumber) || true
      });
      setSelectedSalesCase(initialData.salesCaseId || '');
    } else if (quotationId) {
      fetchQuotationData(quotationId);
    } else if (initialSalesCaseId) {
      fetchSalesCaseDetails(initialSalesCaseId);
    }
  }, [initialData, quotationId, initialSalesCaseId]);

  useEffect(() => {
    if (formData.customer_id && !initialSalesCaseId) {
      fetchSalesCases(formData.customer_id);
    }
  }, [formData.customer_id, initialSalesCaseId]);

  const fetchQuotationData = async (quotationId: string) => {
    try {
      const response = await apiClient(`/api/quotations/${quotationId}`);
      if (response.ok && response?.data) {
        const quotation = response.data;
        setFormData(prev => ({ 
          ...prev,
          customer_id: quotation.salesCase?.customerId,
          customer: quotation.salesCase?.customer,
          quotationId: quotation.id,
          paymentTerms: quotation.paymentTerms || prev.paymentTerms,
          shippingTerms: quotation.deliveryTerms || prev.shippingTerms,
          notes: quotation.notes || '',
          internalNotes: quotation.internalNotes || '',
          items: quotation.items || [],
          useLineBasedEditor: quotation.items?.some((item: any) => item.lineNumber) || true
        }));
        setSelectedSalesCase(quotation.salesCaseId);
        setSalesCases([quotation.salesCase]);
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quotation data',
        variant: 'destructive'
      });
    }
  };

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
        const salesCasesList = response.data?.data || [];
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

  const handleCustomerSelect = (customerId: string, customer?: any) => {
    if (!customer) return;
    setFormData(prev => ({ 
      ...prev, 
      customer_id: customerId, 
      customer,
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || customer.billingAddress || ''
    }));
    setSelectedSalesCase('');
    setSalesCases([]);
  };

  const handleSubmit = async (action: 'draft' | 'send') => {
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

    const items = formData.items.filter(item => !item.isLineHeader); // Filter out line headers
    if (!items || items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item to the order',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const orderData: any = {
        salesCaseId: selectedSalesCase,
        items: items.map(item => {
          const mappedItem: any = {
            // Required fields
            itemCode: item.itemCode || item.code || '',
            description: item.description || item.name || '',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0
          };
          
          // Add optional fields only if they have values
          if (typeof item.lineNumber === 'number') mappedItem.lineNumber = item.lineNumber;
          if (item.lineDescription) mappedItem.lineDescription = item.lineDescription;
          if (item.isLineHeader === true) mappedItem.isLineHeader = true;
          if (typeof item.sortOrder === 'number') mappedItem.sortOrder = item.sortOrder;
          if (item.itemType === 'PRODUCT' || item.itemType === 'SERVICE') {
            mappedItem.itemType = item.itemType;
          }
          if (item.itemId) mappedItem.itemId = item.itemId;
          if (item.internalDescription) mappedItem.internalDescription = item.internalDescription;
          if (typeof item.cost === 'number' && item.cost >= 0) mappedItem.cost = item.cost;
          if (typeof item.discount === 'number' && item.discount >= 0 && item.discount <= 100) {
            mappedItem.discount = item.discount;
          }
          if (typeof item.taxRate === 'number' && item.taxRate >= 0 && item.taxRate <= 100) {
            mappedItem.taxRate = item.taxRate;
          }
          if (item.taxRateId) mappedItem.taxRateId = item.taxRateId;
          if (item.unitOfMeasureId) mappedItem.unitOfMeasureId = item.unitOfMeasureId;
          
          return mappedItem;
        })
      };
      
      // Add optional fields only if they have values
      if (formData.quotationId) orderData.quotationId = formData.quotationId;
      if (formData.requestedDate) {
        const requestedDate = new Date(formData.requestedDate);
        requestedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        orderData.requestedDate = requestedDate.toISOString();
      }
      if (formData.promisedDate) {
        const promisedDate = new Date(formData.promisedDate);
        promisedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        orderData.promisedDate = promisedDate.toISOString();
      } else {
        const promisedDate = new Date(format(defaultPromisedDate, 'yyyy-MM-dd'));
        promisedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        orderData.promisedDate = promisedDate.toISOString();
      }
      if (formData.paymentTerms) orderData.paymentTerms = formData.paymentTerms;
      if (formData.shippingTerms) orderData.shippingTerms = formData.shippingTerms;
      if (formData.shippingAddress) orderData.shippingAddress = formData.shippingAddress;
      if (formData.billingAddress) orderData.billingAddress = formData.billingAddress;
      if (formData.customerPO) orderData.customerPO = formData.customerPO;
      if (formData.notes) orderData.notes = formData.notes;


      const response = initialData?.id 
        ? await apiClient(`/api/sales-orders/${initialData.id}`, {
            method: 'PUT',
            body: JSON.stringify(orderData)
          })
        : await apiClient('/api/sales-orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
          });

      if (response.ok && response?.data) {
        // The API returns { success: true, data: salesOrder }
        // The apiClient wraps this in { data: { success: true, data: salesOrder } }
        const salesOrder = response.data.data || response.data;
        const orderId = salesOrder.id;
        
        if (!orderId) {
          console.error('No order ID in response:', response);
          throw new Error('Order created but no ID returned');
        }
        
        toast({
          title: 'Success',
          description: `Order ${action === 'send' ? 'created and confirmed' : 'saved as draft'} successfully`
        });
        router.push(`/sales-orders/${orderId}`);
      } else {
        // Log the full error response for debugging
        console.error('Error response:', response);
        console.error('Validation details:', response?.details);
        
        // Extract detailed error message
        let errorMessage = response?.error?.message || response?.message || 'Failed to save order';
        if (response?.details && Array.isArray(response.details)) {
          const fieldErrors = response.details.map((err: any) => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          errorMessage = `Validation failed: ${fieldErrors}`;
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: 'Error',
        description: 'Failed to save order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemsChange = (items: any[]) => {
    setFormData(prev => ({ 
      ...prev, 
      items: items 
    }));
  };

  const calculateTotals = () => {
    const items = formData.items || [];
    const subtotal = items.reduce((sum, item) => {
      if (item.isLineHeader) return sum;
      return sum + (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100));
    }, 0);
    const taxAmount = items.reduce((sum, item) => {
      if (item.isLineHeader) return sum;
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      return sum + (lineTotal * (item.taxRate || 0) / 100);
    }, 0);
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {initialData ? `Edit Sales Order ${initialData.orderNumber}` : 'New Sales Order'}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === 'internal' ? 'client' : 'internal')}
          className="gap-2"
        >
          {viewMode === 'internal' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {viewMode === 'internal' ? 'Internal View' : 'Client View'}
        </Button>
      </div>

      {/* Customer and Sales Case Selection */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <CustomerSearch
                value={formData.customer_id}
                onChange={handleCustomerSelect}
                disabled={!!initialSalesCaseId || loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Sales Case</Label>
              <Select 
                value={selectedSalesCase} 
                onValueChange={setSelectedSalesCase}
                disabled={!formData.customer_id || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sales case" />
                </SelectTrigger>
                <SelectContent>
                  {salesCases.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.caseNumber} - {sc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {quotationId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                This order is being created from quotation {formData.quotationId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Order Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={format(orderDate, 'yyyy-MM-dd')}
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label>Requested Delivery Date</Label>
              <Input
                type="date"
                value={formData.requestedDate}
                onChange={(e) => setFormData(prev => ({ ...prev, requestedDate: e.target.value }))}
                min={format(orderDate, 'yyyy-MM-dd')}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Promised Delivery Date</Label>
              <Input
                type="date"
                value={formData.promisedDate || format(defaultPromisedDate, 'yyyy-MM-dd')}
                onChange={(e) => setFormData(prev => ({ ...prev, promisedDate: e.target.value }))}
                min={format(orderDate, 'yyyy-MM-dd')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer PO Number</Label>
              <Input
                value={formData.customerPO}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPO: e.target.value }))}
                placeholder="Enter customer PO number"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                  <SelectItem value="15 days">15 days</SelectItem>
                  <SelectItem value="30 days">30 days</SelectItem>
                  <SelectItem value="45 days">45 days</SelectItem>
                  <SelectItem value="60 days">60 days</SelectItem>
                  <SelectItem value="90 days">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Shipping Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shipping Address</Label>
              <Textarea
                value={formData.shippingAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                placeholder="Enter shipping address"
                rows={3}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Billing Address</Label>
              <Textarea
                value={formData.billingAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                placeholder="Enter billing address"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Shipping Terms</Label>
            <Input
              value={formData.shippingTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingTerms: e.target.value }))}
              placeholder="e.g., FOB, EXW, CIF"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Editor */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Order Items</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData(prev => ({ ...prev, useLineBasedEditor: !prev.useLineBasedEditor }))}
              className="gap-2"
            >
              {formData.useLineBasedEditor ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {formData.useLineBasedEditor ? 'Line-based View' : 'Simple View'}
            </Button>
          </div>
          
          {formData.useLineBasedEditor ? (
            <LineItemEditorV3
              quotationItems={formData.items}
              onChange={handleItemsChange}
              disabled={loading}
            />
          ) : (
            <CleanItemEditor
              items={formData.items}
              onChange={handleItemsChange}
              disabled={loading}
            />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Customer Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes visible to the customer"
              rows={3}
              disabled={loading}
            />
          </div>
          
          {viewMode === 'internal' && (
            <Collapsible open={showInternalNotes} onOpenChange={setShowInternalNotes}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                <AlertCircle className="w-4 h-4" />
                Internal Notes (not visible to customer)
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  placeholder="Internal notes for staff only"
                  rows={3}
                  disabled={loading}
                  className="bg-yellow-50"
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(totals.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={loading}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit('send')}
          disabled={loading}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Create & Confirm Order
        </Button>
      </div>
    </div>
  );
}