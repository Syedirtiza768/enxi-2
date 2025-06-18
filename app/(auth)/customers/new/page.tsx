'use client'

import { CustomerForm } from '@/components/customers/customer-form'
import { PageLayout } from '@/components/design-system'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewCustomerPage(): React.JSX.Element {
  const router = useRouter()

  const handleSuccess = (customer: Record<string, unknown>) => {
    // Redirect to the customer detail page after successful creation
    router.push(`/customers/${customer.id}`)
  }

  const handleCancel = () => {
    router.push('/customers')
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link 
            href="/customers" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Customers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create a new customer account and set up their billing information.
          </p>
        </div>
        
        <CustomerForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </PageLayout>
  )
}