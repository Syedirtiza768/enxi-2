'use client'

import React from 'react'
import {
  Container,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  RadioGroup,
  Switch,
  Badge,
  ThemeToggle,
  SimpleModal,
  Logo
} from '@/components/design-system'
import { 
  ArrowRight, 
  Download, 
  Plus,
  Mail,
  Lock,
  User,
  Settings,
  CheckCircle
} from 'lucide-react'

export default function DesignSystemPage(): React.JSX.Element {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    name: '',
    role: '',
    bio: '',
    subscribe: false,
    notifications: 'email',
    theme: false
  })

  return (
    <Container size="2xl" padding="lg">
      <VStack gap="xl" className="py-8">
        {/* Header */}
        <div className="text-center">
          <Heading as="h1" className="mb-4">
            Enxi ERP Design System
          </Heading>
          <Text size="lg" color="secondary">
            A comprehensive design system for enterprise-grade business software
          </Text>
        </div>

        {/* Theme Toggle */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Theme Settings</Heading>
            <ThemeToggle variant="dropdown" />
          </CardHeader>
          <CardContent>
            <Text>
              The design system supports light and dark themes with automatic system preference detection.
              All components automatically adapt to the selected theme.
            </Text>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Logo</Heading>
          </CardHeader>
          <CardContent>
            <VStack gap="lg">
              <Text>
                The EnXi logo is available in multiple sizes and automatically adapts to the current theme.
              </Text>
              
              <div>
                <Text weight="medium" className="mb-3">Logo Sizes</Text>
                <VStack gap="md" align="start">
                  <div className="flex items-center gap-4">
                    <Logo size="sm" />
                    <Text size="sm" color="secondary">Small (24px)</Text>
                  </div>
                  <div className="flex items-center gap-4">
                    <Logo size="md" />
                    <Text size="sm" color="secondary">Medium (32px)</Text>
                  </div>
                  <div className="flex items-center gap-4">
                    <Logo size="lg" />
                    <Text size="sm" color="secondary">Large (40px)</Text>
                  </div>
                  <div className="flex items-center gap-4">
                    <Logo size="xl" />
                    <Text size="sm" color="secondary">Extra Large (64px)</Text>
                  </div>
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-48 h-12 border border-[var(--border-primary)] rounded">
                      <Logo size="stretch" />
                    </div>
                    <Text size="sm" color="secondary">Stretch (fills container)</Text>
                  </div>
                </VStack>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Typography</Heading>
          </CardHeader>
          <CardContent>
            <VStack gap="md">
              <Heading as="h1">Heading 1</Heading>
              <Heading as="h2">Heading 2</Heading>
              <Heading as="h3">Heading 3</Heading>
              <Heading as="h4">Heading 4</Heading>
              <Heading as="h5">Heading 5</Heading>
              <Heading as="h6">Heading 6</Heading>
              
              <div className="border-t border-[var(--border-primary)] pt-4 mt-2">
                <Text size="xl">Extra Large Text</Text>
                <Text size="lg">Large Text</Text>
                <Text size="base">Base Text (Default)</Text>
                <Text size="sm">Small Text</Text>
                <Text size="xs">Extra Small Text</Text>
              </div>

              <div className="border-t border-[var(--border-primary)] pt-4 mt-2">
                <Text color="primary">Primary Text Color</Text>
                <Text color="secondary">Secondary Text Color</Text>
                <Text color="tertiary">Tertiary Text Color</Text>
                <Text color="muted">Muted Text Color</Text>
                <Text color="brand">Brand Text Color</Text>
                <Text color="success">Success Text Color</Text>
                <Text color="warning">Warning Text Color</Text>
                <Text color="error">Error Text Color</Text>
                <Text color="info">Info Text Color</Text>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Buttons</Heading>
          </CardHeader>
          <CardContent>
            <VStack gap="lg">
              {/* Button Variants */}
              <div>
                <Text weight="medium" className="mb-3">Variants</Text>
                <HStack gap="md" wrap>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                </HStack>
              </div>

              {/* Button Sizes */}
              <div>
                <Text weight="medium" className="mb-3">Sizes</Text>
                <HStack gap="md" wrap align="center">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </HStack>
              </div>

              {/* Button States */}
              <div>
                <Text weight="medium" className="mb-3">States</Text>
                <HStack gap="md" wrap>
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                </HStack>
              </div>

              {/* Button with Icons */}
              <div>
                <Text weight="medium" className="mb-3">With Icons</Text>
                <HStack gap="md" wrap>
                  <Button leftIcon={<Plus />}>Add Item</Button>
                  <Button rightIcon={<ArrowRight />}>Continue</Button>
                  <Button variant="outline" leftIcon={<Download />}>Download</Button>
                  <Button variant="ghost" size="sm">
                    <Settings />
                  </Button>
                </HStack>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Form Elements</Heading>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e): void => e.preventDefault()}>
              <VStack gap="lg">
                <Grid cols={{ xs: 1, md: 2 }} gap="lg">
                  <GridItem>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e): void => setFormData({ ...formData, email: e.target.value })}
                      leftIcon={<Mail />}
                      required
                    />
                  </GridItem>
                  <GridItem>
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e): void => setFormData({ ...formData, password: e.target.value })}
                      leftIcon={<Lock />}
                      hint="Must be at least 8 characters"
                      required
                    />
                  </GridItem>
                  <GridItem>
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e): void => setFormData({ ...formData, name: e.target.value })}
                      leftIcon={<User />}
                    />
                  </GridItem>
                  <GridItem>
                    <Select
                      label="Role"
                      options={[
                        { value: 'admin', label: 'Administrator' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'user', label: 'User' },
                        { value: 'guest', label: 'Guest', disabled: true }
                      ]}
                      value={formData.role}
                      onChange={(e): void => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Select a role"
                    />
                  </GridItem>
                </Grid>

                <Textarea
                  label="Bio"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e): void => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  showCount
                  maxLength={200}
                  hint="Brief description about yourself"
                />

                <div className="border-t border-[var(--border-primary)] pt-4 w-full">
                  <VStack gap="md">
                    <Checkbox
                      label="Subscribe to newsletter"
                      checked={formData.subscribe}
                      onChange={(e): void => setFormData({ ...formData, subscribe: e.target.checked })}
                      hint="Get weekly updates about new features"
                    />

                    <RadioGroup
                      name="notifications"
                      label="Notification Preferences"
                      value={formData.notifications}
                      onChange={(value): void => setFormData({ ...formData, notifications: value })}
                      options={[
                        { value: 'email', label: 'Email notifications' },
                        { value: 'sms', label: 'SMS notifications' },
                        { value: 'none', label: 'No notifications' }
                      ]}
                    />

                    <Switch
                      label="Enable dark mode"
                      checked={formData.theme}
                      onChange={(checked): void => setFormData({ ...formData, theme: checked })}
                    />
                  </VStack>
                </div>

                {/* Form with errors */}
                <div className="border-t border-[var(--border-primary)] pt-4 w-full">
                  <Text weight="medium" className="mb-3">Form Validation States</Text>
                  <VStack gap="md">
                    <Input
                      label="Username"
                      value="admin"
                      onChange={(): void => {}} // Read-only for demo
                      error="This username is already taken"
                      readOnly
                    />
                    <Select
                      label="Country"
                      options={[{ value: 'us', label: 'United States' }]}
                      value=""
                      onChange={(): void => {}} // Read-only for demo
                      error="Please select your country"
                    />
                    <Textarea
                      label="Message"
                      value=""
                      onChange={(): void => {}} // Read-only for demo
                      error="Message is required"
                      readOnly
                    />
                  </VStack>
                </div>
              </VStack>
            </form>
          </CardContent>
          <CardFooter border>
            <Button variant="outline">Cancel</Button>
            <Button variant="primary">Save Changes</Button>
          </CardFooter>
        </Card>

        {/* Badges */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Badges</Heading>
          </CardHeader>
          <CardContent>
            <VStack gap="lg">
              <div>
                <Text weight="medium" className="mb-3">Solid Badges</Text>
                <HStack gap="md" wrap>
                  <Badge>Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </HStack>
              </div>

              <div>
                <Text weight="medium" className="mb-3">Outline Badges</Text>
                <HStack gap="md" wrap>
                  <Badge outline>Default</Badge>
                  <Badge variant="primary" outline>Primary</Badge>
                  <Badge variant="secondary" outline>Secondary</Badge>
                  <Badge variant="success" outline>Success</Badge>
                  <Badge variant="warning" outline>Warning</Badge>
                  <Badge variant="error" outline>Error</Badge>
                  <Badge variant="info" outline>Info</Badge>
                </HStack>
              </div>

              <div>
                <Text weight="medium" className="mb-3">With Dot</Text>
                <HStack gap="md" wrap>
                  <Badge variant="success" dot>Active</Badge>
                  <Badge variant="warning" dot>Pending</Badge>
                  <Badge variant="error" dot>Offline</Badge>
                  <Badge variant="info" dot>In Progress</Badge>
                </HStack>
              </div>

              <div>
                <Text weight="medium" className="mb-3">Sizes</Text>
                <HStack gap="md" wrap align="center">
                  <Badge size="xs">Extra Small</Badge>
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                  <Badge size="lg">Large</Badge>
                </HStack>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Cards</Heading>
          </CardHeader>
          <CardContent>
            <Grid cols={{ xs: 1, md: 2, lg: 3 }} gap="lg">
              <GridItem>
                <Card variant="default" hoverable>
                  <CardHeader>
                    <Heading as="h4">Default Card</Heading>
                  </CardHeader>
                  <CardContent>
                    <Text>This is a default card with hover effect.</Text>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem>
                <Card variant="outlined">
                  <CardHeader>
                    <Heading as="h4">Outlined Card</Heading>
                  </CardHeader>
                  <CardContent>
                    <Text>This is an outlined card variant.</Text>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem>
                <Card variant="elevated">
                  <CardHeader>
                    <Heading as="h4">Elevated Card</Heading>
                  </CardHeader>
                  <CardContent>
                    <Text>This is an elevated card with shadow.</Text>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem>
                <Card variant="filled">
                  <CardHeader>
                    <Heading as="h4">Filled Card</Heading>
                  </CardHeader>
                  <CardContent>
                    <Text>This is a filled card variant.</Text>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem>
                <Card clickable onClick={(): void => alert('Card clicked!')}>
                  <CardHeader action={<Badge variant="success">New</Badge>}>
                    <Heading as="h4">Clickable Card</Heading>
                  </CardHeader>
                  <CardContent>
                    <Text>This card is clickable with an action badge.</Text>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem>
                <Card>
                  <CardHeader border>
                    <Heading as="h4">Card with Footer</Heading>
                  </CardHeader>
                  <CardContent>
                    <Text>This card has header and footer borders.</Text>
                  </CardContent>
                  <CardFooter border>
                    <Button size="sm" variant="ghost">Cancel</Button>
                    <Button size="sm">Save</Button>
                  </CardFooter>
                </Card>
              </GridItem>
            </Grid>
          </CardContent>
        </Card>

        {/* Modals */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Modals</Heading>
          </CardHeader>
          <CardContent>
            <HStack gap="md">
              <Button onClick={(): void => setModalOpen(true)}>
                Open Modal
              </Button>
            </HStack>
          </CardContent>
        </Card>

        {/* Layout Examples */}
        <Card padding="lg">
          <CardHeader border>
            <Heading as="h2">Responsive Grid Layout</Heading>
          </CardHeader>
          <CardContent>
            <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="md">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <GridItem key={i}>
                  <Card variant="filled" padding="md">
                    <Text align="center">Item {i}</Text>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </VStack>

      {/* Modal Example */}
      <SimpleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Welcome to Enxi ERP"
        description="This is an example modal demonstrating the design system."
        footer={
          <>
            <Button variant="outline" onClick={(): void => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={(): void => {
                alert('Confirmed!')
                setModalOpen(false)
              }}
              leftIcon={<CheckCircle />}
            >
              Confirm
            </Button>
          </>
        }
      >
        <VStack gap="md">
          <Text>
            The modal component supports different sizes, custom content, and proper accessibility features.
          </Text>
          <Text>
            Press <Badge size="xs">Escape</Badge> or click outside to close.
          </Text>
        </VStack>
      </SimpleModal>
    </Container>
  )
}