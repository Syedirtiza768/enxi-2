/**
 * Example of enhanced service using new error handling system
 * 
 * Shows how to use business logic errors, validation errors, and error context
 */

import { prisma } from '@/lib/db/prisma'
import { 
  BusinessLogicError, 
  throwBusinessLogicError,
  AppError,
  ErrorCategory,
  ErrorSeverity
} from '@/lib/utils/error-handler'

export class EnhancedCustomerService {
  
  async updateCreditLimit(customerId: string, newLimit: number, userId: string) {
    // Validate input parameters
    if (newLimit < 0) {
      throwBusinessLogicError(
        'Credit limit cannot be negative',
        'INVALID_CREDIT_LIMIT',
        { providedLimit: newLimit },
        ['Use a positive value for credit limit', 'Use 0 for no credit limit']
      )
    }
    
    // Get customer with current balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { account: true }
    })
    
    if (!customer) {
      throwBusinessLogicError(
        'Customer not found',
        'CUSTOMER_NOT_FOUND',
        { customerId },
        ['Verify the customer ID is correct', 'Check if customer was deleted']
      )
    }
    
    // Check current used credit
    const usedCredit = await this.getUsedCredit(customerId)
    
    if (newLimit < usedCredit) {
      throwBusinessLogicError(
        'Cannot set credit limit below current used credit',
        'CREDIT_LIMIT_BELOW_USAGE',
        { 
          newLimit, 
          usedCredit, 
          difference: usedCredit - newLimit 
        },
        [
          `Increase limit to at least ${usedCredit}`,
          'Collect outstanding payments first',
          'Contact customer to settle outstanding balance'
        ]
      )
    }
    
    // Perform the update with proper error context
    try {
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: { 
          creditLimit: newLimit,
          updatedBy: userId 
        }
      })
      
      return updatedCustomer
    } catch (error) {
      // Re-throw with additional context
      throw new AppError(
        'Failed to update customer credit limit',
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH,
        'CREDIT_LIMIT_UPDATE_FAILED',
        { 
          customerId, 
          newLimit, 
          originalError: (error as Error).message 
        }
      )
    }
  }
  
  async convertLeadToCustomer(leadId: string, additionalData: any, userId: string) {
    // Use database transaction with proper error handling
    return await prisma.$transaction(async (tx) => {
      // Get lead
      const lead = await tx.lead.findUnique({ where: { id: leadId } })
      
      if (!lead) {
        throwBusinessLogicError(
          'Lead not found',
          'LEAD_NOT_FOUND',
          { leadId },
          ['Verify the lead ID is correct', 'Check if lead was already converted']
        )
      }
      
      if (lead.status === 'CONVERTED') {
        throwBusinessLogicError(
          'Lead has already been converted to customer',
          'LEAD_ALREADY_CONVERTED',
          { leadId, currentStatus: lead.status },
          ['Use the existing customer record', 'Create a new lead if needed']
        )
      }
      
      // Check for duplicate email
      const existingCustomer = await tx.customer.findUnique({
        where: { email: lead.email }
      })
      
      if (existingCustomer) {
        throwBusinessLogicError(
          'Customer with this email already exists',
          'DUPLICATE_CUSTOMER_EMAIL',
          { 
            email: lead.email, 
            existingCustomerId: existingCustomer.id,
            existingCustomerName: existingCustomer.name
          },
          [
            'Update the existing customer record instead',
            'Use a different email address',
            'Merge the records if they represent the same entity'
          ]
        )
      }
      
      // Continue with conversion logic...
      // All database errors, validation errors, etc. will be automatically
      // handled by the error middleware when this service is called from API routes
      
      return { success: true, message: 'Lead converted successfully' }
    }, {
      timeout: 10000 // 10 second timeout
    })
  }
  
  private async getUsedCredit(customerId: string): Promise<number> {
    // Calculate used credit based on outstanding invoices
    const result = await prisma.invoice.aggregate({
      where: {
        customerId,
        status: { in: ['SENT', 'OVERDUE'] }
      },
      _sum: {
        totalAmount: true
      }
    })
    
    return result._sum.totalAmount || 0
  }
}

/* 
Benefits of Enhanced Error Handling in Services:

1. **Clear Error Messages**: Business-friendly error messages with context
2. **Error Categories**: Proper categorization for different error types  
3. **Helpful Suggestions**: Actionable suggestions for resolving errors
4. **Error Codes**: Consistent error codes for programmatic handling
5. **Rich Context**: Additional data to help with debugging
6. **Automatic Propagation**: Errors automatically handled by API middleware

Example Error Response:
{
  "error": "BusinessLogicError",
  "message": "Cannot set credit limit below current used credit",
  "category": "BUSINESS_LOGIC", 
  "severity": "MEDIUM",
  "code": "CREDIT_LIMIT_BELOW_USAGE",
  "details": {
    "newLimit": 5000,
    "usedCredit": 8000,
    "difference": 3000
  },
  "timestamp": "2024-01-20T10:30:00.000Z",
  "requestId": "req_1705747800000_abc123def",
  "suggestions": [
    "Increase limit to at least 8000",
    "Collect outstanding payments first", 
    "Contact customer to settle outstanding balance"
  ]
}
*/