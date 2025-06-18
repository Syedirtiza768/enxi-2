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
  Select
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
}

interface Currency {
  code: string
  name: string
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
      
      const response = await apiClient('/api/settings/company')

      if (!response.ok) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.')
          // Optionally redirect to login
          window.location.href = '/login'
          return
        }
        throw new Error(response.error || 'Failed to load settings')
      }

      const data = response.data
      setSettings(data.settings || {
        companyName: 'EnXi ERP',
        defaultCurrency: 'USD'
      })
      setSupportedCurrencies(data.supportedCurrencies || [])
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

      const response = await apiClient('/api/settings/company', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to save settings')
      }

      const updatedSettings = response.data
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