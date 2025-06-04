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
  const router = useRouter()
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
      
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="elevated" padding="xl" className="w-full max-w-md">
      <CardHeader border>
        <VStack gap="sm">
          <Heading as="h2">Welcome Back</Heading>
          <Text color="secondary">
            Enter your credentials to access the ERP system
          </Text>
          {process.env.NODE_ENV === 'development' && (
            <Badge variant="info" size="sm" className="mt-2">
              Dev: admin@enxi.com / Admin123!
            </Badge>
          )}
        </VStack>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <VStack gap="lg">
            <Input
              label="Username or Email"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter your username or email"
              leftIcon={<Mail />}
              disabled={isLoading}
              autoComplete="username"
              required
              fullWidth
            />
            
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              leftIcon={<Lock />}
              disabled={isLoading}
              autoComplete="current-password"
              required
              fullWidth
            />

            {error && (
              <div className="flex items-center gap-2 p-3 bg-[var(--color-semantic-error-50)] dark:bg-[var(--color-semantic-error-950)] rounded-[var(--radius-lg)]">
                <AlertCircle className="h-5 w-5 text-[var(--color-semantic-error-600)]" />
                <Text size="sm" color="error">
                  {error}
                </Text>
              </div>
            )}
          </VStack>
        </CardContent>
        
        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}