import { Metadata } from 'next'
import { SalesChartsComponent } from '@/components/sales'

export const metadata: Metadata = {
  title: 'Sales Analytics - Enxi ERP',
  description: 'Comprehensive sales performance analytics and reporting dashboard'
}

export default function SalesAnalyticsPage(): React.JSX.Element {
  return (
    <div className="container mx-auto">
      <SalesChartsComponent />
    </div>
  )
}