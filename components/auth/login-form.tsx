'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  Heading,
  Text,
  VStack,
  Badge
} from '@/components/design-system'
import { Mail, Lock, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const data = {
      username: formData.username.trim(),
      password: formData.password.trim(),
    }

    // Basic validation
    if (!data.username || !data.password) {
      setError('Please enter both username and password')
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Login failed')
        return
      }

      // Store token as backup and redirect
      localStorage.setItem('token', result.token)
      router.push('/dashboard')
      
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="elevated" padding="none" className="w-full shadow-2xl border-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm">
      <CardHeader border={false} className="pb-2">
        <VStack gap="md" align="center">
          <Heading as="h2" size="lg" className="text-center">
            Welcome Back
          </Heading>
          <Text color="secondary" size="sm" className="text-center max-w-xs">
            Enter your credentials to access the ERP system
          </Text>
          {process.env.NODE_ENV === 'development' && (
            <Badge variant="info" size="sm" className="mt-1">
              Dev: admin@enxi.com / Admin123!
            </Badge>
          )}
        </VStack>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="px-8 py-6">
          <VStack gap="xl">
            <VStack gap="lg">
              <Input
                label="Username or Email"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter your username or email"
                leftIcon={<Mail className="h-4 w-4" />}
                disabled={isLoading}
                autoComplete="username"
                required
                fullWidth
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--color-primary-500)]/20"
              />
              
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                disabled={isLoading}
                autoComplete="current-password"
                required
                fullWidth
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--color-primary-500)]/20"
              />
            </VStack>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-[var(--color-semantic-error-50)] dark:bg-[var(--color-semantic-error-950)]/50 rounded-[var(--radius-lg)] border border-[var(--color-semantic-error-200)] dark:border-[var(--color-semantic-error-800)]">
                <AlertCircle className="h-5 w-5 text-[var(--color-semantic-error-600)] mt-0.5 flex-shrink-0" />
                <Text size="sm" color="error" className="leading-relaxed">
                  {error}
                </Text>
              </div>
            )}
          </VStack>
        </CardContent>
        
        <CardFooter className="px-8 pb-8 pt-2">
          <VStack gap="md" className="w-full">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              className="h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? 'Logging in...' : 'Sign In'}
            </Button>
            
            <div className="text-center">
              <Text size="xs" color="tertiary">
                Need help? Contact your system administrator
              </Text>
            </div>
          </VStack>
        </CardFooter>
      </form>
    </Card>
  )
}