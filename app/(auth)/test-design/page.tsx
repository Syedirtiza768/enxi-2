'use client'

import { Button, Card, CardContent, Container, Heading, Text, ThemeToggle, VStack } from '@/components/design-system'

export default function TestDesignPage(): React.JSX.Element {
  return (
    <Container size="lg" padding="lg">
      <VStack gap="xl" className="py-8">
        <div className="flex justify-between items-center">
          <Heading as="h1">Design System Test</Heading>
          <ThemeToggle variant="dropdown" />
        </div>

        <Card variant="elevated" padding="lg">
          <CardContent>
            <VStack gap="md">
              <Text size="lg">
                This is a simple test page to verify the design system is working correctly.
              </Text>
              <Text color="secondary">
                Try toggling between light and dark themes using the button above.
              </Text>
              <div className="flex gap-4 mt-4">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
              </div>
            </VStack>
          </CardContent>
        </Card>
      </VStack>
    </Container>
  )
}