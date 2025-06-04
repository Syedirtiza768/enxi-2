import { LoginForm } from '@/components/auth/login-form'
import { Container, VStack, Text, Logo } from '@/components/design-system'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
      <Container size="sm" padding="md">
        <VStack gap="xl" align="center">
          <div className="text-center">
            <div 
              className="mb-6 w-full max-w-[300px] h-20 mx-auto"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Logo size="stretch" priority className="w-full h-full" />
            </div>
            <Text size="lg" color="secondary" className="mb-4">
              Comprehensive Business Management System
            </Text>
          </div>
          <div className="w-full">
            <LoginForm />
          </div>
        </VStack>
      </Container>
    </div>
  )
}