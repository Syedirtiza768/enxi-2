import { LoginForm } from '@/components/auth/login-form'
import { Container, VStack, Text, Logo } from '@/components/design-system'

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-tertiary)] p-4">
      <Container size="sm" padding="none" className="w-full max-w-md">
        <VStack gap="2xl" align="center" className="w-full">
          {/* Header Section */}
          <div className="text-center w-full">
            <VStack gap="lg" align="center">
              <div className="w-full max-w-[200px] h-16 mx-auto mb-2">
                <Logo size="stretch" priority className="w-full h-full" />
              </div>
              <VStack gap="sm" align="center">
                <Text size="xl" weight="semibold" color="primary" className="font-medium">
                  Welcome to Enxi ERP
                </Text>
                <Text size="md" color="secondary" className="max-w-sm text-center leading-relaxed">
                  Comprehensive Business Management System
                </Text>
              </VStack>
            </VStack>
          </div>

          {/* Login Form Section */}
          <div className="w-full">
            <LoginForm />
          </div>

          {/* Footer Section */}
          <div className="text-center">
            <Text size="sm" color="tertiary">
              © 2024 Enxi. All rights reserved.
            </Text>
          </div>
        </VStack>
      </Container>
    </div>
  )
}