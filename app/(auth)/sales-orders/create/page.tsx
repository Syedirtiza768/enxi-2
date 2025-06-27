'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: 'cmcc5cnok001rv2x9z7tof9hs', // TechCorp Solutions ID
    customerPO: '',
    paymentTerms: 'Net 30',
    shippingTerms: 'FOB Destination',
    shippingAddress: '',
    billingAddress: '',
    notes: '',
    items: [
      {
        itemCode: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 5
      }
    ]
  });

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemCode: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxRate: 5
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient('/api/sales-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: formData.items.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity.toString()),
            unitPrice: parseFloat(item.unitPrice.toString()),
            discount: parseFloat(item.discount.toString()),
            taxRate: parseFloat(item.taxRate.toString())
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create sales order');
      }

      const result = await response.json();
      router.push(`/sales-orders/${result.data.id}`);
    } catch (error) {
      console.error('Error creating sales order:', error);
      alert('Failed to create sales order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/sales-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales Orders
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Sales Order</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerPO">Customer PO</Label>
                <Input
                  id="customerPO"
                  value={formData.customerPO}
                  onChange={(e) => setFormData({ ...formData, customerPO: e.target.value })}
                  placeholder="PO-12345"
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea
                  id="billingAddress"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Order Items</Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border p-4 rounded-lg">
                    <div className="grid grid-cols-6 gap-4">
                      <div>
                        <Label>Item Code</Label>
                        <Input
                          value={item.itemCode}
                          onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)}
                          placeholder="PROD-001"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Product description"
                          required
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeItem(index)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Tax Rate %</Label>
                        <Input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/sales-orders')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Sales Order'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}