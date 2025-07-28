'use client'

import { useState, useEffect } from 'react'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Server,
  Database,
  Users,
  Building2,
  FolderOpen,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  responseTime: number
  errorRate: number
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
  activeConnections: number
  lastUpdated: string
  services: {
    database: 'healthy' | 'warning' | 'critical'
    auth: 'healthy' | 'warning' | 'critical'
    storage: 'healthy' | 'warning' | 'critical'
    ai: 'healthy' | 'warning' | 'critical'
  }
}

interface UsageMetrics {
  totalRequests: number
  requestsPerMinute: number
  uniqueVisitors: number
  pageViews: number
  averageSessionDuration: number
  bounceRate: number
  topPages: Array<{
    path: string
    views: number
    uniqueVisitors: number
  }>
  topReferrers: Array<{
    source: string
    visits: number
    percentage: number
  }>
  userActivity: {
    activeUsers: number
    newUsers: number
    returningUsers: number
    sessionsToday: number
  }
  contentMetrics: {
    totalDocuments: number
    documentsCreated: number
    documentsUpdated: number
    aiGenerations: number
  }
}

interface GrowthMetrics {
  period: string
  organizationsGrowth: Array<{
    date: string
    count: number
    growth: number
  }>
  usersGrowth: Array<{
    date: string
    count: number
    growth: number
  }>
  revenueGrowth: Array<{
    date: string
    amount: number
    growth: number
  }>
  projectsGrowth: Array<{
    date: string
    count: number
    growth: number
  }>
  documentsGrowth: Array<{
    date: string
    count: number
    growth: number
  }>
}

interface ErrorLog {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
  count: number
  lastOccurrence: string
  stack?: string
  userAgent?: string
  url?: string
}

interface PlatformAnalyticsProps {
  className?: string
}

