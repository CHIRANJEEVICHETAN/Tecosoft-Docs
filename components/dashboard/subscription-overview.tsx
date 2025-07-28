'use client'

import { useState, useEffect } from 'react'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react'

interface SubscriptionData {
  organizationId: string
  organizationName: string
  plan: 'Free' | 'Professional' | 'Enterprise' | 'Enterprise Plus'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  mrr: number
  billingCycle: 'monthly' | 'yearly'
  currentPeriodStart: string
  currentPeriodEnd: string
  userCount: number
  userLimit: number
  projectCount: number
  projectLimit: number | null
  lastPayment?: {
    amount: number
    date: string
    status: 'succeeded' | 'failed' | 'pending'
  }
}

interface SubscriptionMetrics {
  totalMrr: number
  totalArr: number
  activeSubscriptions: number
  trialSubscriptions: number
  churnedSubscriptions: number
  mrrGrowth: number
  churnRate: number
  averageRevenuePerUser: number
  planDistribution: {
    Free: number
    Professional: number
    Enterprise: number
    'Enterprise Plus': number
  }
}

interface SubscriptionOverviewProps {
  className?: string
}

export function SubscriptionOverview({ className }: SubscriptionOverviewProps) {
  const { isSuperAdmin, loading: roleLoading } = useUserRoleCheck()
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch subscription data
  useEffect(() => {
    if (!isSuperAdmin || roleLoading) return

    const fetchSubscriptionData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch subscription metrics
        const metricsResponse = await fetch('/api/admin/subscriptions/metrics')
        if (!metricsResponse.ok) {
          throw new Error('Failed to fetch subscription metrics')
        }
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.data)

        // Fetch subscription details
        const subscriptionsResponse = await fetch('/api/admin/subscriptions')
        if (!subscriptionsResponse.ok) {
          throw new Error('Failed to fetch subscriptions')
        }
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.data)

      } catch (err) {
        console.error('Error fetching subscription data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load subscription data')
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptionData()
  }, [isSuperAdmin, roleLoading])

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Free': return 'bg-gray-100 text-gray-800'
      case 'Professional': return 'bg-blue-100 text-blue-800'
      case 'Enterprise': return 'bg-purple-100 text-purple-800'
      case 'Enterprise Plus': return 'bg-gold-100 text-gold-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'trialing': return 'bg-yellow-100 text-yellow-800'
      case 'past_due': return 'bg-orange-100 text-orange-800'
      case 'canceled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'trialing': return <Clock className="w-4 h-4" />
      case 'past_due': return <AlertTriangle className="w-4 h-4" />
      case 'canceled': return <AlertTriangle className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  // Access denied for non-super admins
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Access Denied</h3>
        <p className="text-muted-foreground text-center">
          You don't have permission to view subscription data.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h3 className="text-lg font-semibold">Error Loading Subscriptions</h3>
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Subscription Overview</h2>
        <p className="text-muted-foreground">
          Monitor subscription metrics, billing, and revenue across all organizations
        </p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalMrr.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className={metrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metrics.mrrGrowth >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                  {metrics.mrrGrowth >= 0 ? '+' : ''}{metrics.mrrGrowth}%
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalArr.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Projected annual revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.trialSubscriptions} trials active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.churnRate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.churnedSubscriptions} churned this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Distribution */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              Breakdown of organizations by subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.planDistribution).map(([plan, count]) => (
                <div key={plan} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <Badge className={getPlanColor(plan)}>
                    {plan}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Subscription Details</span>
          </CardTitle>
          <CardDescription>
            Detailed view of all organization subscriptions and billing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Last Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No subscription data available.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.organizationId}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{sub.organizationName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanColor(sub.plan)}>
                        {sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(sub.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(sub.status)}
                          <span className="capitalize">{sub.status}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>${sub.mrr}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span>{sub.userCount}/{sub.userLimit} users</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span>{sub.projectCount}/{sub.projectLimit || '∞'} projects</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sub.billingCycle}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sub.lastPayment ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            ${sub.lastPayment.amount}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(sub.lastPayment.date).toLocaleDateString()}
                          </div>
                          <Badge 
                            variant={sub.lastPayment.status === 'succeeded' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {sub.lastPayment.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No payments</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}