'use client'

import { useState, useEffect } from 'react'
import { Role, ProjectMemberRole } from '@prisma/client'
import { useRoleContext } from './role-aware-layout'
import { RoleBasedWelcome, AdminOnly, PermissionGuard } from './role-aware-content'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  FolderOpen,
  BarChart3,
  Activity,
  Clock,
  Plus,
  Edit,
  Eye,
  Settings,
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react'

interface DashboardData {
  stats: {
    totalUsers?: number
    totalProjects?: number
    totalContent?: number
    myContent?: number
    recentViews?: number
    pendingTasks?: number
  }
  recentActivity: Array<{
    id: string
    type: 'created' | 'edited' | 'viewed' | 'joined'
    title: string
    timestamp: string
    user?: string
  }>
  quickActions: Array<{
    title: string
    description: string
    icon: any
    action: string
    variant?: 'default' | 'secondary' | 'outline'
  }>
}

export function RoleAwareDashboard() {
  const { userRole, projectRole, projectId } = useRoleContext()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching dashboard data based on role
    const fetchDashboardData = async () => {
      setLoading(true)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const data = getDashboardDataByRole(userRole, projectRole)
      setDashboardData(data)
      setLoading(false)
    }

    fetchDashboardData()
  }, [userRole, projectRole])

  const getDashboardDataByRole = (role: Role, projectRole?: ProjectMemberRole | null): DashboardData => {
    const baseData: DashboardData = {
      stats: {},
      recentActivity: [
        {
          id: '1',
          type: 'created',
          title: 'Getting Started Guide',
          timestamp: '2 hours ago',
          user: 'John Doe'
        },
        {
          id: '2',
          type: 'edited',
          title: 'API Documentation',
          timestamp: '4 hours ago',
          user: 'Jane Smith'
        },
        {
          id: '3',
          type: 'viewed',
          title: 'Installation Instructions',
          timestamp: '1 day ago'
        }
      ],
      quickActions: []
    }

    // Admin dashboard
    if (role === Role.SUPER_ADMIN || role === Role.ORG_ADMIN || 
        (projectRole && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(projectRole))) {
      return {
        ...baseData,
        stats: {
          totalUsers: 247,
          totalProjects: 32,
          totalContent: 156,
          recentViews: 1247,
          pendingTasks: 8
        },
        quickActions: [
          {
            title: 'Create Project',
            description: 'Start a new documentation project',
            icon: FolderOpen,
            action: '/dashboard/projects/create'
          },
          {
            title: 'Manage Users',
            description: 'Add or modify user accounts',
            icon: Users,
            action: '/dashboard/users'
          },
          {
            title: 'View Analytics',
            description: 'Check platform usage statistics',
            icon: BarChart3,
            action: '/dashboard/analytics',
            variant: 'outline' as const
          },
          {
            title: 'System Settings',
            description: 'Configure platform settings',
            icon: Settings,
            action: '/dashboard/settings',
            variant: 'secondary' as const
          }
        ]
      }
    }

    // Manager/User dashboard
    if (role === Role.MANAGER || role === Role.USER || 
        (projectRole && projectRole === ProjectMemberRole.MEMBER)) {
      return {
        ...baseData,
        stats: {
          myContent: 23,
          totalProjects: 5,
          recentViews: 89,
          pendingTasks: 3
        },
        quickActions: [
          {
            title: 'Create Content',
            description: 'Write new documentation',
            icon: Edit,
            action: '/dashboard/content/create'
          },
          {
            title: 'Browse Projects',
            description: 'View your assigned projects',
            icon: FolderOpen,
            action: '/dashboard/projects/my-projects'
          },
          {
            title: 'My Drafts',
            description: 'Continue working on drafts',
            icon: FileText,
            action: '/dashboard/content/my-drafts',
            variant: 'outline' as const
          }
        ]
      }
    }

    // Viewer dashboard
    return {
      ...baseData,
      stats: {
        recentViews: 34,
        totalContent: 156
      },
      quickActions: [
        {
          title: 'Browse Documentation',
          description: 'Explore available content',
          icon: Eye,
          action: '/dashboard/browse/all'
        },
        {
          title: 'My Bookmarks',
          description: 'View saved documentation',
          icon: FileText,
          action: '/dashboard/bookmarks',
          variant: 'outline' as const
        },
        {
          title: 'Search Content',
          description: 'Find specific information',
          icon: Activity,
          action: '/dashboard/search',
          variant: 'secondary' as const
        }
      ]
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created': return <Plus className="h-4 w-4 text-green-500" />
      case 'edited': return <Edit className="h-4 w-4 text-blue-500" />
      case 'viewed': return <Eye className="h-4 w-4 text-gray-500" />
      case 'joined': return <Users className="h-4 w-4 text-purple-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <RoleBasedWelcome />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData.stats.totalUsers && (
          <AdminOnly>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>
          </AdminOnly>
        )}

        {dashboardData.stats.totalProjects && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userRole === Role.SUPER_ADMIN || userRole === Role.ORG_ADMIN ? 'Total Projects' : 'My Projects'}
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                Active projects
              </p>
            </CardContent>
          </Card>
        )}

        {(dashboardData.stats.totalContent || dashboardData.stats.myContent) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dashboardData.stats.totalContent ? 'Total Content' : 'My Content'}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.stats.totalContent || dashboardData.stats.myContent}
              </div>
              <p className="text-xs text-muted-foreground">
                Documentation pages
              </p>
            </CardContent>
          </Card>
        )}

        {dashboardData.stats.recentViews && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.recentViews}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks based on your role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Button
                    key={index}
                    variant={action.variant || 'default'}
                    className="h-auto p-4 justify-start text-left"
                    asChild
                  >
                    <a href={action.action}>
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {action.description}
                          </div>
                        </div>
                      </div>
                    </a>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{activity.timestamp}</span>
                      {activity.user && (
                        <>
                          <span>by</span>
                          <span className="font-medium">{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin-only section */}
      <AdminOnly>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Administrative Tasks
            </CardTitle>
            <CardDescription>
              Items requiring admin attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending user approvals</span>
                <Badge variant="secondary">3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">System updates available</span>
                <Badge variant="outline">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Security alerts</span>
                <Badge variant="destructive">1</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminOnly>

      {/* Permission-based analytics */}
      <PermissionGuard permissions={[Permission.VIEW_ANALYTICS]}>
        <Card>
          <CardHeader>
            <CardTitle>Usage Analytics</CardTitle>
            <CardDescription>
              Platform usage insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Analytics dashboard would be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  )
}
