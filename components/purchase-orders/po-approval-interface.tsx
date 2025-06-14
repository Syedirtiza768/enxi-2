'use client'

import { useState } from 'react'
import { 
  VStack, 
  HStack, 
  Button, 
  Text, 
  Card, 
  CardContent,
  Textarea
} from '@/components/design-system'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  User,
  Calendar,
  DollarSign
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { MAX_NOTES_LENGTH, validateRequired } from '@/lib/validators/common.validator'

interface ApprovalRule {
  id: string
  name: string
  threshold: number
  approvers: string[]
  requiredApprovals: number
}

interface PurchaseOrderApproval {
  id: string
  orderNumber: string
  supplier: {
    name: string
    code: string
  }
  totalAmount: number
  currency: string
  orderDate: string
  requestedBy: string
  requestedDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvalNotes?: string
  approvalHistory: Array<{
    approvedBy: string
    approvedDate: string
    action: 'APPROVED' | 'REJECTED'
    notes?: string
  }>
}

interface POApprovalInterfaceProps {
  purchaseOrderId: string
  currentUser?: {
    id: string
    name: string
    role: string
  }
  onApprove?: () => void
  onReject?: () => void
}

export function POApprovalInterface({ 
  purchaseOrderId, 
  currentUser,
  onApprove,
  onReject 
}: POApprovalInterfaceProps) {
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showNotesInput, setShowNotesInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isRejecting, setIsRejecting] = useState(false)

  // Mock data - replace with actual API call
  const purchaseOrder: PurchaseOrderApproval = {
    id: purchaseOrderId,
    orderNumber: 'PO-2024001',
    supplier: {
      name: 'ABC Suppliers Ltd.',
      code: 'SUP-001'
    },
    totalAmount: 75000,
    currency: 'AED',
    orderDate: '2024-01-15',
    requestedBy: 'John Doe',
    requestedDate: '2024-01-15',
    status: 'PENDING',
    approvalHistory: []
  }

  const approvalRules: ApprovalRule[] = [
    {
      id: '1',
      name: 'Level 1 Approval',
      threshold: 50000,
      approvers: ['Manager', 'Senior Manager'],
      requiredApprovals: 1
    },
    {
      id: '2',
      name: 'Level 2 Approval',
      threshold: 100000,
      approvers: ['Director', 'VP'],
      requiredApprovals: 2
    }
  ]

  const canApprove = () => {
    // Check if current user has approval authority
    const applicableRule = approvalRules.find(rule => 
      purchaseOrder.totalAmount >= rule.threshold
    )
    
    if (!applicableRule || !currentUser) return false
    
    return applicableRule.approvers.includes(currentUser.role)
  }

  const validateApprovalNotes = (notes: string, isRequired: boolean = false): string | null => {
    if (isRequired && !notes.trim()) {
      return 'Approval notes are required for rejection'
    }
    if (notes && notes.length > MAX_NOTES_LENGTH) {
      return `Notes must be less than ${MAX_NOTES_LENGTH} characters`
    }
    return null
  }

  const handleNotesChange = (value: string) => {
    setApprovalNotes(value)
    
    // Clear validation errors when user types
    if (validationErrors.approvalNotes) {
      setValidationErrors(prev => {
        const { approvalNotes: _, ...rest } = prev
        return rest
      })
    }
    
    // Real-time validation
    const error = validateApprovalNotes(value, isRejecting)
    if (error) {
      setValidationErrors(prev => ({ ...prev, approvalNotes: error }))
    }
  }

  const handleApprove: () => Promise<Record<string, any>>= async() => {
    if (!canApprove()) {
      setError('You do not have permission to approve this purchase order')
      return
    }

    // Validate notes (optional for approval)
    const notesError = validateApprovalNotes(approvalNotes, false)
    if (notesError) {
      setValidationErrors({ approvalNotes: notesError })
      return
    }

    setLoading(true)
    setError(null)
    setValidationErrors({})

    try {
      const response = await apiClient<{ data: any }>(`/api/purchase-orders/${purchaseOrderId}/approve`, {
        method: 'POST',
        body: {
          approvalNotes: approvalNotes.trim(),
          approvedBy: currentUser?.id || 'system'
        }
      })

      if (response.ok) {
        if (onApprove) onApprove()
      } else {
        throw new Error(response.error || 'Failed to approve purchase order')
      }
    } catch (err) {
      console.error('Error approving PO:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve purchase order')
    } finally {
      setLoading(false)
    }
  }

  const handleReject: () => Promise<Record<string, any>>= async() => {
    setIsRejecting(true)
    
    // Validate notes (required for rejection)
    const notesError = validateApprovalNotes(approvalNotes, true)
    if (notesError) {
      setValidationErrors({ approvalNotes: notesError })
      setError('Please provide a valid rejection reason')
      return
    }

    setLoading(true)
    setError(null)
    setValidationErrors({})

    try {
      const response = await apiClient<{ data: any }>(`/api/purchase-orders/${purchaseOrderId}/reject`, {
        method: 'POST',
        body: {
          rejectionReason: approvalNotes.trim(),
          rejectedBy: currentUser?.id || 'system'
        }
      })

      if (response.ok) {
        if (onReject) onReject()
      } else {
        throw new Error(response.error || 'Failed to reject purchase order')
      }
    } catch (err) {
      console.error('Error rejecting PO:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject purchase order')
    } finally {
      setLoading(false)
      setIsRejecting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        )
    }
  }

  return (
    <VStack gap="xl">
      {/* Header */}
      <Card variant="elevated">
        <CardContent>
          <HStack justify="between" align="center">
            <VStack gap="xs">
              <Text size="xl" weight="bold">Purchase Order Approval</Text>
              <Text color="secondary">Review and approve purchase order {purchaseOrder.orderNumber}</Text>
            </VStack>
            {getStatusBadge(purchaseOrder.status)}
          </HStack>
        </CardContent>
      </Card>

      {/* PO Summary */}
      <Card variant="elevated">
        <CardContent>
          <VStack gap="lg">
            <HStack gap="sm" align="center">
              <ShieldCheck className="h-5 w-5" />
              <Text size="lg" weight="semibold">Order Summary</Text>
            </HStack>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <VStack gap="xs">
                <HStack gap="xs" align="center">
                  <User className="h-4 w-4 text-gray-500" />
                  <Text size="sm" color="secondary">Supplier</Text>
                </HStack>
                <Text weight="semibold">{purchaseOrder.supplier.name}</Text>
                <Text size="sm" color="secondary">{purchaseOrder.supplier.code}</Text>
              </VStack>

              <VStack gap="xs">
                <HStack gap="xs" align="center">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Text size="sm" color="secondary">Order Date</Text>
                </HStack>
                <Text weight="semibold">{new Date(purchaseOrder.orderDate).toLocaleDateString()}</Text>
                <Text size="sm" color="secondary">Requested by {purchaseOrder.requestedBy}</Text>
              </VStack>

              <VStack gap="xs">
                <HStack gap="xs" align="center">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <Text size="sm" color="secondary">Total Amount</Text>
                </HStack>
                <Text size="xl" weight="bold" className="text-[var(--color-brand-primary-600)]">
                  {formatCurrency(purchaseOrder.totalAmount)} {purchaseOrder.currency}
                </Text>
              </VStack>
            </div>
          </VStack>
        </CardContent>
      </Card>

      {/* Approval Rules */}
      <Card variant="elevated">
        <CardContent>
          <VStack gap="lg">
            <Text size="lg" weight="semibold">Approval Requirements</Text>
            
            <VStack gap="md">
              {approvalRules.map((rule) => {
                const isApplicable = purchaseOrder.totalAmount >= rule.threshold
                return (
                  <Card 
                    key={rule.id} 
                    variant="outlined" 
                    className={isApplicable ? 'border-yellow-300 bg-yellow-50' : 'opacity-50'}
                  >
                    <CardContent className="p-4">
                      <HStack justify="between" align="center">
                        <VStack gap="xs">
                          <Text weight="medium">{rule.name}</Text>
                          <Text size="sm" color="secondary">
                            Threshold: {formatCurrency(rule.threshold)} | Required approvers: {rule.requiredApprovals}
                          </Text>
                        </VStack>
                        {isApplicable && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Required
                          </Badge>
                        )}
                      </HStack>
                    </CardContent>
                  </Card>
                )
              })}
            </VStack>
          </VStack>
        </CardContent>
      </Card>

      {/* Approval History */}
      {purchaseOrder.approvalHistory.length > 0 && (
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Approval History</Text>
              
              <VStack gap="md">
                {purchaseOrder.approvalHistory.map((history, index) => (
                  <HStack key={index} justify="between" align="start">
                    <HStack gap="md" align="start">
                      {history.action === 'APPROVED' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <VStack gap="xs">
                        <Text weight="medium">
                          {history.action === 'APPROVED' ? 'Approved' : 'Rejected'} by {history.approvedBy}
                        </Text>
                        <Text size="sm" color="secondary">
                          {new Date(history.approvedDate).toLocaleString()}
                        </Text>
                        {history.notes && (
                          <Text size="sm" color="secondary">
                            "{history.notes}"
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </CardContent>
        </Card>
      )}

      {/* Approval Actions */}
      {purchaseOrder.status === 'PENDING' && canApprove() && (
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Approval Decision</Text>
              
              {error && (
                <Card variant="outlined" className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <HStack gap="sm" align="center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <Text color="error">{error}</Text>
                    </HStack>
                  </CardContent>
                </Card>
              )}

              {showNotesInput && (
                <VStack gap="sm">
                  <Text size="sm" weight="medium">
                    Approval Notes {isRejecting ? '(Required for rejection)' : '(Optional)'}
                  </Text>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={isRejecting ? "Please provide a reason for rejection..." : "Enter your approval notes..."}
                    rows={4}
                    maxLength={MAX_NOTES_LENGTH}
                    className={`${
                      validationErrors.approvalNotes ? 'border-red-500' : 
                      approvalNotes ? 'border-green-500' : ''
                    }`}
                  />
                  <div className="flex justify-between items-start">
                    {validationErrors.approvalNotes ? (
                      <Text size="sm" color="error">
                        <HStack gap="xs" align="center">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.approvalNotes}
                        </HStack>
                      </Text>
                    ) : (
                      <div />
                    )}
                    {approvalNotes && (
                      <Text size="xs" color="secondary" className="ml-auto">
                        {approvalNotes.length}/{MAX_NOTES_LENGTH}
                      </Text>
                    )}
                  </div>
                </VStack>
              )}

              <HStack gap="md" justify="center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    if (!showNotesInput) {
                      setShowNotesInput(true)
                      setIsRejecting(false)
                    } else {
                      handleApprove()
                    }
                  }}
                  disabled={
                    loading || 
                    (showNotesInput && validationErrors.approvalNotes && !isRejecting)
                  }
                  leftIcon={<CheckCircle2 />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading && !isRejecting ? 'Processing...' : 
                   showNotesInput ? 'Confirm Approval' : 'Approve Purchase Order'}
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    if (!showNotesInput) {
                      setShowNotesInput(true)
                      setIsRejecting(true)
                    } else {
                      handleReject()
                    }
                  }}
                  disabled={
                    loading || 
                    (showNotesInput && (!approvalNotes.trim() || validationErrors.approvalNotes))
                  }
                  leftIcon={<XCircle />}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading && isRejecting ? 'Processing...' : 
                   showNotesInput ? 'Confirm Rejection' : 'Reject Purchase Order'}
                </Button>
              </HStack>
            </VStack>
          </CardContent>
        </Card>
      )}

      {/* No Permission Message */}
      {purchaseOrder.status === 'PENDING' && !canApprove() && (
        <Card variant="elevated" className="border-yellow-300 bg-yellow-50">
          <CardContent>
            <HStack gap="sm" align="center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <Text>
                You do not have permission to approve this purchase order. 
                Only authorized approvers can take action on orders above {formatCurrency(50000)}.
              </Text>
            </HStack>
          </CardContent>
        </Card>
      )}
    </VStack>
  )
}