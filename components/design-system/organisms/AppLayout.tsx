'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Container, 
  VStack, 
  HStack, 
  Button, 
  Text,
  Badge,
  ThemeToggle,
  Logo
} from '@/components/design-system'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Package, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut,
  ShoppingCart,
  CreditCard,
  Briefcase,
  ClipboardList,
  ChevronRight,
  Truck,
  Shield,
  Calculator,
  Building,
  Receipt,
  TrendingUp,
  UserCheck,
  DollarSign,
  Archive,
  AlertCircle,
  FolderOpen,
  PieChart,
  Activity,
  Layers,
  User
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  badge?: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />
  },
  {
    title: 'Sales',
    href: '#',
    icon: <ShoppingCart className="h-5 w-5" />,
    children: [
      { title: 'Leads', href: '/leads', icon: <Users className="h-4 w-4" /> },
      { title: 'Sales Cases', href: '/sales-cases', icon: <Briefcase className="h-4 w-4" /> },
      { title: 'Quotations', href: '/quotations', icon: <FileText className="h-4 w-4" /> },
      { title: 'Sales Orders', href: '/sales-orders', icon: <ClipboardList className="h-4 w-4" /> },
      { title: 'Customer POs', href: '/customer-pos', icon: <Receipt className="h-4 w-4" /> },
      { title: 'Sales Team', href: '/sales-team', icon: <UserCheck className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: <Building className="h-5 w-5" />
  },
  {
    title: 'Inventory',
    href: '#',
    icon: <Package className="h-5 w-5" />,
    children: [
      { title: 'Overview', href: '/inventory', icon: <Activity className="h-4 w-4" /> },
      { title: 'Items', href: '/inventory/items', icon: <Package className="h-4 w-4" /> },
      { title: 'Categories', href: '/inventory/categories', icon: <FolderOpen className="h-4 w-4" /> },
      { title: 'Stock In', href: '/inventory/stock-in', icon: <TrendingUp className="h-4 w-4" /> },
      { title: 'Stock Out', href: '/inventory/stock-out', icon: <Archive className="h-4 w-4" /> },
      { title: 'Movements', href: '/inventory/movements', icon: <Activity className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Procurement',
    href: '#',
    icon: <Building className="h-5 w-5" />,
    children: [
      { title: 'Suppliers', href: '/suppliers', icon: <Building className="h-4 w-4" /> },
      { title: 'Purchase Orders', href: '/purchase-orders', icon: <FileText className="h-4 w-4" /> },
      { title: 'Goods Receipts', href: '/goods-receipts', icon: <Package className="h-4 w-4" /> },
      { title: 'Supplier Invoices', href: '/supplier-invoices', icon: <Receipt className="h-4 w-4" /> },
      { title: 'Supplier Payments', href: '/supplier-payments', icon: <DollarSign className="h-4 w-4" /> },
      { title: 'Three-Way Matching', href: '/three-way-matching', icon: <BarChart3 className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Logistics',
    href: '#',
    icon: <Truck className="h-5 w-5" />,
    children: [
      { title: 'Shipments', href: '/shipments', icon: <Truck className="h-4 w-4" /> },
    ]
  },
  {
    title: 'Finance & Accounting',
    href: '#',
    icon: <Calculator className="h-5 w-5" />,
    children: [
      { title: 'Invoices', href: '/invoices', icon: <FileText className="h-4 w-4" /> },
      { title: 'Payments', href: '/payments', icon: <DollarSign className="h-4 w-4" /> },
      { title: 'Chart of Accounts', href: '/accounting/accounts', icon: <Layers className="h-4 w-4" /> },
      { title: 'Journal Entries', href: '/accounting/journal-entries', icon: <FileText className="h-4 w-4" /> },
      { title: 'Reports', href: '#', icon: <PieChart className="h-4 w-4" />,
        children: [
          { title: 'Trial Balance', href: '/accounting/reports/trial-balance', icon: <BarChart3 className="h-3 w-3" /> },
          { title: 'Balance Sheet', href: '/accounting/reports/balance-sheet', icon: <BarChart3 className="h-3 w-3" /> },
          { title: 'Income Statement', href: '/accounting/reports/income-statement', icon: <BarChart3 className="h-3 w-3" /> },
        ]
      },
    ]
  },
  {
    title: 'Administration',
    href: '#',
    icon: <Shield className="h-5 w-5" />,
    children: [
      { title: 'Company Settings', href: '/settings/company', icon: <Building className="h-4 w-4" /> },
      { title: 'Users', href: '/users', icon: <Users className="h-4 w-4" /> },
      { title: 'Roles', href: '/roles', icon: <Shield className="h-4 w-4" /> },
      { title: 'Audit Trail', href: '/audit', icon: <AlertCircle className="h-4 w-4" /> },
      { title: 'System Health', href: '/system/health', icon: <Activity className="h-4 w-4" /> },
    ]
  },
]

interface AppLayoutProps {
  children: React.ReactNode
}

interface UserInfo {
  username: string
  email: string
  role: string
}

interface CompanySettings {
  name: string
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default open on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: 'EnXi ERP' })

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  // Load user info and company settings
  useEffect(() => {
    const loadUserInfo = async () => {
      // Get user info from token
      const token = localStorage.getItem('token')
      if (token) {
        try {
          // Decode JWT token (simple base64 decode for demo)
          const payload = JSON.parse(atob(token.split('.')[1]))
          console.log('Token payload:', payload) // Debug log
          setUser({
            username: payload.username || payload.name || payload.user?.username || 'User',
            email: payload.email || payload.user?.email || 'user@company.com',
            role: payload.role || payload.user?.role || 'USER'
          })
        } catch (error) {
          console.error('Error decoding token:', error)
          // Set a default user if token fails
          setUser({
            username: 'User',
            email: 'user@company.com', 
            role: 'USER'
          })
        }
      } else {
        // Set a default user if no token
        setUser({
          username: 'User',
          email: 'user@company.com',
          role: 'USER'
        })
      }

      // Load company settings (you can replace this with actual API call)
      try {
        const savedCompanyName = localStorage.getItem('companyName')
        if (savedCompanyName) {
          setCompanySettings({ name: savedCompanyName })
        }
      } catch (error) {
        console.error('Error loading company settings:', error)
      }
    }

    const handleCompanySettingsChange = (event: CustomEvent) => {
      setCompanySettings({ name: event.detail.name })
    }

    loadUserInfo()

    // Listen for company settings changes
    window.addEventListener('companySettingsChanged', handleCompanySettingsChange as EventListener)

    return () => {
      window.removeEventListener('companySettingsChanged', handleCompanySettingsChange as EventListener)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      localStorage.removeItem('token')
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true
    if (href !== '/dashboard' && pathname.startsWith(href)) return true
    return false
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const active = isActive(item.href)

    if (sidebarCollapsed && level === 0) {
      // Collapsed sidebar - show only icons for top-level items
      return (
        <div key={item.title} className="relative group">
          <button
            onClick={() => {
              if (hasChildren) {
                // Expand sidebar when clicking on parent items while collapsed
                setSidebarCollapsed(false)
                toggleExpanded(item.title)
              } else if (item.href !== '#') {
                router.push(item.href)
                setSidebarOpen(false)
              }
            }}
            className={cn(
              'w-full flex items-center justify-center p-3 rounded-[var(--radius-lg)]',
              'text-sm font-medium transition-all duration-[var(--transition-fast)]',
              'hover:bg-[var(--bg-secondary)]',
              active && 'bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)]',
              active && 'text-[var(--color-brand-primary-700)] dark:text-[var(--color-brand-primary-200)]',
              !active && 'text-[var(--text-secondary)]'
            )}
            title={item.title}
          >
            {item.icon}
          </button>
        </div>
      )
    }

    return (
      <div key={item.title}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.title)
            } else if (item.href !== '#') {
              router.push(item.href)
              setSidebarOpen(false)
            }
          }}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-lg)]',
            'text-sm font-medium transition-all duration-[var(--transition-fast)]',
            'hover:bg-[var(--bg-secondary)]',
            active && 'bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)]',
            active && 'text-[var(--color-brand-primary-700)] dark:text-[var(--color-brand-primary-200)]',
            !active && 'text-[var(--text-secondary)]',
            level === 1 && 'ml-6 text-xs',
            level === 2 && 'ml-12 text-xs'
          )}
        >
          <span className="flex items-center gap-3">
            {item.icon}
            <span>{item.title}</span>
          </span>
          {item.badge && (
            <Badge size="xs" variant="primary">
              {item.badge}
            </Badge>
          )}
          {hasChildren && (
            <ChevronRight 
              className={cn(
                'h-4 w-4 transition-transform duration-[var(--transition-fast)]',
                isExpanded && 'rotate-90'
              )}
            />
          )}
        </button>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const sidebar = (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-[var(--z-modal)] flex flex-col',
      'bg-[var(--bg-primary)] border-r border-[var(--border-primary)]',
      'transform transition-all duration-[var(--transition-normal)]',
      'lg:static lg:z-auto',
      sidebarCollapsed ? 'w-16' : 'w-64',
      // Mobile behavior
      'lg:translate-x-0',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    )}>
      <div className="flex h-20 items-center justify-between px-4 border-b border-[var(--border-primary)]">
        {!sidebarCollapsed && (
          <div className="flex items-center flex-1 justify-start h-14 pr-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full h-full rounded-[var(--radius-md)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--bg-secondary)]"
              style={{ 
                padding: '4px', 
                margin: 0, 
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Logo size="stretch" priority className="w-full h-full" />
            </button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <VStack gap="sm">
          {navigation.map(item => renderNavItem(item))}
        </VStack>
      </nav>

      <div className="p-3 border-t border-[var(--border-primary)]">
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={handleLogout}
          className="justify-start"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {sidebar}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-20 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
          <Container size="full" className="h-full">
            <HStack justify="between" align="center" className="h-full px-4 lg:px-6">
              <HStack gap="md" align="center">
                {/* Mobile menu toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                {/* Desktop sidebar toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:flex"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                {/* Company Name */}
                <Text size="xl" weight="bold" className="text-[var(--color-brand-primary-600)]">
                  {companySettings.name}
                </Text>
              </HStack>

              <HStack gap="md" align="center">
                {/* Username */}
                <HStack gap="sm" align="center">
                  <User className="h-4 w-4 text-[var(--text-secondary)]" />
                  <Text size="sm" color="secondary">
                    {user?.username || 'User'}
                  </Text>
                </HStack>
                
                {/* Theme Toggle */}
                <ThemeToggle variant="icon" />
                
                {/* Logout Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-[var(--text-secondary)] hover:text-[var(--color-semantic-error-600)]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Logout</span>
                </Button>
              </HStack>
            </HStack>
          </Container>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}