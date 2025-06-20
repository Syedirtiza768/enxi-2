'use client'

import { useState, useEffect } from 'react'
import { 
  Container,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardContent,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Switch
} from '@/components/design-system'
import { Save, Building, Globe, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'

interface CompanySettings {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
  defaultCurrency: string
  defaultInventoryAccountId?: string | null
  defaultCogsAccountId?: string | null
  defaultSalesAccountId?: string | null
  defaultTrackInventory?: boolean
}

interface Currency {
  code: string
  name: string
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'EnXi ERP',
    defaultCurrency: 'USD'
  })
  const [supportedCurrencies, setSupportedCurrencies] = useState<Currency[]>([
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'PKR', name: 'Pakistani Rupee' }
  ])
  const [accounts, setAccounts] = useState<{
    inventory: Account[]
    cogs: Account[]
    sales: Account[]
  }>({
    inventory: [],
    cogs: [],
    sales: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Load existing settings
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      loadSettings()
    }
  }, [])

  const loadSettings = async (): Promise<void> => {
    try {
      setLoading(true)
      
      // Load company settings and GL accounts in parallel
      const [settingsResponse, accountsResponse] = await Promise.all([
        apiClient('/api/settings/company'),
        apiClient('/api/accounting/accounts')
      ])

      if (!settingsResponse.ok) {
        if (settingsResponse.status === 401) {
          setError('Your session has expired. Please log in again.')
          // Optionally redirect to login
          window.location.href = '/login'
          return
        }
        throw new Error(settingsResponse.error || 'Failed to load settings')
      }

      const data = settingsResponse.data
      console.log('Settings response data:', data)
      
      // Handle both direct settings and nested settings response
      const settingsData = data.settings || data
      setSettings(settingsData || {
        companyName: 'EnXi ERP',
        defaultCurrency: 'USD'
      })
      setSupportedCurrencies(data.supportedCurrencies || [])

      // Process GL accounts
      if (accountsResponse.ok && accountsResponse.data) {
        // Ensure we have a valid array of accounts
        const accountsData = accountsResponse.data.data || accountsResponse.data
        const allAccounts = Array.isArray(accountsData) ? accountsData : []
        
        // Filter accounts more specifically for GL defaults
        const inventoryAccounts = allAccounts.filter((acc: Account) => 
          acc.type === 'ASSET' && 
          (acc.code.startsWith('13') || // Inventory accounts (1300-1399)
           acc.name.toLowerCase().includes('inventory') ||
           acc.name.toLowerCase().includes('stock') ||
           acc.name.toLowerCase().includes('raw material') ||
           acc.name.toLowerCase().includes('finished goods'))
        )
        
        const cogsAccounts = allAccounts.filter((acc: Account) => 
          acc.type === 'EXPENSE' && 
          (acc.code.startsWith('51') || // COGS accounts (5100-5199)
           acc.name.toLowerCase().includes('cost of goods') ||
           acc.name.toLowerCase().includes('cogs') ||
           acc.name.toLowerCase().includes('product cost'))
        )
        
        const salesAccounts = allAccounts.filter((acc: Account) => 
          acc.type === 'INCOME' && 
          (acc.code.startsWith('41') || // Sales accounts (4100-4199)
           acc.name.toLowerCase().includes('sales') ||
           acc.name.toLowerCase().includes('product sales') ||
           acc.name.toLowerCase().includes('revenue') ||
           acc.code === '4100' || // Specifically include Sales Revenue
           acc.code === '4110') // Specifically include Product Sales
        )
        
        // If specific accounts not found, fall back to broader categories
        setAccounts({
          inventory: inventoryAccounts.length > 0 ? inventoryAccounts : allAccounts.filter((acc: Account) => acc.type === 'ASSET'),
          cogs: cogsAccounts.length > 0 ? cogsAccounts : allAccounts.filter((acc: Account) => acc.type === 'EXPENSE'),
          sales: salesAccounts.length > 0 ? salesAccounts : allAccounts.filter((acc: Account) => acc.type === 'INCOME')
        })
        
        console.log('Filtered accounts:', {
          inventory: inventoryAccounts.length,
          cogs: cogsAccounts.length,
          sales: salesAccounts.length,
          totalAccounts: allAccounts.length
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('Failed to load company settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true)
      setError(null)

      // Clean up the settings data before sending
      const cleanedSettings = {
        ...settings,
        // Convert empty strings to null for optional fields
        address: settings.address || null,
        phone: settings.phone || null,
        email: settings.email || null,
        website: settings.website || null,
        logoUrl: settings.logoUrl || null,
        defaultInventoryAccountId: settings.defaultInventoryAccountId || null,
        defaultCogsAccountId: settings.defaultCogsAccountId || null,
        defaultSalesAccountId: settings.defaultSalesAccountId || null
      }

      console.log('Settings before cleaning:', settings)
      console.log('Cleaned settings being sent:', cleanedSettings)

      const response = await apiClient('/api/settings/company', {
        method: 'PUT',
        body: JSON.stringify(cleanedSettings)
      })

      if (!response.ok) {
        console.error('Save failed - Response:', response)
        throw new Error(response.error || 'Failed to save settings')
      }

      const updatedSettings = response.data
      console.log('Settings received from server:', updatedSettings)
      setSettings(updatedSettings)
      setSaved(true)
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('companySettingsChanged', { 
        detail: updatedSettings 
      }))

      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      setError(null)

      // Log file info for debugging
      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const formData = new FormData()
      formData.append('file', file)

      // Use fetch directly to bypass any apiClient issues
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/company/logo', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData,
        credentials: 'include'
      })

      const responseData = await response.json()
      
      if (!response.ok) {
        console.error('Upload failed:', responseData)
        throw new Error(responseData.error || 'Failed to upload logo')
      }

      setSettings(prev => ({
        ...prev,
        logoUrl: responseData.url
      }))
    } catch (error: any) {
      console.error('Logo upload error:', error)
      setError(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const removeLogo = () => {
    setSettings(prev => ({
      ...prev,
      logoUrl: null
    }))
  }

  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <Container size="lg" padding="lg">
        <VStack gap="xl" className="py-6">
          <VStack gap="sm">
            <Heading as="h1" className="text-2xl">Company Settings</Heading>
            <Text color="secondary">Loading...</Text>
          </VStack>
        </VStack>
      </Container>
    )
  }

  return (
    <Container size="lg" padding="lg">
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <VStack gap="sm">
          <Heading as="h1" className="text-2xl">Company Settings</Heading>
          <Text color="secondary">
            Configure your company information and preferences
          </Text>
        </VStack>

        {/* Error Alert */}
        {error && (
          <Card variant="subtle" padding="md" className="w-full max-w-2xl border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent>
              <Text color="error">{error}</Text>
            </CardContent>
          </Card>
        )}

        {/* Settings Form */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <HStack gap="md" align="center">
              <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-[var(--radius-lg)]">
                <Building className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
              </div>
              <VStack gap="xs">
                <Heading as="h2">Company Information</Heading>
                <Text size="sm" color="secondary">
                  This information will appear throughout the application
                </Text>
              </VStack>
            </HStack>
          </CardHeader>

          <CardContent className="pt-6">
            <VStack gap="lg">
              <Input
                label="Company Name"
                type="text"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter your company name"
                required
                fullWidth
              />

              <Input
                label="Address"
                type="text"
                value={settings.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter company address (optional)"
                fullWidth
              />

              <HStack gap="md" className="w-full">
                <Input
                  label="Phone"
                  type="tel"
                  value={settings.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Company phone number"
                  fullWidth
                />

                <Input
                  label="Email"
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Company email address"
                  fullWidth
                />
              </HStack>

              <Input
                label="Website"
                type="url"
                value={settings.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourcompany.com"
                fullWidth
              />

              {/* Logo Upload Section */}
              <div className="w-full">
                <Text size="sm" weight="medium" className="mb-2">
                  Company Logo
                </Text>
                <div className="flex items-center gap-4">
                  {settings.logoUrl ? (
                    <div className="relative">
                      <div className="w-32 h-32 relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <Image
                          src={settings.logoUrl}
                          alt="Company Logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-800 shadow-sm"
                        onClick={removeLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                      id="logo-upload"
                    />
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<Upload />}
                      loading={uploadingLogo}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    <Text size="xs" color="secondary" className="mt-2">
                      Recommended: 200x200px, Max 5MB, PNG or JPG
                    </Text>
                  </div>
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <HStack gap="md" align="center">
              <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-[var(--radius-lg)]">
                <Globe className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
              </div>
              <VStack gap="xs">
                <Heading as="h2">Currency Settings</Heading>
                <Text size="sm" color="secondary">
                  Set the default currency for your organization
                </Text>
              </VStack>
            </HStack>
          </CardHeader>

          <CardContent className="pt-6">
            <Select
              label="Default Currency"
              value={settings.defaultCurrency}
              onChange={(e) => handleInputChange('defaultCurrency', e.target.value)}
              fullWidth
              options={supportedCurrencies && supportedCurrencies.length > 0 
                ? supportedCurrencies.map(currency => ({
                    value: currency.code,
                    label: `${currency.code} - ${currency.name}`
                  }))
                : [{ value: 'USD', label: 'USD - US Dollar' }]
              }
            />
          </CardContent>
        </Card>

        {/* Default GL Accounts */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <HStack gap="md" align="center">
              <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-[var(--radius-lg)]">
                <Building className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
              </div>
              <VStack gap="xs">
                <Heading as="h2">Default GL Accounts</Heading>
                <Text size="sm" color="secondary">
                  Set default accounts for new inventory items
                </Text>
              </VStack>
            </HStack>
          </CardHeader>

          <CardContent className="pt-6">
            <VStack gap="lg">
              <Select
                label="Default Inventory Account"
                value={settings.defaultInventoryAccountId || ''}
                onChange={(e) => handleInputChange('defaultInventoryAccountId', e.target.value)}
                fullWidth
                options={[
                  { value: '', label: 'Select an account...' },
                  ...accounts.inventory.map(account => ({
                    value: account.id,
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
              />

              <Select
                label="Default COGS Account"
                value={settings.defaultCogsAccountId || ''}
                onChange={(e) => handleInputChange('defaultCogsAccountId', e.target.value)}
                fullWidth
                options={[
                  { value: '', label: 'Select an account...' },
                  ...accounts.cogs.map(account => ({
                    value: account.id,
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
              />

              <Select
                label="Default Sales Account"
                value={settings.defaultSalesAccountId || ''}
                onChange={(e) => handleInputChange('defaultSalesAccountId', e.target.value)}
                fullWidth
                options={[
                  { value: '', label: 'Select an account...' },
                  ...accounts.sales.map(account => ({
                    value: account.id,
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
              />

              <div className="w-full">
                <Switch
                  label="Track inventory by default"
                  checked={settings.defaultTrackInventory ?? true}
                  onChange={(checked) => handleInputChange('defaultTrackInventory', checked)}
                  description="New items will have inventory tracking enabled by default"
                />
              </div>

              <Text size="sm" color="secondary">
                These accounts will be automatically selected when creating new inventory items.
              </Text>
            </VStack>
          </CardContent>
        </Card>

        {/* Save Button */}
        <HStack justify="end" className="w-full max-w-2xl">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Save />}
            onClick={handleSave}
            loading={saving}
            disabled={!settings.companyName.trim()}
          >
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </HStack>

        {/* Help Text */}
        <Card variant="subtle" padding="md" className="w-full max-w-2xl">
          <CardContent>
            <VStack gap="sm">
              <Text size="sm" weight="medium">
                💡 Quick Tips
              </Text>
              <Text size="sm" color="secondary">
                • The company name will appear in the header bar and can be changed at any time
              </Text>
              <Text size="sm" color="secondary">
                • The default currency will be used throughout the application for new transactions
              </Text>
              <Text size="sm" color="secondary">
                • Changing the currency will not affect existing transactions
              </Text>
            </VStack>
          </CardContent>
        </Card>
      </VStack>
    </Container>
  )
}