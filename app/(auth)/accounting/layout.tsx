import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accounting - Enxi ERP',
  description: 'Manage your accounting and financial records',
}

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Accounting</h1>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>
    </div>
  )
}