export function PlatformAnalytics({ className }: PlatformAnalyticsProps) {
  const { isSuperAdmin, loading: roleLoading } = useUserRoleCheck()
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null)
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setError(null)

      const [healthResponse, usageResponse, growthResponse, errorsResponse] = await Promise.all([
        fetch('/api/admin/analytics/system-health'),
        fetch('/api/admin/analytics/usage'),
        fetch('/api/admin/analytics/growth'),
        fetch('/api/admin/analytics/errors')
      ])

      if (!healthResponse.ok || !usageResponse.ok || !growthResponse.ok || !errorsResponse.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const [healthData, usageData, growthData, errorsData] = await Promise.all([
        healthResponse.json(),
        usageResponse.json(),
        growthResponse.json(),
        errorsResponse.json()
      ])

      if (!healthData.success || !usageData.success || !growthData.success || !errorsData.success) {
        throw new Error('Failed to fetch analytics data')
      }

      setSystemHealth(healthData.data)
      setUsageMetrics(usageData.data)
      setGrowthMetrics(growthData.data)
      setErrorLogs(errorsData.data)
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && !loading) {
      const interval = setInterval(fetchAnalyticsData, 30000) // Refresh every 30 seconds
      setRefreshInterval(interval)
      return () => clearInterval(interval)
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [autoRefresh, loading])

  // Initial data fetch
  useEffect(() => {
    if (!roleLoading && isSuperAdmin) {
      fetchAnalyticsData()
    }
  }, [roleLoading, isSuperAdmin])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [refreshInterval])

  const handleRefresh = () => {
    setLoading(true)
    fetchAnalyticsData()
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'critical':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getLevelColor = (level: 'error' | 'warning' | 'info') => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'info':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You need Super Admin privileges to access platform analytics.
        </p>
      </div>
    )
  }

  if (loading && !systemHealth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Platform Analytics</h2>
            <p className="text-muted-foreground">Real-time monitoring and system health</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Platform Analytics</h2>
            <p className="text-muted-foreground">Real-time monitoring and system health</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Error loading analytics data</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Analytics</h2>
          <p className="text-muted-foreground">Real-time monitoring and system health</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoRefresh}
            className={autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : ''}
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(systemHealth.status)}
                    <Badge className={getStatusColor(systemHealth.status)}>
                      {systemHealth.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Server className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold">{formatUptime(systemHealth.uptime)}</p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold">{systemHealth.responseTime}ms</p>
                </div>
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold">{systemHealth.errorRate.toFixed(2)}%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {systemHealth && (
            <>
              {/* System Resources */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemHealth.memoryUsage}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${systemHealth.memoryUsage}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemHealth.cpuUsage}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${systemHealth.cpuUsage}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemHealth.diskUsage}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{ width: `${systemHealth.diskUsage}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Service Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Health</CardTitle>
                  <CardDescription>Status of critical platform services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5" />
                        <span className="font-medium">Database</span>
                      </div>
                      <Badge className={getStatusColor(systemHealth.services.database)}>
                        {systemHealth.services.database}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span className="font-medium">Authentication</span>
                      </div>
                      <Badge className={getStatusColor(systemHealth.services.auth)}>
                        {systemHealth.services.auth}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="w-5 h-5" />
                        <span className="font-medium">Storage</span>
                      </div>
                      <Badge className={getStatusColor(systemHealth.services.storage)}>
                        {systemHealth.services.storage}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-medium">AI Services</span>
                      </div>
                      <Badge className={getStatusColor(systemHealth.services.ai)}>
                        {systemHealth.services.ai}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {usageMetrics && (
            <>
              {/* Usage Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold">{usageMetrics.totalRequests.toLocaleString()}</p>
                      </div>
                      <Activity className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Requests/Min</p>
                        <p className="text-2xl font-bold">{usageMetrics.requestsPerMinute}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Unique Visitors</p>
                        <p className="text-2xl font-bold">{usageMetrics.uniqueVisitors.toLocaleString()}</p>
                      </div>
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                        <p className="text-2xl font-bold">{usageMetrics.pageViews.toLocaleString()}</p>
                      </div>
                      <PieChart className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                    <CardDescription>Current user engagement metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Users</span>
                      <span className="text-lg font-bold">{usageMetrics.userActivity.activeUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">New Users</span>
                      <span className="text-lg font-bold text-green-600">+{usageMetrics.userActivity.newUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Returning Users</span>
                      <span className="text-lg font-bold">{usageMetrics.userActivity.returningUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Sessions Today</span>
                      <span className="text-lg font-bold">{usageMetrics.userActivity.sessionsToday}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Content Metrics</CardTitle>
                    <CardDescription>Document and AI usage statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Documents</span>
                      <span className="text-lg font-bold">{usageMetrics.contentMetrics.totalDocuments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Created Today</span>
                      <span className="text-lg font-bold text-green-600">+{usageMetrics.contentMetrics.documentsCreated}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Updated Today</span>
                      <span className="text-lg font-bold text-blue-600">{usageMetrics.contentMetrics.documentsUpdated}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">AI Generations</span>
                      <span className="text-lg font-bold text-purple-600">{usageMetrics.contentMetrics.aiGenerations}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Pages and Referrers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Pages</CardTitle>
                    <CardDescription>Most visited pages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {usageMetrics.topPages.map((page, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{page.path}</p>
                            <p className="text-sm text-muted-foreground">{page.uniqueVisitors} unique visitors</p>
                          </div>
                          <span className="font-bold">{page.views.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Referrers</CardTitle>
                    <CardDescription>Traffic sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {usageMetrics.topReferrers.map((referrer, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{referrer.source}</p>
                            <p className="text-sm text-muted-foreground">{referrer.percentage}% of traffic</p>
                          </div>
                          <span className="font-bold">{referrer.visits.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          {growthMetrics && (
            <>
              {/* Growth Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                        <p className="text-2xl font-bold">
                          {growthMetrics.organizationsGrowth[growthMetrics.organizationsGrowth.length - 1]?.count || 0}
                        </p>
                        <div className="flex items-center space-x-1 text-sm">
                          {growthMetrics.organizationsGrowth[growthMetrics.organizationsGrowth.length - 1]?.growth >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={growthMetrics.organizationsGrowth[growthMetrics.organizationsGrowth.length - 1]?.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(growthMetrics.organizationsGrowth[growthMetrics.organizationsGrowth.length - 1]?.growth || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Users</p>
                        <p className="text-2xl font-bold">
                          {growthMetrics.usersGrowth[growthMetrics.usersGrowth.length - 1]?.count || 0}
                        </p>
                        <div className="flex items-center space-x-1 text-sm">
                          {growthMetrics.usersGrowth[growthMetrics.usersGrowth.length - 1]?.growth >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={growthMetrics.usersGrowth[growthMetrics.usersGrowth.length - 1]?.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(growthMetrics.usersGrowth[growthMetrics.usersGrowth.length - 1]?.growth || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-bold">
                          ${(growthMetrics.revenueGrowth[growthMetrics.revenueGrowth.length - 1]?.amount || 0).toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-1 text-sm">
                          {growthMetrics.revenueGrowth[growthMetrics.revenueGrowth.length - 1]?.growth >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={growthMetrics.revenueGrowth[growthMetrics.revenueGrowth.length - 1]?.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(growthMetrics.revenueGrowth[growthMetrics.revenueGrowth.length - 1]?.growth || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <LineChart className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Projects</p>
                        <p className="text-2xl font-bold">
                          {growthMetrics.projectsGrowth[growthMetrics.projectsGrowth.length - 1]?.count || 0}
                        </p>
                        <div className="flex items-center space-x-1 text-sm">
                          {growthMetrics.projectsGrowth[growthMetrics.projectsGrowth.length - 1]?.growth >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={growthMetrics.projectsGrowth[growthMetrics.projectsGrowth.length - 1]?.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(growthMetrics.projectsGrowth[growthMetrics.projectsGrowth.length - 1]?.growth || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <FolderOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Growth Charts Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Trends</CardTitle>
                  <CardDescription>Platform growth over time ({growthMetrics.period})</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Growth charts would be displayed here</p>
                      <p className="text-sm text-muted-foreground">Integration with charting library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>Recent system errors and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              {errorLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Last Occurrence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorLogs.slice(0, 20).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-md truncate">
                          {log.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.source}</Badge>
                        </TableCell>
                        <TableCell>{log.count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.lastOccurrence).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent errors found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      {systemHealth && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date(systemHealth.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  )}
