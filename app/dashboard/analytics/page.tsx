"use client";

import { Permission } from '@/lib/middleware/rbac-middleware'
import { PermissionGate } from '@/lib/hooks/use-permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Eye, 
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Shield
} from 'lucide-react'

// Mock analytics data
const analyticsData = {
  pageViews: {
    total: 15678,
    change: 12.5,
    trend: 'up'
  },
  uniqueUsers: {
    total: 3456,
    change: -2.3,
    trend: 'down'
  },
  totalContent: {
    total: 284,
    change: 8.7,
    trend: 'up'
  },
  avgSessionTime: {
    total: '4m 32s',
    change: 15.2,
    trend: 'up'
  }
}

const topPages = [
  { path: '/docs/getting-started', views: 2547, change: 15.2 },
  { path: '/docs/api-reference', views: 1893, change: -5.1 },
  { path: '/docs/installation', views: 1654, change: 22.3 },
  { path: '/docs/deployment', views: 1432, change: 8.9 },
  { path: '/docs/troubleshooting', views: 1287, change: -12.4 }
]

const userActivity = [
  { date: '2024-01-15', newUsers: 45, returning: 234, totalSessions: 567 },
  { date: '2024-01-14', newUsers: 38, returning: 198, totalSessions: 456 },
  { date: '2024-01-13', newUsers: 52, returning: 267, totalSessions: 623 },
  { date: '2024-01-12', newUsers: 41, returning: 245, totalSessions: 589 },
  { date: '2024-01-11', newUsers: 33, returning: 189, totalSessions: 445 }
]

export default function AnalyticsPage() {
  return (
    <PermissionGate 
      permissions={[Permission.VIEW_ANALYTICS]}
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Analytics Access Required
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You need analytics viewing privileges to access this page.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <BarChart3 className="h-8 w-8" />
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Monitor platform usage and performance metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Page Views</p>
                  <p className="text-2xl font-bold">{analyticsData.pageViews.total.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    {analyticsData.pageViews.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${analyticsData.pageViews.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {analyticsData.pageViews.change}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Users</p>
                  <p className="text-2xl font-bold">{analyticsData.uniqueUsers.total.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    {analyticsData.uniqueUsers.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${analyticsData.uniqueUsers.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(analyticsData.uniqueUsers.change)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Content</p>
                  <p className="text-2xl font-bold">{analyticsData.totalContent.total.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">
                      {analyticsData.totalContent.change}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Session</p>
                  <p className="text-2xl font-bold">{analyticsData.avgSessionTime.total}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">
                      {analyticsData.avgSessionTime.change}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>
                Most viewed documentation pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{page.path}</div>
                      <div className="text-sm text-gray-500">{page.views.toLocaleString()} views</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {page.change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${page.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(page.change)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>
                Daily user engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivity.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{day.date}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">{day.newUsers}</div>
                        <div className="text-gray-500">New</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">{day.returning}</div>
                        <div className="text-gray-500">Returning</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{day.totalSessions}</div>
                        <div className="text-gray-500">Sessions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Detailed platform performance and usage statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Content Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Published Pages</span>
                    <span className="text-sm font-medium">284</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Draft Pages</span>
                    <span className="text-sm font-medium">47</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg. Read Time</span>
                    <span className="text-sm font-medium">3m 45s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bounce Rate</span>
                    <span className="text-sm font-medium">23.5%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">User Engagement</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Daily Active Users</span>
                    <span className="text-sm font-medium">1,234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Weekly Active Users</span>
                    <span className="text-sm font-medium">4,567</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Active Users</span>
                    <span className="text-sm font-medium">12,890</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">User Retention</span>
                    <span className="text-sm font-medium">67.8%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">System Health</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <Badge variant="default">99.9%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="text-sm font-medium">145ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Error Rate</span>
                    <Badge variant="secondary">0.02%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Storage Used</span>
                    <span className="text-sm font-medium">2.3GB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-2">Data Export</h4>
                  <p className="text-sm text-gray-600">Export analytics data for external analysis</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}
