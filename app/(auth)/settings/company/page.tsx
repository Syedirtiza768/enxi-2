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
  Input
} from '@/components/design-system'
import { Save, Building } from 'lucide-react'

interface CompanySettings {
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
}

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    name: 'EnXi ERP'
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load existing settings
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedName = localStorage.getItem('companyName')
        const savedAddress = localStorage.getItem('companyAddress')
        const savedPhone = localStorage.getItem('companyPhone')
        const savedEmail = localStorage.getItem('companyEmail')
        const savedWebsite = localStorage.getItem('companyWebsite')

        setSettings({
          name: savedName || 'EnXi ERP',
          address: savedAddress || '',
          phone: savedPhone || '',
          email: savedEmail || '',
          website: savedWebsite || ''
        })
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem('companyName', settings.name)
      if (settings.address) localStorage.setItem('companyAddress', settings.address)
      if (settings.phone) localStorage.setItem('companyPhone', settings.phone)
      if (settings.email) localStorage.setItem('companyEmail', settings.email)
      if (settings.website) localStorage.setItem('companyWebsite', settings.website)

      setSaved(true)
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('companySettingsChanged', { 
        detail: settings 
      }))

      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Container size="lg" padding="lg">
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <VStack gap="sm">
          <Heading as="h1" className="text-2xl">Company Settings</Heading>
          <Text color="secondary">
            Configure your company information and branding
          </Text>
        </VStack>

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
                  This information will appear in the header and throughout the application
                </Text>
              </VStack>
            </HStack>
          </CardHeader>

          <CardContent className="pt-6">
            <VStack gap="lg">
              <Input
                label="Company Name"
                type="text"
                value={settings.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
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

              <HStack justify="end" className="pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Save />}
                  onClick={handleSave}
                  loading={loading}
                  disabled={!settings.name.trim()}
                >
                  {saved ? 'Saved!' : loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </HStack>
            </VStack>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card variant="subtle" padding="md" className="w-full max-w-2xl">
          <CardContent>
            <VStack gap="sm">
              <Text size="sm" weight="medium">
                💡 Quick Tip
              </Text>
              <Text size="sm" color="secondary">
                The company name will appear in the header bar and can be changed at any time. 
                Other company information is optional but helps personalize your ERP experience.
              </Text>
            </VStack>
          </CardContent>
        </Card>
      </VStack>
    </Container>
  )
}