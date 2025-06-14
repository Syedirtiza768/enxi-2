import Link from 'next/link'

export default function AccountingPage(): React.JSX.Element {
  const accountingModules = [
    {
      title: 'Journal Entries',
      description: 'Create and manage journal entries',
      href: '/accounting/journal-entries',
      icon: '📝',
    },
    {
      title: 'Chart of Accounts',
      description: 'Manage your account structure',
      href: '/accounting/accounts',
      icon: '📊',
    },
    {
      title: 'Trial Balance',
      description: 'View trial balance report',
      href: '/accounting/reports/trial-balance',
      icon: '⚖️',
    },
    {
      title: 'Balance Sheet',
      description: 'View balance sheet report',
      href: '/accounting/reports/balance-sheet',
      icon: '💰',
    },
    {
      title: 'Income Statement',
      description: 'View income statement report',
      href: '/accounting/reports/income-statement',
      icon: '📈',
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Accounting Dashboard</h2>
        <p className="text-gray-600">Manage your financial records and generate reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accountingModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 p-6"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{module.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
            </div>
            <p className="text-gray-600">{module.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Actions</h3>
        <ul className="space-y-2 text-blue-700">
          <li>• Create a new journal entry to record transactions</li>
          <li>• View the trial balance to check account balances</li>
          <li>• Generate financial statements for reporting</li>
          <li>• Manage your chart of accounts structure</li>
        </ul>
      </div>
    </div>
  )
}