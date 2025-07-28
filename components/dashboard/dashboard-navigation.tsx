'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Role } from '@prisma/client'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Menu,
  Home,
  Building2,
  FolderOpen,
  FileText,
  Users,
  Settings,
  Brain,
  BarChart3,
  Shield,
  Eye,
  ChevronDown,
  Activity,
  Calendar,
  Search,
  Plus
} from 'lucide-react'

interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
  badge?: string
  description?: string
}

const DASHBOARD_NAVIGATION: NavigationItem[] = [
  {
    title: 'Platform Admin',
    href: '/admin/dashboard',
    icon: Shield,
    roles: [Role.SUPER_ADMIN],
    badge: 'Admin',
    description: 'Platform-wide administration'
  },
  {
    title: 'Organization',
    href: '/dashboard/organization',
    icon: Building2,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN],
    description: 'Organization management and AI features'
  },
  {
    title: 'Projects',
    href: '/dashboard/projects',
    icon: FolderOpen,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER],
    description: 'Project management and coordination'
  },
  {
    title: 'Documents',
    href: '/dashboard/docs',
    icon: FileText,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER],
    description: 'Document creation and editing'
  },
  {
    title: 'Browse',
    href: '/dashboard/browse',
    icon: Eye,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER, Role.VIEWER],
    description: 'Browse and view documents'
  }
]

const QUICK_ACTIONS: Array<{
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}> = [
  {
    title: 'New Document',
    href: '/dashboard/docs/create',
    icon: Plus,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER]
  },
  {
    title: 'Search',
    href: '/dashboard/search',
    icon: Search,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER, Role.VIEWER]
  },
  {
    title: 'Team Management',
    href: '/dashboard/team',
    icon: Users,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER]
  },
  {
    title: 'AI Assistant',
    href: '/dashboard/ai-assistant',
    icon: Brain,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN]
  }
]

interface DashboardNavigationProps {
  className?: string
}

export function DashboardNavigation({ className }: DashboardNavigationProps) {
  const pathname = usePathname()
  const { userRole, isSuperAdmin, isOrgAdmin, isManager, isUser } = useUserRoleCheck()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getAvailableNavItems = () => {
    if (!userRole) return []
    return DASHBOARD_NAVIGATION.filter(item => item.roles.includes(userRole.role))
  }

  const getAvailableQuickActions = () => {
    if (!userRole) return []
    return QUICK_ACTIONS.filter(action => action.roles.includes(userRole.role))
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true
    if (href !== '/dashboard' && pathname.startsWith(href)) return true
    return false
  }

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN: return 'bg-red-500 text-white'
      case Role.ORG_ADMIN: return 'bg-blue-500 text-white'
      case Role.MANAGER: return 'bg-green-500 text-white'
      case Role.USER: return 'bg-purple-500 text-white'
      case Role.VIEWER: return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const availableNavItems = getAvailableNavItems()
  const availableQuickActions = getAvailableQuickActions()

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={cn('hidden lg:flex items-center space-x-1', className)}>
        {availableNavItems.map((item) => {
          const Icon = item.icon
          const isActive = isActiveRoute(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}

        {/* Quick Actions Dropdown */}
        {availableQuickActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2">
                <Plus className="w-4 h-4 mr-2" />
                Quick Actions
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableQuickActions.map((action) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem key={action.href} asChild>
                    <Link href={action.href} className="flex items-center">
                      <Icon className="w-4 h-4 mr-2" />
                      {action.title}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Role Badge */}
        {userRole && (
          <Badge className={cn('ml-4', getRoleBadgeColor(userRole.role))}>
            {userRole.role.toString().replace('_', ' ').toLowerCase()}
          </Badge>
        )}
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
                {userRole && (
                  <Badge className={getRoleBadgeColor(userRole.role)}>
                    {userRole.role.toString().replace('_', ' ').toLowerCase()}
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* Main Navigation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Navigation
                </h3>
                <div className="space-y-1">
                  {availableNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isActiveRoute(item.href)
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span>{item.title}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              {availableQuickActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-1">
                    {availableQuickActions.map((action) => {
                      const Icon = action.icon
                      
                      return (
                        <Link
                          key={action.href}
                          href={action.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{action.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

// Breadcrumb component for dashboard pages
interface DashboardBreadcrumbProps {
  items: Array<{
    title: string
    href?: string
  }>
}

export function DashboardBreadcrumb({ items }: DashboardBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.title}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.title}</span>
          )}
        </div>
      ))}
    </nav>
  )
}