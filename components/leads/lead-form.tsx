'use client'

import { LeadSource, LeadStatus } from "@/lib/types/shared-enums";
import { useState, useCallback, useEffect } from 'react'
import type { FormErrors } from '@/lib/types'
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

import { LeadResponse, CreateLeadData, UpdateLeadData } from '@/lib/types/lead.types'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  validateEmail,
  validatePhone,
  checkMaxLength,
  notesValidator,
  positiveNumberValidator
} from '@/lib/validators/common.validator'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { apiClient } from '@/lib/api/client'

// Backend constraints matching schema and validator
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 255
const MAX_COMPANY_LENGTH = 255
const MAX_JOBTITLE_LENGTH = 100
const MAX_NOTES_LENGTH = 1000
const MAX_PHONE_LENGTH = 20

interface LeadFormProps {
  initialData?: Partial<LeadResponse>
  onSubmit: (data: CreateLeadData | UpdateLeadData) => Promise<void>
  isEdit?: boolean
}

type ValidationErrors = FormErrors

// FieldStatus defined locally for form validation
type FieldStatus = 'idle' | 'checking' | 'valid' | 'error'

export function LeadForm({ initialData, onSubmit, isEdit = false }: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [fieldStatus, setFieldStatus] = useState<FieldStatus>({})
  const [checkingEmail, setCheckingEmail] = useState(false)

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    jobTitle: initialData?.jobTitle || '',
    source: initialData?.source || LeadSource.WEBSITE,
    status: initialData?.status || LeadStatus.NEW,
    notes: initialData?.notes || ''
  })

  // Debounce email for duplicate checking
  const debouncedEmail = useDebounce(formData.email, 500)

  // Check for duplicate email
  const checkDuplicateEmail = useCallback(async (email: string) => {
    if (!email || validateEmail(email)) return
    
    setCheckingEmail(true)
    setFieldStatus(prev => ({ ...prev, email: 'checking' as const }))
    
    try {
      const response = await apiClient<{ data: LeadResponse[] }>(`/api/leads?email=${encodeURIComponent(email)}`)
      if (response?.data && response?.data.length > 0 && !isEdit) {
        // Only check for duplicates if not editing or if email changed
        const existingLead = response?.data.find((lead) => 
          lead.email === email && lead.id !== initialData?.id
        )
        if (existingLead) {
          setErrors(prev => ({ ...prev, email: 'A lead with this email already exists' }))
          setFieldStatus(prev => ({ ...prev, email: 'error' as const }))
        } else {
          setFieldStatus(prev => ({ ...prev, email: 'valid' as const }))
          if (errors.email === 'A lead with this email already exists') {
            setErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors.email
              return newErrors
            })
          }
        }
      } else {
        setFieldStatus(prev => ({ ...prev, email: 'valid' }))
      }
    } catch (error) {
      console.error('Error checking email:', error)
    } finally {
      setCheckingEmail(false)
    }
  }, [errors.email, isEdit, initialData?.id])

  // Run email duplicate check when debounced email changes
  useEffect(() => {
    if (debouncedEmail && (!isEdit || debouncedEmail !== initialData?.email)) {
      checkDuplicateEmail(debouncedEmail)
    }
  }, [debouncedEmail, checkDuplicateEmail, isEdit, initialData?.email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // Comprehensive validation
    const newErrors: ValidationErrors = {}
    
    // Validate all fields before submission
    const fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'notes']
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData])
      if (error) {
        newErrors[field] = error
      }
    })

    // Check for existing lead with same email if email has error status
    if (fieldStatus.email === 'error' && errors.email) {
      newErrors.email = errors.email
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      // Clean up empty strings before submission
      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        source: formData.source,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      }
      
      await onSubmit(submitData)
    } catch (error) {
      console.error('Error submitting lead:', error)
      // Show error to user
      if (error instanceof Error) {
        setErrors({ general: error.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const validateField = useCallback((field: string, value: unknown): string | null => {
    switch (field) {
      case 'firstName':
      case 'lastName':
        const strValue = value as string
        if (!strValue?.trim()) return `${field === 'firstName' ? 'First' : 'Last'} name is required`
        return checkMaxLength(strValue, MAX_NAME_LENGTH, field === 'firstName' ? 'First name' : 'Last name')
      
      case 'email':
        const emailValue = value as string
        const emailError = validateEmail(emailValue)
        if (emailError) return emailError
        return checkMaxLength(emailValue, MAX_EMAIL_LENGTH, 'Email')
      
      case 'phone':
        const phoneValue = value as string
        if (phoneValue) {
          const phoneError = validatePhone(phoneValue)
          if (phoneError) return phoneError
        }
        return null
      
      case 'company':
        const companyValue = value as string
        if (companyValue) {
          return checkMaxLength(companyValue, MAX_COMPANY_LENGTH, 'Company')
        }
        return null
      
      case 'jobTitle':
        const jobTitleValue = value as string
        if (jobTitleValue) {
          return checkMaxLength(jobTitleValue, MAX_JOBTITLE_LENGTH, 'Job title')
        }
        return null
      
      case 'notes':
        const notesValue = value as string
        if (notesValue) {
          return checkMaxLength(notesValue, MAX_NOTES_LENGTH, 'Notes')
        }
        return null
      
      case 'source':
        const sourceValue = value as string
        if (!sourceValue) return 'Lead source is required'
        if (!Object.values(LeadSource).includes(sourceValue as LeadSource)) {
          return 'Invalid lead source'
        }
        return null
      
      case 'status':
        const statusValue = value as string
        if (isEdit && !statusValue) return 'Lead status is required'
        if (statusValue && !Object.values(LeadStatus).includes(statusValue as LeadStatus)) {
          return 'Invalid lead status'
        }
        return null
      
      default:
        return null
    }
  }, [])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation
    const error = validateField(field, value)
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
      setFieldStatus(prev => ({ ...prev, [field]: 'error' as const }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      // Don't set email to valid immediately if it needs async validation
      if (field !== 'email' || (isEdit && value === initialData?.email)) {
        setFieldStatus(prev => ({ ...prev, [field]: 'valid' as const }))
      }
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
          <div className="relative">
            <Input
              label="First Name"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              disabled={isLoading}
              error={errors.firstName}
              required
              fullWidth
              maxLength={MAX_NAME_LENGTH}
              placeholder="John"
            />
            {fieldStatus.firstName === 'valid' && (
              <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
            )}
          </div>

          <div className="relative">
            <Input
              label="Last Name"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              disabled={isLoading}
              error={errors.lastName}
              required
              fullWidth
              maxLength={MAX_NAME_LENGTH}
              placeholder="Doe"
            />
            {fieldStatus.lastName === 'valid' && (
              <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
            )}
          </div>
        </Grid>

        <div className="relative">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
            disabled={isLoading || checkingEmail}
            error={errors.email}
            required
            fullWidth
            maxLength={MAX_EMAIL_LENGTH}
            placeholder="john.doe@example.com"
          />
          {fieldStatus.email === 'checking' && (
            <div className="absolute right-3 top-9 h-5 w-5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}
          {fieldStatus.email === 'valid' && (
            <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
          )}
          {fieldStatus.email === 'error' && errors.email && (
            <AlertCircle className="absolute right-3 top-9 h-5 w-5 text-red-500" />
          )}
        </div>

        <Grid cols={2} gap="md">
          <div className="relative">
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={isLoading}
              error={errors.phone}
              fullWidth
              maxLength={MAX_PHONE_LENGTH}
              placeholder="+971 50 123 4567"
            />
            {fieldStatus.phone === 'valid' && formData.phone && (
              <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
            )}
          </div>

          <div className="relative">
            <Input
              label="Company"
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              disabled={isLoading}
              error={errors.company}
              fullWidth
              maxLength={MAX_COMPANY_LENGTH}
              placeholder="Acme Corporation"
            />
            {fieldStatus.company === 'valid' && formData.company && (
              <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
            )}
          </div>
        </Grid>

        <div className="relative">
          <Input
            label="Job Title"
            type="text"
            value={formData.jobTitle}
            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
            disabled={isLoading}
            error={errors.jobTitle}
            fullWidth
            maxLength={MAX_JOBTITLE_LENGTH}
            placeholder="Sales Manager"
          />
          {fieldStatus.jobTitle === 'valid' && formData.jobTitle && (
            <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
          )}
        </div>

        <Grid cols={isEdit ? 2 : 1} gap="md">
          <div className="relative">
            <Select
              label="Lead Source"
              value={formData.source}
              onChange={(e) => handleInputChange('source', e.target.value)}
              disabled={isLoading}
              error={errors.source}
              required
              options={[
                { value: LeadSource.WEBSITE, label: 'Website' },
                { value: LeadSource.REFERRAL, label: 'Referral' },
                { value: LeadSource.SOCIAL_MEDIA, label: 'Social Media' },
                { value: LeadSource.EMAIL_CAMPAIGN, label: 'Email Campaign' },
                { value: LeadSource.PHONE_CALL, label: 'Phone Call' },
                { value: LeadSource.TRADE_SHOW, label: 'Trade Show' },
                { value: LeadSource.OTHER, label: 'Other' },
              ]}
              fullWidth
            />
            {fieldStatus.source === 'valid' && (
              <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
            )}
          </div>

          {isEdit && (
            <div className="relative">
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isLoading}
                error={errors.status}
                required
                options={[
                  { value: LeadStatus.NEW, label: 'New' },
                  { value: LeadStatus.CONTACTED, label: 'Contacted' },
                  { value: LeadStatus.QUALIFIED, label: 'Qualified' },
                  { value: LeadStatus.PROPOSAL_SENT, label: 'Proposal Sent' },
                  { value: LeadStatus.NEGOTIATING, label: 'Negotiating' },
                  { value: LeadStatus.CONVERTED, label: 'Converted' },
                  { value: LeadStatus.LOST, label: 'Lost' },
                  { value: LeadStatus.DISQUALIFIED, label: 'Disqualified' },
                ]}
                fullWidth
              />
              {fieldStatus.status === 'valid' && (
                <CheckCircle2 className="absolute right-3 top-9 h-5 w-5 text-green-500" />
              )}
            </div>
          )}
        </Grid>

        <div className="relative">
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={isLoading}
            error={errors.notes}
            rows={3}
            placeholder="Additional notes about this lead..."
            fullWidth
            maxLength={MAX_NOTES_LENGTH}
          />
          <div className="absolute right-3 bottom-3 text-xs text-gray-500">
            {formData.notes?.length || 0}/{MAX_NOTES_LENGTH}
          </div>
        </div>

        <HStack justify="end" className="pt-4" gap="md">
          <Text size="sm" color="secondary">
            <span className="text-red-500">*</span> Required fields
          </Text>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading || checkingEmail || fieldStatus.email === 'error'}
            loading={isLoading}
          >
            {isEdit ? 'Update Lead' : 'Create Lead'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}