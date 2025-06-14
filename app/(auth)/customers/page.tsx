'use client'

import { CustomerList } from '@/components/customers/customer-list'
import { PageLayout } from '@/components/design-system'

export default function CustomersPage(): React.JSX.Element {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6">
        <CustomerList />
      </div>
    </PageLayout>
  )
}