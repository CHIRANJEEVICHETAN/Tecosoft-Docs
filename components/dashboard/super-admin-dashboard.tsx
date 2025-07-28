'use client'

import { useState, useEffect } from 'react'
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
  DollarSign, 
  Activity, 
  TrendingUp, 
  Server, 
  Database,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { OrganizationManagement } from './organization-management'
import { SubscriptionOverview } from './subscription-overview'
import { PlatformAnalytics } from './platform-analytics'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  userCount: number
  projectCount: number
  status: 'active' | 'suspended' | 'trial'
  subscription: {
    plan: string
    status: string
    mrr: number
  }
  createdAt: string
  updatedAt: string
}

interface PlatformMetrics {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  activeUsers: number
  totalProjects: number
  monthlyRevenue: number
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    responseTime: number
    errorRate: number
  }
  growth: {
    organizationsGrowth: number
    usersGrowth: number
    revenueGrowth: number
  }
}

interface SuperAdminDashboardProps {
  className?: string
}

export function SuperAdminDashboard({ className }: SuperAdminDashboardProps) {
  const { isSuperAdmin, loading: roleLoading } = useUserRoleCheck()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch platform data
  useEffect(() => {
    if (!isSuperAdmin || roleLoading) return

    const fetchPlatformData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch platform metrics
        const metricsResponse = await fetch('/api/admin/platform/metrics')
        if (!metricsResponse.ok) {
          throw new Error('Failed to fetch platform metrics')
        }
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.data)

        // Fetch organizations
        const orgsResponse = await fetch('/api/admin/organizations')
        if (!orgsResponse.ok) {
          throw new Error('Failed to fetch organizations')
        }
        const orgsData = await orgsResponse.json()
        setOrganizations(orgsData.data)

      } catch (err) {
        console.error('Error fetching platform data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load platform data')
      } finally {
        setLoading(false)
      }
    }

    fetchPlatformData()
  }, [isSuperAdmin, roleLoading])

  // Access denied for non-super admins
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You don't have permission to access the Super Admin dashboard. 
          This area is restricted to platform administrators only.
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

  const getSystemHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getSystemHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <AlertTriangle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Platform Administration</h1>
        <p className="text-muted-foreground">
          Manage organizations, monitor system health, and oversee platform-wide operations
        </p>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                <span className={metrics.growth.organizationsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metrics.growth.organizationsGrowth >= 0 ? '+' : ''}{metrics.growth.organizationsGrowth}%
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className={metrics.growth.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metrics.growth.usersGrowth >= 0 ? '+' : ''}{metrics.growth.usersGrowth}%
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className={metrics.growth.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metrics.growth.revenueGrowth >= 0 ? '+' : ''}{metrics.growth.revenueGrowth}%
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <div className={getSystemHealthColor(metrics.systemHealth.status)}>
                {getSystemHealthIcon(metrics.systemHealth.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {metrics.systemHealth.status}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.systemHealth.uptime}% uptime
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Organizations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Organizations</CardTitle>
                <CardDescription>
                  Latest organizations that joined the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {organizations.slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.userCount} users • {org.projectCount} projects
                        </p>
                      </div>
                      <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                        {org.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Overview */}
            <SubscriptionOverview />
          </div>
        </TabsContent>

        <TabsContent value="organizations">
          <OrganizationManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <PlatformAnalytics />
        </TabsContent>

        <TabsContent value="system">
          <PlatformAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}