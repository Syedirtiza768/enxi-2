import { Metadata } from 'next'
import SalesChartsDemo from '@/components/sales/demo'

export const metadata: Metadata = {
  title: 'Sales Charts Demo - Enxi ERP',
  description: 'Interactive demonstration of sales analytics charts and dashboard features'
}

export default function SalesChartsDemoPage(): React.JSX.Element {
  return (
    <div className="container mx-auto">
      <SalesChartsDemo />
    </div>
  )
}