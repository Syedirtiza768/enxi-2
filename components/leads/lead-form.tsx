'use client'

import { useState } from 'react'
import { 
  VStack, 
  HStack, 
  Grid, 
  Button, 
  Input, 
  Textarea,
  Select,
  Text
} from '@/components/design-system'
import { LeadSource, LeadStatus } from '@/lib/generated/prisma'
import { LeadResponse } from '@/lib/types/lead.types'
import { AlertCircle } from 'lucide-react'

interface LeadFormProps {
  initialData?: Partial<LeadResponse>
  onSubmit: (data: any) => Promise<void>
  isEdit?: boolean
}

export function LeadForm({ initialData, onSubmit, isEdit = false }: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    jobTitle: initialData?.jobTitle || '',
    source: initialData?.source || LeadSource.WEBSITE,
    status: initialData?.status || LeadStatus.NEW,
    notes: initialData?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const submitData = { ...formData }
      
      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission error:', error)
      setErrors({ general: 'Failed to save lead. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="lg">
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-[var(--color-semantic-error-50)] dark:bg-[var(--color-semantic-error-950)] rounded-[var(--radius-lg)]">
            <AlertCircle className="h-5 w-5 text-[var(--color-semantic-error-600)]" />
            <Text size="sm" color="error">
              {errors.general}
            </Text>
          </div>
        )}

        <Grid cols={2} gap="md">
          <Input
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            disabled={isLoading}
            error={errors.firstName}
            required
            fullWidth
          />

          <Input
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            disabled={isLoading}
            error={errors.lastName}
            required
            fullWidth
          />
        </Grid>

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={isLoading}
          error={errors.email}
          required
          fullWidth
        />

        <Grid cols={2} gap="md">
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={isLoading}
            fullWidth
          />

          <Input
            label="Company"
            type="text"
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            disabled={isLoading}
            fullWidth
          />
        </Grid>

        <Input
          label="Job Title"
          type="text"
          value={formData.jobTitle}
          onChange={(e) => handleInputChange('jobTitle', e.target.value)}
          disabled={isLoading}
          fullWidth
        />

        <Grid cols={isEdit ? 2 : 1} gap="md">
          <Select
            label="Source"
            value={formData.source}
            onValueChange={(value) => handleInputChange('source', value)}
            disabled={isLoading}
            options={[
              { value: 'WEBSITE', label: 'Website' },
              { value: 'REFERRAL', label: 'Referral' },
              { value: 'SOCIAL_MEDIA', label: 'Social Media' },
              { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
              { value: 'PHONE_CALL', label: 'Phone Call' },
              { value: 'TRADE_SHOW', label: 'Trade Show' },
              { value: 'ADVERTISING', label: 'Advertising' },
              { value: 'OTHER', label: 'Other' },
            ]}
            fullWidth
          />

          {isEdit && (
            <Select
              label="Status"
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isLoading}
              options={[
                { value: 'NEW', label: 'New' },
                { value: 'CONTACTED', label: 'Contacted' },
                { value: 'QUALIFIED', label: 'Qualified' },
                { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
                { value: 'NEGOTIATING', label: 'Negotiating' },
                { value: 'CONVERTED', label: 'Converted' },
                { value: 'LOST', label: 'Lost' },
                { value: 'DISQUALIFIED', label: 'Disqualified' },
              ]}
              fullWidth
            />
          )}
        </Grid>

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          disabled={isLoading}
          rows={3}
          placeholder="Additional notes about this lead..."
          fullWidth
        />

        <HStack justify="end" className="pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            loading={isLoading}
          >
            {isEdit ? 'Update Lead' : 'Create Lead'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}