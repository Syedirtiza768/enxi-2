'use client'

import React, { useState, useEffect } from 'react'
import { 
  PageLayout,
  PageHeader,
  PageSection,
  VStack,
  HStack,
  Grid,
  Card,
  CardContent,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Badge
} from '@/components/design-system'
import { 
  Plus, Settings, Percent, Calendar,
  Edit, Trash2, Check, X
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { TaxCategory, TaxRate, TaxType } from '@/lib/types/shared-enums'

interface TaxCategoryWithRates extends TaxCategory {
  taxRates: TaxRate[]
}

export default function TaxConfigurationPage() {
  const [categories, setCategories] = useState<TaxCategoryWithRates[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showRateDialog, setShowRateDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaxCategory | null>(null)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  
  // Form data
  const [categoryForm, setCategoryForm] = useState({
    code: '',
    name: '',
    description: '',
    isDefault: false
  })
  
  const [rateForm, setRateForm] = useState({
    code: '',
    name: '',
    description: '',
    rate: 0,
    categoryId: '',
    taxType: TaxType.SALES,
    appliesTo: 'ALL',
    isDefault: false,
    isCompound: false,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await apiClient('/api/tax-categories', { method: 'GET' })
      if (response.ok && response.data) {
        setCategories(response.data)
      } else {
        setError(response.error || 'Failed to fetch tax categories')
      }
    } catch (err) {
      setError('Failed to fetch tax categories')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    try {
      const response = await apiClient('/api/tax-categories', {
        method: 'POST',
        body: JSON.stringify(categoryForm)
      })
      
      if (response.ok) {
        setShowCategoryDialog(false)
        setCategoryForm({ code: '', name: '', description: '', isDefault: false })
        fetchCategories()
      } else {
        alert(response.error || 'Failed to create category')
      }
    } catch (err) {
      alert('Failed to create category')
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    
    try {
      const response = await apiClient(`/api/tax-categories/${editingCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify(categoryForm)
      })
      
      if (response.ok) {
        setShowCategoryDialog(false)
        setEditingCategory(null)
        setCategoryForm({ code: '', name: '', description: '', isDefault: false })
        fetchCategories()
      } else {
        alert(response.error || 'Failed to update category')
      }
    } catch (err) {
      alert('Failed to update category')
    }
  }

  const handleCreateRate = async () => {
    try {
      const response = await apiClient('/api/tax-rates', {
        method: 'POST',
        body: JSON.stringify({
          ...rateForm,
          effectiveFrom: rateForm.effectiveFrom ? new Date(rateForm.effectiveFrom) : undefined,
          effectiveTo: rateForm.effectiveTo ? new Date(rateForm.effectiveTo) : undefined
        })
      })
      
      if (response.ok) {
        setShowRateDialog(false)
        setRateForm({
          code: '',
          name: '',
          description: '',
          rate: 0,
          categoryId: '',
          taxType: TaxType.SALES,
          appliesTo: 'ALL',
          isDefault: false,
          isCompound: false,
          effectiveFrom: new Date().toISOString().split('T')[0],
          effectiveTo: ''
        })
        fetchCategories()
      } else {
        alert(response.error || 'Failed to create tax rate')
      }
    } catch (err) {
      alert('Failed to create tax rate')
    }
  }

  const handleUpdateRate = async () => {
    if (!editingRate) return
    
    try {
      const response = await apiClient(`/api/tax-rates/${editingRate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...rateForm,
          effectiveFrom: rateForm.effectiveFrom ? new Date(rateForm.effectiveFrom) : undefined,
          effectiveTo: rateForm.effectiveTo ? new Date(rateForm.effectiveTo) : undefined
        })
      })
      
      if (response.ok) {
        setShowRateDialog(false)
        setEditingRate(null)
        setRateForm({
          code: '',
          name: '',
          description: '',
          rate: 0,
          categoryId: '',
          taxType: TaxType.SALES,
          appliesTo: 'ALL',
          isDefault: false,
          isCompound: false,
          effectiveFrom: new Date().toISOString().split('T')[0],
          effectiveTo: ''
        })
        fetchCategories()
      } else {
        alert(response.error || 'Failed to update tax rate')
      }
    } catch (err) {
      alert('Failed to update tax rate')
    }
  }

  const openCategoryDialog = (category?: TaxCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        code: category.code,
        name: category.name,
        description: category.description || '',
        isDefault: category.isDefault
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({ code: '', name: '', description: '', isDefault: false })
    }
    setShowCategoryDialog(true)
  }

  const openRateDialog = (rate?: TaxRate, categoryId?: string) => {
    if (rate) {
      setEditingRate(rate)
      setRateForm({
        code: rate.code,
        name: rate.name,
        description: rate.description || '',
        rate: rate.rate,
        categoryId: rate.categoryId,
        taxType: rate.taxType,
        appliesTo: rate.appliesTo,
        isDefault: rate.isDefault,
        isCompound: rate.isCompound,
        effectiveFrom: rate.effectiveFrom ? new Date(rate.effectiveFrom).toISOString().split('T')[0] : '',
        effectiveTo: rate.effectiveTo ? new Date(rate.effectiveTo).toISOString().split('T')[0] : ''
      })
    } else {
      setEditingRate(null)
      setRateForm({
        code: '',
        name: '',
        description: '',
        rate: 0,
        categoryId: categoryId || '',
        taxType: TaxType.SALES,
        appliesTo: 'ALL',
        isDefault: false,
        isCompound: false,
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: ''
      })
    }
    setShowRateDialog(true)
  }

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="Tax Configuration"
          subtitle="Manage tax categories and rates"
        />
        <PageSection>
          <Text>Loading...</Text>
        </PageSection>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <PageHeader
          title="Tax Configuration"
          subtitle="Manage tax categories and rates"
        />
        <PageSection>
          <Text color="error">{error}</Text>
        </PageSection>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Tax Configuration"
        subtitle="Manage tax categories and rates"
        actions={
          <Button onClick={() => openCategoryDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        }
      />

      <PageSection>
        <VStack gap="xl">
          {categories.map((category) => (
            <Card key={category.id} variant="elevated">
              <CardContent>
                <VStack gap="lg">
                  {/* Category Header */}
                  <HStack justify="between" align="start">
                    <div className="flex-1">
                      <HStack gap="md" align="center">
                        <Heading size="lg">{category.name}</Heading>
                        {category.isDefault && (
                          <Badge variant="success">Default</Badge>
                        )}
                      </HStack>
                      <Text size="sm" color="muted" className="mt-1">
                        Code: {category.code}
                      </Text>
                      {category.description && (
                        <Text size="sm" className="mt-2">{category.description}</Text>
                      )}
                    </div>
                    <HStack gap="sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCategoryDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </HStack>
                  </HStack>

                  {/* Tax Rates */}
                  <div className="border-t pt-4">
                    <HStack justify="between" align="center" className="mb-4">
                      <Text weight="medium">Tax Rates</Text>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRateDialog(undefined, category.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Rate
                      </Button>
                    </HStack>

                    {category.taxRates.length === 0 ? (
                      <Text size="sm" color="muted">No tax rates configured</Text>
                    ) : (
                      <div className="space-y-2">
                        {category.taxRates.map((rate) => (
                          <div
                            key={rate.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <HStack gap="md" align="center">
                                <Text weight="medium">{rate.name}</Text>
                                <Badge variant="primary">
                                  <Percent className="h-3 w-3 mr-1" />
                                  {rate.rate}%
                                </Badge>
                                <Badge variant="secondary">{rate.taxType}</Badge>
                                {rate.isDefault && (
                                  <Badge variant="success">Default</Badge>
                                )}
                                {rate.isCompound && (
                                  <Badge variant="warning">Compound</Badge>
                                )}
                              </HStack>
                              <Text size="sm" color="muted" className="mt-1">
                                Code: {rate.code} | Applies to: {rate.appliesTo}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRateDialog(rate)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </VStack>
              </CardContent>
            </Card>
          ))}
        </VStack>
      </PageSection>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Tax Category' : 'Create Tax Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-code">Code</Label>
              <Input
                id="category-code"
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                placeholder="e.g., STANDARD"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Standard Tax"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="category-default"
                checked={categoryForm.isDefault}
                onChange={(e) => setCategoryForm({ ...categoryForm, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="category-default">Set as default category</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Edit Tax Rate' : 'Create Tax Rate'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate-code">Code</Label>
                <Input
                  id="rate-code"
                  value={rateForm.code}
                  onChange={(e) => setRateForm({ ...rateForm, code: e.target.value })}
                  placeholder="e.g., UAE_VAT_5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate-name">Name</Label>
                <Input
                  id="rate-name"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  placeholder="e.g., UAE VAT 5%"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate-percentage">Rate (%)</Label>
                <Input
                  id="rate-percentage"
                  type="number"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate-category">Category</Label>
                <select
                  id="rate-category"
                  value={rateForm.categoryId}
                  onChange={(e) => setRateForm({ ...rateForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate-type">Tax Type</Label>
                <select
                  id="rate-type"
                  value={rateForm.taxType}
                  onChange={(e) => setRateForm({ ...rateForm, taxType: e.target.value as TaxType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={TaxType.SALES}>Sales</option>
                  <option value={TaxType.PURCHASE}>Purchase</option>
                  <option value={TaxType.WITHHOLDING}>Withholding</option>
                  <option value={TaxType.EXCISE}>Excise</option>
                  <option value={TaxType.CUSTOMS}>Customs</option>
                  <option value={TaxType.SERVICE}>Service</option>
                  <option value={TaxType.OTHER}>Other</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate-applies">Applies To</Label>
                <select
                  id="rate-applies"
                  value={rateForm.appliesTo}
                  onChange={(e) => setRateForm({ ...rateForm, appliesTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ALL">All Items</option>
                  <option value="PRODUCTS">Products Only</option>
                  <option value="SERVICES">Services Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate-effective-from">Effective From</Label>
                <Input
                  id="rate-effective-from"
                  type="date"
                  value={rateForm.effectiveFrom}
                  onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate-effective-to">Effective To (Optional)</Label>
                <Input
                  id="rate-effective-to"
                  type="date"
                  value={rateForm.effectiveTo}
                  onChange={(e) => setRateForm({ ...rateForm, effectiveTo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rate-description">Description</Label>
              <Input
                id="rate-description"
                value={rateForm.description}
                onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rate-default"
                  checked={rateForm.isDefault}
                  onChange={(e) => setRateForm({ ...rateForm, isDefault: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="rate-default">Set as default rate for this tax type</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rate-compound"
                  checked={rateForm.isCompound}
                  onChange={(e) => setRateForm({ ...rateForm, isCompound: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="rate-compound">Compound tax (tax on tax)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingRate ? handleUpdateRate : handleCreateRate}>
              {editingRate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}