'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  Shield, 
  Building2, 
  FolderOpen, 
  FileText, 
  Eye, 
  Users, 
  Brain, 
  Search, 
  Plus,
  ArrowRight,
  Activity,
  BarChart3
} from 'lucide-react'
import { Role } from '@prisma/client'

interface DashboardSection {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
  badge?: string
  primary?: boolean
  actions?: Array<{
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }>
}

const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    title: 'Platform Administration',
    description: 'Manage the entire platform, organizations, and system-wide settings',
    href: '/admin/dashboard',
    icon: Shield,
    roles: [Role.SUPER_ADMIN],
    badge: 'Admin Only',
    primary: true,
    actions: [
      { title: 'View Organizations', href: '/admin/organizations', icon: Building2 },
      { title: 'System Analytics', href: '/admin/analytics', icon: BarChart3 },
      { title: 'User Management', href: '/admin/users', icon: Users }
    ]
  },
  {
    title: 'Organization Management',
    description: 'Manage your organization, team members, and AI-powered features',
    href: '/dashboard/organization',
    icon: Building2,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN],
    primary: true,
    actions: [
      { title: 'Team Management', href: '/dashboard/team', icon: Users },
      { title: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Brain },
      { title: 'Organization Settings', href: '/dashboard/settings', icon: Activity }
    ]
  },
  {
    title: 'Project Management',
    description: 'Oversee projects, coordinate teams, and manage documentation workflows',
    href: '/dashboard/projects',
    icon: FolderOpen,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER],
    primary: true,
    actions: [
      { title: 'Create Project', href: '/dashboard/projects/create', icon: Plus },
      { title: 'Team Collaboration', href: '/dashboard/team', icon: Users },
      { title: 'Project Analytics', href: '/dashboard/analytics', icon: BarChart3 }
    ]
  },
  {
    title: 'Document Management',
    description: 'Create, edit, and manage your documentation with AI assistance',
    href: '/dashboard/docs',
    icon: FileText,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER],
    primary: true,
    actions: [
      { title: 'Create Document', href: '/dashboard/docs/create', icon: Plus },
      { title: 'Search Documents', href: '/dashboard/search', icon: Search },
      { title: 'Recent Activity', href: '/dashboard/activity', icon: Activity }
    ]
  },
  {
    title: 'Browse & View',
    description: 'Browse and view documents across all accessible projects',
    href: '/dashboard/browse',
    icon: Eye,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER, Role.VIEWER],
    actions: [
      { title: 'Search All', href: '/dashboard/search', icon: Search },
      { title: 'Recent Documents', href: '/dashboard/recent', icon: Activity }
    ]
  }
]

const QUICK_ACTIONS = [
  {
    title: 'Create Document',
    description: 'Start writing a new document',
    href: '/dashboard/docs/create',
    icon: Plus,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER]
  },
  {
    title: 'Search Everything',
    description: 'Find any document quickly',
    href: '/dashboard/search',
    icon: Search,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER, Role.VIEWER]
  },
  {
    title: 'AI Assistant',
    description: 'Generate content with AI',
    href: '/dashboard/ai-assistant',
    icon: Brain,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN]
  },
  {
    title: 'Team Management',
    description: 'Manage team members',
    href: '/dashboard/team',
    icon: Users,
    roles: [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER]
  }
]

interface DashboardOverviewProps {
  className?: string
}

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const { userRole, loading, isSuperAdmin, isOrgAdmin, isManager, isUser } = useUserRoleCheck()
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  const getAvailableSections = () => {
    if (!userRole) return []
    return DASHBOARD_SECTIONS.filter(section => section.roles.includes(userRole.role))
  }

  const getAvailableQuickActions = () => {
    if (!userRole) return []
    return QUICK_ACTIONS.filter(action => action.roles.includes(userRole.role))
  }

  const getPrimaryDashboard = () => {
    const availableSections = getAvailableSections()
    return availableSections.find(section => section.primary) || availableSections[0]
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!userRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Access Required</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Unable to determine your access level. Please contact your administrator.
        </p>
      </div>
    )
  }

  const availableSections = getAvailableSections()
  const availableQuickActions = getAvailableQuickActions()
  const primaryDashboard = getPrimaryDashboard()

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Access all your available dashboard sections and tools
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getRoleBadgeColor(userRole.role)}>
            {userRole.role.toString().replace('_', ' ').toLowerCase()}
          </Badge>
          {primaryDashboard && (
            <Button asChild>
              <Link href={primaryDashboard.href}>
                Go to Main Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {availableQuickActions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableQuickActions.map((action) => {
              const Icon = action.icon
              return (
                <Card key={action.href} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <Link href={action.href} className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {action.description}
                        </p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Dashboard Sections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Dashboards</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {availableSections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.href} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{section.title}</span>
                          {section.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {section.badge}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Main dashboard link */}
                  <Button asChild className="w-full">
                    <Link href={section.href}>
                      Open {section.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  {/* Quick actions for this section */}
                  {section.actions && section.actions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Quick Actions:</h4>
                      <div className="flex flex-wrap gap-2">
                        {section.actions.map((action) => {
                          const ActionIcon = action.icon
                          return (
                            <Button
                              key={action.href}
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={action.href} className="flex items-center space-x-1">
                                <ActionIcon className="w-3 h-3" />
                                <span>{action.title}</span>
                              </Link>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest actions across all dashboard sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity to show.</p>
            <p className="text-sm mt-2">Start using the dashboard to see your activity here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}