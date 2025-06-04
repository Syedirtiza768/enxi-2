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
  User,
  Bell,
  Search,
  ChevronDown,
  UserCircle,
  HelpCircle,
  Clock,
  Globe,
  CheckCircle
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
  avatar?: string
  lastLogin?: string
}

interface CompanySettings {
  name: string
  logo?: string
}

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  timestamp: string
  read: boolean
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default open on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: 'EnXi ERP' })
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
            role: payload.role || payload.user?.role || 'USER',
            lastLogin: new Date().toISOString()
          })
        } catch (error) {
          console.error('Error decoding token:', error)
          // Set a default user if token fails
          setUser({
            username: 'User',
            email: 'user@company.com', 
            role: 'USER',
            lastLogin: new Date().toISOString()
          })
        }
      } else {
        // Set a default user if no token
        setUser({
          username: 'User',
          email: 'user@company.com',
          role: 'USER',
          lastLogin: new Date().toISOString()
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

      // Load mock notifications
      setNotifications([
        {
          id: '1',
          title: 'Low Stock Alert',
          message: '5 items are running low on stock',
          type: 'warning',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          read: false
        },
        {
          id: '2',
          title: 'Payment Received',
          message: 'Payment of $5,000 received from ABC Corp',
          type: 'success',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          read: false
        },
        {
          id: '3',
          title: 'System Update',
          message: 'ERP system will be updated tonight at 2 AM',
          type: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
          read: true
        }
      ])
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now.getTime() - time.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const unreadNotifications = notifications.filter(n => !n.read).length

  const handleNotificationClick = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Bell className="h-4 w-4 text-blue-500" />
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
    <div className="flex flex-col h-screen bg-[var(--bg-secondary)]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Top bar - Full Width */}
      <header className="h-20 bg-[var(--bg-primary)] border-b border-[var(--border-primary)] shadow-sm relative z-30">
        <Container size="full" className="h-full">
          <HStack justify="between" align="center" className="h-full px-4 lg:px-6">
            {/* Left Section */}
            <HStack gap="lg" align="center" className="flex-1">
              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden hover:bg-[var(--bg-secondary)]"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Mobile close button (shows when sidebar is open) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "lg:hidden hover:bg-[var(--bg-secondary)]",
                  sidebarOpen ? "block" : "hidden"
                )}
              >
                <X className="h-5 w-5" />
              </Button>
              
              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex hover:bg-[var(--bg-secondary)]"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Company Name with enhanced styling */}
              <HStack gap="sm" align="center" className="hidden sm:flex">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-brand-primary-500)] to-[var(--color-brand-primary-700)] rounded-lg flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 1024 1024" fill="currentColor">
                    <path d="M320.000000,347.715332 
                      C332.100311,348.112183 343.802460,346.454895 355.257782,349.718781 
                      C376.247314,355.699158 390.335663,374.170837 390.338562,395.951111 
                      C390.347809,464.768341 390.366669,533.585571 390.328857,602.402832 
                      C390.314331,628.830322 371.736664,649.841309 345.453400,653.483582 
                      C342.478607,653.895813 339.537140,654.308167 336.526733,654.307068 
                      C268.209412,654.282471 199.891617,654.416504 131.575134,654.172180 
                      C114.594688,654.111450 100.024834,647.691833 89.506966,633.859009 
                      C82.574516,624.741699 78.777550,614.159607 78.752266,602.765198 
                      C78.601799,534.948181 78.607109,467.130219 78.817444,399.313385 
                      C78.908669,369.900085 101.692734,347.681000 131.047318,347.686249 
                      C193.864883,347.697540 256.682434,347.707031 320.000000,347.715332 
                    M272.041260,415.381683 
                      C232.061234,415.196930 192.084778,415.482513 152.111435,416.248260 
                      C144.202362,416.399811 143.354385,417.198456 143.353241,425.323242 
                      C143.345932,476.968719 143.345657,528.614197 143.352951,580.259644 
                      C143.354004,587.696899 144.314087,588.647766 151.649811,588.656250 
                      C190.800247,588.701355 229.951355,588.642273 269.100464,588.893005 
                      C275.236877,588.932251 279.802673,587.129333 284.094818,582.751099 
                      C300.300629,566.220459 316.856323,550.033508 333.133148,533.571716 
                      C342.027496,524.576233 351.342407,515.987427 359.593750,506.357910 
                      C362.728851,502.699219 362.399841,499.548981 358.944641,496.400299 
                      C356.113831,493.820587 353.332031,491.182800 350.612640,488.485901 
                      C327.313751,465.379883 304.016876,442.271729 280.775940,419.107452 
                      C278.533295,416.872192 276.137146,415.373352 272.041260,415.381683 
                    z"/>
                    <path d="M451.775696,579.936768 
                      C451.805573,560.449463 451.417847,541.442383 451.948700,522.461121 
                      C453.057465,482.814606 452.523621,443.166992 452.573914,403.520294 
                      C452.579803,398.859985 454.144592,397.634430 458.641815,397.546204 
                      C492.624054,396.879272 526.601562,397.750305 560.579590,397.569885 
                      C564.840332,397.547272 566.546448,398.704285 566.395447,403.197968 
                      C566.110291,411.686005 566.353699,420.191132 566.337280,428.689087 
                      C566.325256,434.896698 566.002014,435.273712 559.893921,435.299286 
                      C542.564880,435.371826 525.235291,435.328674 507.906372,435.425201 
                      C493.348877,435.506287 493.348907,435.564819 493.348206,449.918945 
                      C493.347900,456.084167 493.617981,462.264954 493.262756,468.409637 
                      C492.987854,473.165588 494.528076,474.799408 499.410095,474.742798 
                      C517.402954,474.533966 535.400452,474.700928 553.395996,474.764099 
                      C560.325989,474.788422 560.337219,474.834198 560.345032,481.692352 
                      C560.354126,489.690491 560.348999,497.688629 560.334473,505.686737 
                      C560.322327,512.352722 560.312256,512.372803 553.838928,512.380188 
                      C536.842896,512.399475 519.846863,512.390686 502.850830,512.410828 
                      C493.353821,512.422058 493.352356,512.437988 493.349915,521.631042 
                      C493.347839,529.462585 493.339783,537.294067 493.353149,545.125610 
                      C493.364227,551.622925 493.377472,551.708984 500.103790,551.621887 
                      C521.090576,551.350220 542.076050,550.980774 563.062805,550.707581 
                      C569.626709,550.622131 569.886780,550.855103 569.976624,557.320984 
                      C570.099243,566.150574 570.095398,574.982849 570.053711,583.813538 
                      C570.024841,589.919250 569.541870,590.352417 563.468750,590.348999 
                      C529.476746,590.330200 495.484680,590.300354 461.492645,590.270996 
                      C451.815002,590.262634 451.815002,590.257507 451.775696,579.936768 
                    z"/>
                    <path d="M889.418457,581.639587 
                      C890.845886,584.063416 892.860718,585.769775 893.061523,588.394714 
                      C891.778564,590.380188 889.811768,589.993103 888.051025,590.004761 
                      C876.221130,590.082947 864.389221,590.011841 852.561707,590.209961 
                      C849.283203,590.264893 847.466064,588.960754 845.795532,586.254883 
                      C833.984863,567.123413 821.950012,548.132385 809.076111,529.689758 
                      C807.861389,527.949707 806.475830,526.328979 805.245911,524.750793 
                      C802.383240,525.534973 801.694641,527.805969 800.626038,529.553162 
                      C789.244263,548.163757 777.869263,566.779785 766.714905,585.526733 
                      C764.954773,588.484802 763.045288,589.846191 759.658386,589.825378 
                      C747.662415,589.751587 735.665405,589.851501 723.668823,589.856628 
                      C722.356323,589.857178 720.966125,589.896057 719.992554,588.555847 
                      C719.472046,585.988098 721.359741,584.275391 722.528503,582.357666 
                      C739.867737,553.905823 758.244263,526.123840 776.775146,498.441132 
                      C781.613098,491.213898 781.475830,491.219543 776.686340,484.115845 
                      C758.812317,457.604858 740.986633,431.061157 723.155640,404.521210 
                      C721.968323,402.754120 720.886780,400.916077 719.921082,399.374298 
                      C720.695801,397.480652 721.989319,397.691528 723.096619,397.673401 
                      C735.919739,397.462952 748.745239,397.365662 761.565552,397.051971 
                      C765.315186,396.960205 767.674988,398.269379 769.659973,401.548218 
                      C780.181702,418.928955 790.907776,436.186127 801.598022,453.464447 
                      C802.809448,455.422577 804.240356,457.244965 805.944885,459.662659 
                      C811.298279,453.371582 815.095825,446.568634 819.269897,440.085205 
                      C827.382874,427.483795 835.199585,414.688660 842.960022,401.865387 
                      C844.799377,398.826141 846.861267,397.488129 850.536133,397.545746 
                      C862.362061,397.731079 874.194092,397.524719 886.023804,397.498657 
                      C886.804993,397.496948 887.586731,397.740204 889.109741,397.992218 
                      C887.680969,400.482361 886.570007,402.624939 885.272888,404.648132 
                      C867.385559,432.547546 850.601562,461.153229 831.733154,488.421326 
                      C829.602051,491.501038 830.963806,493.563873 832.538940,496.040039 
                      C850.864136,524.848572 869.932739,553.161865 889.418457,581.639587 
                    z"/>
                    <path d="M606.999878,445.726654 
                      C611.165588,445.727386 614.832031,445.717926 618.498413,445.732697 
                      C625.319153,445.760162 625.326599,445.770752 625.347656,452.821686 
                      C625.356079,455.641632 625.348999,458.461609 625.348999,461.581543 
                      C628.025452,461.488129 628.890198,459.468262 630.125854,458.137054 
                      C648.601196,438.233551 682.978638,436.295593 702.506531,454.225281 
                      C712.080872,463.016022 716.497925,474.354523 717.258667,487.078644 
                      C717.705505,494.551636 717.277161,502.073608 717.360229,509.572235 
                      C717.633301,534.228699 717.964233,558.884460 718.263428,583.540649 
                      C718.338440,589.718872 717.992310,590.149902 711.908142,590.219849 
                      C702.743042,590.325256 693.566223,590.054626 684.414551,590.432739 
                      C679.495544,590.635925 678.587341,588.507324 678.606384,584.219543 
                      C678.729126,556.555176 678.174500,528.877441 678.879700,501.230621 
                      C679.202759,488.566406 667.035339,475.715820 652.768921,476.147888 
                      C638.327942,476.585205 626.452881,487.320526 626.396423,501.315979 
                      C626.285461,528.813843 626.355591,556.312378 626.339417,583.810669 
                      C626.335571,590.356323 626.315002,590.367004 619.651245,590.376404 
                      C610.985107,590.388611 602.315918,590.246460 593.654175,590.441528 
                      C589.458191,590.535950 587.588928,589.129700 587.607849,584.722168 
                      C587.776001,545.558960 587.796204,506.395203 587.941711,467.231934 
                      C587.962769,461.574738 588.602417,455.919220 588.604492,450.262787 
                      C588.605835,446.652313 590.244141,445.638062 593.502869,445.732422 
                      C597.831848,445.857788 602.167725,445.740479 606.999878,445.726654 
                    z"/>
                  </svg>
                </div>
                <VStack gap="none">
                  <Text size="lg" weight="bold" className="text-[var(--color-brand-primary-600)] leading-tight">
                    {companySettings.name}
                  </Text>
                  <Text size="xs" color="tertiary" className="leading-tight">
                    Enterprise Resource Planning
                  </Text>
                </VStack>
              </HStack>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search modules, customers, items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)]/20 focus:border-[var(--color-brand-primary-500)] transition-all duration-200"
                  />
                </div>
              </div>
            </HStack>

            {/* Right Section */}
            <HStack gap="sm" align="center">
              {/* Mobile Search Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="md:hidden hover:bg-[var(--bg-secondary)]"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Help */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/help')}
                className="hidden lg:flex hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                title="Help & Documentation"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <Badge 
                      size="xs" 
                      variant="primary" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0 min-w-0"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 top-12 w-80 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-20 max-h-96 overflow-hidden">
                      <div className="p-4 border-b border-[var(--border-primary)]">
                        <HStack justify="between" align="center">
                          <Text weight="semibold">Notifications</Text>
                          <Badge size="xs" variant="secondary">
                            {unreadNotifications} new
                          </Badge>
                        </HStack>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification.id)}
                              className={cn(
                                "p-4 border-b border-[var(--border-secondary)] cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors",
                                !notification.read && "bg-[var(--color-brand-primary-50)] dark:bg-[var(--color-brand-primary-950)]"
                              )}
                            >
                              <HStack gap="sm" align="start">
                                {getNotificationIcon(notification.type)}
                                <VStack gap="xs" className="flex-1">
                                  <HStack justify="between" align="start">
                                    <Text size="sm" weight="medium" className="flex-1">
                                      {notification.title}
                                    </Text>
                                    <Text size="xs" color="tertiary">
                                      {formatTimeAgo(notification.timestamp)}
                                    </Text>
                                  </HStack>
                                  <Text size="xs" color="secondary" className="leading-relaxed">
                                    {notification.message}
                                  </Text>
                                </VStack>
                              </HStack>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center">
                            <Bell className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                            <Text color="secondary" size="sm">No notifications</Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle variant="icon" />

              {/* User Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="hover:bg-[var(--bg-secondary)]"
                >
                  <HStack gap="sm" align="center">
                    <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-brand-primary-500)] to-[var(--color-brand-primary-700)] rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <VStack gap="none" className="hidden sm:block text-left">
                      <Text size="sm" weight="medium" className="leading-tight">
                        {user?.username || 'User'}
                      </Text>
                      <Text size="xs" color="tertiary" className="leading-tight capitalize">
                        {user?.role?.toLowerCase() || 'user'}
                      </Text>
                    </VStack>
                    <ChevronDown className="h-3 w-3 text-[var(--text-tertiary)] hidden sm:block" />
                  </HStack>
                </Button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-12 w-64 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-20">
                      <div className="p-4 border-b border-[var(--border-primary)]">
                        <HStack gap="sm" align="center">
                          <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-brand-primary-500)] to-[var(--color-brand-primary-700)] rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <VStack gap="xs">
                            <Text weight="semibold">{user?.username}</Text>
                            <Text size="sm" color="secondary">{user?.email}</Text>
                            <HStack gap="xs" align="center">
                              <Clock className="h-3 w-3 text-[var(--text-tertiary)]" />
                              <Text size="xs" color="tertiary">
                                Last login: {user?.lastLogin ? formatTimeAgo(user.lastLogin) : 'Now'}
                              </Text>
                            </HStack>
                          </VStack>
                        </HStack>
                      </div>
                      
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={() => router.push('/profile')}
                          className="justify-start mb-1"
                        >
                          <UserCircle className="h-4 w-4 mr-3" />
                          Profile Settings
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={() => router.push('/settings')}
                          className="justify-start mb-1"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Preferences
                        </Button>
                        <div className="border-t border-[var(--border-secondary)] my-2" />
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={handleLogout}
                          className="justify-start text-[var(--color-semantic-error-600)] hover:text-[var(--color-semantic-error-700)] hover:bg-[var(--color-semantic-error-50)] dark:hover:bg-[var(--color-semantic-error-950)]"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </HStack>
          </HStack>
        </Container>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden px-4 pb-4 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search modules, customers, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)]/20 focus:border-[var(--color-brand-primary-500)] transition-all duration-200"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Content area with sidebar and main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebar}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}