'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Role } from '@prisma/client'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  FolderOpen, 
  Users, 
  Activity, 
  TrendingUp, 
  Settings,
  Plus,
  Shield,
  AlertTriangle,
  Calendar,
  BarChart3,
  UserPlus,
  Clock
} from 'lucide-react'
import { ProjectManagement } from './project-management'
import { TeamCollaboration } from './team-collaboration'

interface Project {
  id: string
  name: string
  slug: string
  description?: string
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'
  memberCount: number
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name?: string
      email: string
      imageUrl?: string
    }
  }>
  createdAt: string
  updatedAt: string
}

interface TeamMember {
  id: string
  name?: string
  email: string
  imageUrl?: string
  organizationRole: Role
  projects: Array<{
    projectId: string
    projectName: string
    projectSlug: string
    role: string
    joinedAt: string
  }>
}

interface ManagerAnalytics {
  totalProjects: number
  totalMembers: number
  activeProjects: number
  projectsCreatedThisPeriod: number
  membersAddedThisPeriod: number
  projectsByStatus: {
    ACTIVE: number
    DRAFT: number
    ARCHIVED: number
  }
  membersByRole: {
    OWNER: number
    ADMIN: number
    MEMBER: number
    VIEWER: number
  }
  recentActivity: Array<{
    type: string
    projectId?: string
    projectName?: string
    userId?: string
    userName?: string
    timestamp: string
    description: string
  }>
  topProjects: Array<{
    id: string
    name: string
    slug: string
    memberCount: number
    status: string
    createdAt: string
  }>
  period: number
}

interface ManagerDashboardProps {
  className?: string
}

export function ManagerDashboard({ className }: ManagerDashboardProps) {
  const { isManager, loading: roleLoading } = useUserRoleCheck()
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch manager data
  useEffect(() => {
    if (!isManager || roleLoading) return

    const fetchManagerData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch managed projects
        const projectsResponse = await fetch('/api/manager/projects')
        if (!projectsResponse.ok) {
          throw new Error('Failed to fetch managed projects')
        }
        const projectsData = await projectsResponse.json()
        setProjects(projectsData.data)

        // Fetch team members
        const teamResponse = await fetch('/api/manager/team')
        if (!teamResponse.ok) {
          throw new Error('Failed to fetch team members')
        }
        const teamData = await teamResponse.json()
        setTeamMembers(teamData.data.members)

        // Fetch analytics
        const analyticsResponse = await fetch('/api/manager/analytics')
        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData.data)

      } catch (err) {
        console.error('Error fetching manager data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load manager data')
      } finally {
        setLoading(false)
      }
    }

    fetchManagerData()
  }, [isManager, roleLoading])

  // Access denied for non-managers
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You don't have permission to access the Manager dashboard. 
          This area is restricted to project managers only.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-semibold">Error Loading Dashboard</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'DRAFT': return 'secondary'
      case 'ARCHIVED': return 'outline'
      default: return 'secondary'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default'
      case 'ADMIN': return 'secondary'
      case 'MEMBER': return 'outline'
      case 'VIEWER': return 'outline'
      default: return 'secondary'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_updated': return <Settings className="w-4 h-4" />
      case 'member_added': return <UserPlus className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
        <p className="text-muted-foreground">
          Oversee your assigned projects and coordinate team efforts
        </p>
      </div>

      {/* Key Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Managed Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                <span className={analytics.projectsCreatedThisPeriod >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {analytics.projectsCreatedThisPeriod >= 0 ? '+' : ''}{analytics.projectsCreatedThisPeriod}
                </span>
                {' '}this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                <span className={analytics.membersAddedThisPeriod >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {analytics.membersAddedThisPeriod >= 0 ? '+' : ''}{analytics.membersAddedThisPeriod}
                </span>
                {' '}this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalProjects > 0 
                  ? `${Math.round((analytics.activeProjects / analytics.totalProjects) * 100)}% of total`
                  : 'No projects yet'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>
                    Your most recently updated projects
                  </CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/projects/create">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.memberCount} members • {project.slug}
                        </p>
                      </div>
                      <Badge variant={getProjectStatusColor(project.status)}>
                        {project.status.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No projects assigned yet. Contact your organization admin to get started.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates from your managed projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!analytics?.recentActivity || analytics.recentActivity.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity to show.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Status Overview */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Project Status Overview</CardTitle>
                <CardDescription>
                  Distribution of your managed projects by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Projects</span>
                      <Badge variant="default">{analytics.projectsByStatus.ACTIVE}</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: analytics.totalProjects > 0 
                            ? `${(analytics.projectsByStatus.ACTIVE / analytics.totalProjects) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Draft Projects</span>
                      <Badge variant="secondary">{analytics.projectsByStatus.DRAFT}</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ 
                          width: analytics.totalProjects > 0 
                            ? `${(analytics.projectsByStatus.DRAFT / analytics.totalProjects) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Archived Projects</span>
                      <Badge variant="outline">{analytics.projectsByStatus.ARCHIVED}</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full" 
                        style={{ 
                          width: analytics.totalProjects > 0 
                            ? `${(analytics.projectsByStatus.ARCHIVED / analytics.totalProjects) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects">
          <ProjectManagement projects={projects} />
        </TabsContent>

        <TabsContent value="team">
          <TeamCollaboration members={teamMembers} />
        </TabsContent>

        <TabsContent value="analytics">
          {analytics && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Analytics</CardTitle>
                  <CardDescription>
                    Detailed insights for your managed projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Project Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Projects</span>
                          <span className="text-sm font-medium">{analytics.totalProjects}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Active Projects</span>
                          <span className="text-sm font-medium">{analytics.activeProjects}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Draft Projects</span>
                          <span className="text-sm font-medium">{analytics.projectsByStatus.DRAFT}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Archived Projects</span>
                          <span className="text-sm font-medium">{analytics.projectsByStatus.ARCHIVED}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Team Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Members</span>
                          <span className="text-sm font-medium">{analytics.totalMembers}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Project Owners</span>
                          <span className="text-sm font-medium">{analytics.membersByRole.OWNER}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Project Admins</span>
                          <span className="text-sm font-medium">{analytics.membersByRole.ADMIN}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Regular Members</span>
                          <span className="text-sm font-medium">{analytics.membersByRole.MEMBER}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Projects</CardTitle>
                  <CardDescription>
                    Your most active projects by team size
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topProjects.map((project, index) => (
                      <div key={project.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{project.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(project.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getProjectStatusColor(project.status)}>
                            {project.status.toLowerCase()}
                          </Badge>
                          <span className="text-sm font-medium">{project.memberCount} members</span>
                        </div>
                      </div>
                    ))}
                    {analytics.topProjects.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No projects to display.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}