'use client'

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Container, 
  VStack, 
  HStack, 
  Button, 
  Text,
  Badge,
  ThemeToggle
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
  Wallet,
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
  CheckCircle
} from 'lucide-react'

// Memoized navigation items to prevent unnecessary re-renders
const NAVIGATION_ITEMS = [
  { 
    title: 'Dashboard', 
    href: '/dashboard', 
    icon: Home,
    description: 'Overview and analytics'
  },
  { 
    title: 'Sales', 
    icon: TrendingUp,
    description: 'Sales management',
    items: [
      { title: 'Leads', href: '/leads', icon: UserCheck },
      { title: 'Quotations', href: '/quotations', icon: FileText },
      { title: 'Sales Orders', href: '/sales-orders', icon: ShoppingCart },
      { title: 'Sales Cases', href: '/sales-cases', icon: Briefcase },
      { title: 'Invoices', href: '/invoices', icon: Receipt },
      { title: 'Customer POs', href: '/customer-pos', icon: ClipboardList },
      { title: 'Sales Team', href: '/sales-team', icon: UserCheck },
    ]
  },
  // ... other items would go here - truncated for brevity
] as const

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

// Memoized sidebar item component
const SidebarItem = memo(({ 
  item, 
  pathname, 
  expanded, 
  onToggle, 
  collapsed 
}: {
  item: any
  pathname: string
  expanded: boolean
  onToggle: () => void
  collapsed: boolean
}) => {
  const isActive = pathname === item.href || 
    (item.items && item.items.some((subItem: any) => pathname === subItem.href))

  if (item.items) {
    return (
      <div className="space-y-1">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-between text-left font-normal h-10",
            collapsed ? "px-2" : "px-3",
            isActive && "bg-accent text-accent-foreground"
          )}
          onClick={onToggle}
          title={collapsed ? item.title : undefined}
        >
          <div className="flex items-center space-x-3">
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <span className="truncate">{item.title}</span>
            )}
          </div>
          {!collapsed && (
            <ChevronRight 
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                expanded && "rotate-90"
              )} 
            />
          )}
        </Button>
        
        {expanded && !collapsed && (
          <div className="ml-4 space-y-1 border-l border-border pl-4">
            {item.items.map((subItem: any) => (
              <SidebarSubItem 
                key={subItem.href} 
                item={subItem} 
                pathname={pathname} 
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Button 
      variant="ghost" 
      className={cn(
        "w-full justify-start text-left font-normal h-10",
        collapsed ? "px-2" : "px-3",
        pathname === item.href && "bg-accent text-accent-foreground"
      )}
      asChild
    >
      <a href={item.href} title={collapsed ? item.title : undefined}>
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <span className="ml-3 truncate">{item.title}</span>
        )}
      </a>
    </Button>
  )
})

SidebarItem.displayName = 'SidebarItem'

// Memoized sub-item component
const SidebarSubItem = memo(({ item, pathname }: { item: any, pathname: string }) => (
  <Button 
    variant="ghost" 
    size="sm"
    className={cn(
      "w-full justify-start text-left font-normal h-8",
      pathname === item.href && "bg-accent text-accent-foreground"
    )}
    asChild
  >
    <a href={item.href}>
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="ml-2 truncate text-sm">{item.title}</span>
    </a>
  </Button>
))

SidebarSubItem.displayName = 'SidebarSubItem'

// Memoized user menu component
const UserMenu = memo(({ user, show, onToggle }: {
  user: UserInfo | null
  show: boolean
  onToggle: () => void
}) => {
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }, [])

  if (!user) return null

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm"
        className="gap-2"
        onClick={onToggle}
      >
        <UserCircle className="h-5 w-5" />
        <span className="hidden md:inline">{user.username}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      
      {show && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-md shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <Text variant="sm" className="font-medium">{user.username}</Text>
            <Text variant="xs" className="text-muted-foreground">{user.email}</Text>
            <Badge variant="secondary" className="mt-1">
              {user.role}
            </Badge>
          </div>
          
          <div className="p-2">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <User className="h-4 w-4" />
              Profile Settings
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <HelpCircle className="h-4 w-4" />
              Help & Support
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

UserMenu.displayName = 'UserMenu'

// Main optimized AppLayout component
export const AppLayoutOptimized = memo(({ children }: AppLayoutProps) => {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: 'EnXi ERP' })
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Memoized callbacks to prevent unnecessary re-renders
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const toggleSidebarCollapse = useCallback(() => setSidebarCollapsed(prev => !prev), [])
  const toggleUserMenu = useCallback(() => setShowUserMenu(prev => !prev), [])

  const toggleExpanded = useCallback((title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }, [])

  // Memoized user loading effect
  useEffect(() => {
    let mounted = true
    
    const loadUserInfo = async (): Promise<void> => {
      const token = localStorage.getItem('token')
      if (token && mounted) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUser({
            username: payload.username || payload.name || payload.user?.username || 'User',
            email: payload.email || payload.user?.email || 'user@company.com',
            role: payload.role || payload.user?.role || 'USER',
            lastLogin: new Date().toISOString()
          })
        } catch (error) {
          console.error('Error parsing token:', error)
        }
      }

      try {
        const savedCompanyName = localStorage.getItem('companyName')
        if (savedCompanyName && mounted) {
          setCompanySettings({ name: savedCompanyName })
        }
      } catch (error) {
        console.error('Error loading company settings:', error)
      }
    }

    loadUserInfo()
    
    return () => {
      mounted = false
    }
  }, [])

  // Memoized sidebar items
  const sidebarItems = useMemo(() => 
    NAVIGATION_ITEMS.map(item => (
      <SidebarItem
        key={item.title}
        item={item}
        pathname={pathname}
        expanded={expandedItems.includes(item.title)}
        onToggle={() => toggleExpanded(item.title)}
        collapsed={sidebarCollapsed}
      />
    )), 
    [pathname, expandedItems, sidebarCollapsed, toggleExpanded]
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "bg-card border-r border-border transition-all duration-300",
        sidebarOpen ? (sidebarCollapsed ? "w-16" : "w-64") : "w-0",
        "overflow-hidden"
      )}>
        <div className="flex flex-col h-full">
          {/* Company Header */}
          <div className={cn(
            "p-4 border-b border-border",
            sidebarCollapsed && "px-2"
          )}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <Text className="text-primary-foreground font-bold text-sm">
                  {companySettings.name.charAt(0)}
                </Text>
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <Text className="font-semibold truncate">
                    {companySettings.name}
                  </Text>
                  <Text variant="xs" className="text-muted-foreground">
                    ERP System
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className={cn("space-y-1", sidebarCollapsed ? "px-2" : "px-3")}>
              {sidebarItems}
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className={cn(
            "p-4 border-t border-border",
            sidebarCollapsed && "px-2"
          )}>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebarCollapse}
                className={cn(sidebarCollapsed && "w-full")}
              >
                <Menu className="h-4 w-4" />
                {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
              </Button>
              
              {!sidebarCollapsed && <ThemeToggle />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <UserMenu 
                user={user} 
                show={showUserMenu} 
                onToggle={toggleUserMenu} 
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Container className="py-6">
            {children}
          </Container>
        </main>
      </div>
    </div>
  )
})

AppLayoutOptimized.displayName = 'AppLayoutOptimized'