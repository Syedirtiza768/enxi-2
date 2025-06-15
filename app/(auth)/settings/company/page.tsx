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
import { Save, Building, DollarSign } from 'lucide-react'

interface CompanySettings {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
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
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.warn('No authentication token found')
        setError('Please log in to access company settings')
        setLoading(false)
        return
      }

      const response = await fetch('/api/settings/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.')
          // Optionally redirect to login
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load settings')
      }

      const data = await response.json()
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

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to save settings')
        setSaving(false)
        return
      }

      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      const updatedSettings = await response.json()
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
            </VStack>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <HStack gap="md" align="center">
              <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-[var(--radius-lg)]">
                <DollarSign className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
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