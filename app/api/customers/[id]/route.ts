import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

// GET /api/customers/[id] - Get specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const customerService = new CustomerService()
    const customer = await customerService.getCustomer(id)

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    
    const customerService = new CustomerService()
    const customer = await customerService.updateCustomer(
      id,
      body,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: customer
    })
  } catch (error: unknown) {
    console.error('Error updating customer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Partial update customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    
    const customerService = new CustomerService()
    const customer = await customerService.updateCustomer(
      id,
      body,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: customer
    })
  } catch (error: unknown) {
    console.error('Error updating customer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete customer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    
    const customerService = new CustomerService()
    
    // Check if customer exists
    const existingCustomer = await customerService.getCustomer(id)
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    // Check if customer has active orders or invoices
    const hasActiveTransactions = await customerService.hasActiveTransactions(id)
    if (hasActiveTransactions) {
      return NextResponse.json(
        { error: 'Cannot delete customer with active transactions' },
        { status: 400 }
      )
    }
    
    // Perform soft delete by setting isActive to false
    await customerService.softDeleteCustomer(id, session.user.id)
    
    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    })
  } catch (error: unknown) {
    console.error('Error deleting customer:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}