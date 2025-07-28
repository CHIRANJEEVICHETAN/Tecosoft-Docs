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
  Building2, 
  Users, 
  FolderOpen, 
  Brain,
  TrendingUp, 
  Settings,
  Plus,
  Shield,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { AIAssistantInterface } from './ai-assistant-interface'
import { TeamManagement } from './team-management'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  slug: string
  description?: string
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'
  memberCount: number
  createdAt: string
  updatedAt: string
}

interface TeamMember {
  id: string
  name?: string
  email: string
  role: Role
  imageUrl?: string
  createdAt: string
}

interface AIUsageMetrics {
  totalGenerations: number
  totalDocuments: number
  monthlyUsage: number
  usageLimit: number
  remainingCredits: number
}

interface OrganizationAnalytics {
  projectsCreated: number
  documentsCreated: number
  teamGrowth: number
  aiUsageGrowth: number
}

interface OrgAdminDashboardProps {
  className?: string
}

export function OrgAdminDashboard({ className }: OrgAdminDashboardProps) {
  const { isOrgAdmin, loading: roleLoading } = useUserRoleCheck()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [aiUsage, setAiUsage] = useState<AIUsageMetrics | null>(null)
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch organization data
  useEffect(() => {
    if (!isOrgAdmin || roleLoading) return

    const fetchOrganizationData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch organization details
        const orgResponse = await fetch('/api/organization/details')
        if (!orgResponse.ok) {
          throw new Error('Failed to fetch organization details')
        }
        const orgData = await orgResponse.json()
        setOrganization(orgData.data)

        // Fetch projects
        const projectsResponse = await fetch('/api/organization/projects')
        if (!projectsResponse.ok) {
          throw new Error('Failed to fetch projects')
        }
        const projectsData = await projectsResponse.json()
        setProjects(projectsData.data)

        // Fetch team members
        const teamResponse = await fetch('/api/organization/team')
        if (!teamResponse.ok) {
          throw new Error('Failed to fetch team members')
        }
        const teamData = await teamResponse.json()
        setTeamMembers(teamData.data)

        // Fetch AI usage metrics
        const aiResponse = await fetch('/api/organization/ai-usage')
        if (!aiResponse.ok) {
          throw new Error('Failed to fetch AI usage')
        }
        const aiData = await aiResponse.json()
        setAiUsage(aiData.data)

        // Fetch analytics
        const analyticsResponse = await fetch('/api/organization/analytics')
        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData.data)

      } catch (err) {
        console.error('Error fetching organization data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load organization data')
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizationData()
  }, [isOrgAdmin, roleLoading])

  // Access denied for non-org admins
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isOrgAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You don't have permission to access the Organization Admin dashboard. 
          This area is restricted to organization administrators only.
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-muted animate-pulse rounded-lg" />
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

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ORG_ADMIN: return 'default'
      case Role.MANAGER: return 'secondary'
      case Role.USER: return 'outline'
      case Role.VIEWER: return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {organization?.name} Administration
        </h1>
        <p className="text-muted-foreground">
          Manage your organization, team, and AI-powered documentation
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              <span className={analytics?.projectsCreated && analytics.projectsCreated >= 0 ? 'text-green-600' : 'text-red-600'}>
                {analytics?.projectsCreated && analytics.projectsCreated >= 0 ? '+' : ''}{analytics?.projectsCreated || 0}
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
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              <span className={analytics?.teamGrowth && analytics.teamGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {analytics?.teamGrowth && analytics.teamGrowth >= 0 ? '+' : ''}{analytics?.teamGrowth || 0}
              </span>
              {' '}this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiUsage?.totalGenerations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {aiUsage?.remainingCredits || 0} credits remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiUsage?.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className={analytics?.documentsCreated && analytics.documentsCreated >= 0 ? 'text-green-600' : 'text-red-600'}>
                {analytics?.documentsCreated && analytics.documentsCreated >= 0 ? '+' : ''}{analytics?.documentsCreated || 0}
              </span>
              {' '}this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
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
                    Latest projects in your organization
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
                      No projects yet. Create your first project to get started.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Overview</CardTitle>
                  <CardDescription>
                    Your organization team members
                  </CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/team">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{member.name || member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Badge variant={getRoleColor(member.role)}>
                        {member.role.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members yet. Invite your first team member.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Usage Overview */}
          {aiUsage && (
            <Card>
              <CardHeader>
                <CardTitle>AI Usage Overview</CardTitle>
                <CardDescription>
                  Your organization's AI-powered content generation usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Monthly Usage</p>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold">{aiUsage.monthlyUsage}</div>
                      <div className="text-sm text-muted-foreground">/ {aiUsage.usageLimit}</div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${Math.min((aiUsage.monthlyUsage / aiUsage.usageLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Total Generations</p>
                    <div className="text-2xl font-bold">{aiUsage.totalGenerations}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className={analytics?.aiUsageGrowth && analytics.aiUsageGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {analytics?.aiUsageGrowth && analytics.aiUsageGrowth >= 0 ? '+' : ''}{analytics?.aiUsageGrowth || 0}%
                      </span>
                      {' '}from last month
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Remaining Credits</p>
                    <div className="text-2xl font-bold">{aiUsage.remainingCredits}</div>
                    <p className="text-xs text-muted-foreground">
                      Credits reset monthly
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-assistant">
          <AIAssistantInterface />
        </TabsContent>

        <TabsContent value="team">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Organization Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and insights for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Growth Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Projects Created</span>
                      <span className="text-sm font-medium">+{analytics?.projectsCreated || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Documents Created</span>
                      <span className="text-sm font-medium">+{analytics?.documentsCreated || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Team Growth</span>
                      <span className="text-sm font-medium">+{analytics?.teamGrowth || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Usage Growth</span>
                      <span className="text-sm font-medium">{analytics?.aiUsageGrowth || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Current Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Projects</span>
                      <span className="text-sm font-medium">{projects.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Projects</span>
                      <span className="text-sm font-medium">
                        {projects.filter(p => p.status === 'ACTIVE').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Team Members</span>
                      <span className="text-sm font-medium">{teamMembers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Credits Used</span>
                      <span className="text-sm font-medium">
                        {aiUsage ? aiUsage.usageLimit - aiUsage.remainingCredits : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}