'use client'

import { useState, useEffect } from 'react'
import { useCurrency } from '@/lib/contexts/currency-context'
import { Container, VStack, Card, CardHeader, CardContent, Heading, Text, Button } from '@/components/design-system'
import { RefreshCw } from 'lucide-react'

export default function TestCurrencyPage() {
  const { defaultCurrency, formatCurrency, supportedCurrencies, refreshSettings } = useCurrency()
  const [testAmounts] = useState([100, 1000, 5000, 10000, 50000])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Initialize the date on client side only to avoid hydration mismatch
  useEffect(() => {
    setLastUpdate(new Date())
  }, [])

  // Listen for company settings changes
  useEffect(() => {
    const handleSettingsChange = () => {
      setLastUpdate(new Date())
    }

    window.addEventListener('companySettingsChanged', handleSettingsChange)
    return () => {
      window.removeEventListener('companySettingsChanged', handleSettingsChange)
    }
  }, [])

  return (
    <Container size="lg" padding="lg">
      <VStack gap="xl" className="py-6">
        <VStack gap="sm">
          <Heading as="h1" className="text-2xl">Currency Settings Test</Heading>
          <Text color="secondary">
            This page shows how currency settings affect the system in real-time
          </Text>
        </VStack>

        {/* Current Settings */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <Heading as="h2">Current Currency Settings</Heading>
          </CardHeader>
          <CardContent className="pt-6">
            <VStack gap="md">
              <div className="flex justify-between">
                <Text weight="medium">Default Currency:</Text>
                <Text className="text-2xl font-bold text-blue-600">{defaultCurrency}</Text>
              </div>
              <div className="flex justify-between">
                <Text weight="medium">Last Update:</Text>
                <Text>{lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}</Text>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw />}
                onClick={() => {
                  refreshSettings()
                  setLastUpdate(new Date())
                }}
              >
                Refresh Settings
              </Button>
            </VStack>
          </CardContent>
        </Card>

        {/* Sample Amounts */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <Heading as="h2">Sample Amount Formatting</Heading>
          </CardHeader>
          <CardContent className="pt-6">
            <VStack gap="md">
              {testAmounts.map(amount => (
                <div key={amount} className="flex justify-between p-3 bg-gray-50 rounded">
                  <Text>Raw value: {amount}</Text>
                  <Text weight="bold" className="text-lg">
                    {formatCurrency(amount)}
                  </Text>
                </div>
              ))}
            </VStack>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card variant="subtle" padding="md" className="w-full max-w-2xl">
          <CardContent>
            <VStack gap="sm">
              <Text size="sm" weight="medium">
                🧪 Test Instructions:
              </Text>
              <Text size="sm" color="secondary">
                1. Open Company Settings in another tab: <a href="/settings/company" target="_blank" className="text-blue-600 underline">/settings/company</a>
              </Text>
              <Text size="sm" color="secondary">
                2. Change the default currency (e.g., from AED to USD or EUR)
              </Text>
              <Text size="sm" color="secondary">
                3. Save the settings
              </Text>
              <Text size="sm" color="secondary">
                4. Watch this page - the currency symbol should update automatically without refresh!
              </Text>
            </VStack>
          </CardContent>
        </Card>

        {/* Available Currencies */}
        <Card variant="elevated" padding="xl" className="w-full max-w-2xl">
          <CardHeader border>
            <Heading as="h2">Available Currencies</Heading>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-3">
              {supportedCurrencies.map(currency => (
                <div 
                  key={currency.code} 
                  className={`p-3 border rounded ${currency.code === defaultCurrency ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  <Text weight={currency.code === defaultCurrency ? 'bold' : 'normal'}>
                    {currency.code} - {currency.name}
                  </Text>
                  <Text size="sm" color="secondary">
                    Example: {formatCurrency(1234.56, currency.code)}
                  </Text>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </VStack>
    </Container>
  )
}