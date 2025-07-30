'use client'

import { useState, useEffect } from 'react'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  CreditCard,
  Users,
  FolderOpen,
  FileText,
  Brain,
  Crown,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface UsageStats {
  current: {
    projects: number
    users: number
    documents: number
    aiCredits: number
  }
  limits: {
    projects: number
    users: number
    documents: number
    aiCredits: number
  } | null
  plan: string
}

interface SubscriptionManagementProps {
  className?: string
}

export function SubscriptionManagement({ className }: SubscriptionManagementProps) {
  const { isOrgAdmin, loading: roleLoading } = useUserRoleCheck()
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    if (!isOrgAdmin || roleLoading) return

    const fetchUsageStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/subscriptions/usage')
        
        if (!response.ok) {
          throw new Error('Failed to fetch usage stats')
        }
        
        const data = await response.json()
        setUsageStats(data.data)
      } catch (err) {
        console.error('Error fetching usage stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load usage stats')
      } finally {
        setLoading(false)
      }
    }

    fetchUsageStats()
  }, [isOrgAdmin, roleLoading])

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgrading(true)
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      
      // Redirect to Stripe checkout
      window.location.href = data.data.url
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start upgrade process')
    } finally {
      setUpgrading(false)
    }
  }

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatLimit = (limit: number): string => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString()
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isOrgAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <CreditCard className="w-16 h-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Subscription Management Access Restricted</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Subscription management is only available to Organization Administrators.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertTriangle className="w-16 h-16 text-destructive" />
          <h3 className="text-lg font-semibold">Error Loading Subscription Data</h3>
          <p className="text-muted-foreground text-center">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!usageStats) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Current Plan: {usageStats.plan}
              </CardTitle>
              <CardDescription>
                Manage your subscription and monitor usage
              </CardDescription>
            </div>
            {usageStats.plan === 'Free' && (
              <Button onClick={() => handleUpgrade('professional')} disabled={upgrading}>
                {upgrading ? 'Processing...' : 'Upgrade Plan'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Projects Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Projects</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usageStats.current.projects} / {formatLimit(usageStats.limits?.projects || 0)}
                </span>
              </div>
              {usageStats.limits?.projects !== -1 && (
                <Progress 
                  value={getUsagePercentage(usageStats.current.projects, usageStats.limits?.projects || 0)}
                  className="h-2"
                />
              )}
            </div>

            {/* Users Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Users</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usageStats.current.users} / {formatLimit(usageStats.limits?.users || 0)}
                </span>
              </div>
              {usageStats.limits?.users !== -1 && (
                <Progress 
                  value={getUsagePercentage(usageStats.current.users, usageStats.limits?.users || 0)}
                  className="h-2"
                />
              )}
            </div>

            {/* Documents Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Documents</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usageStats.current.documents} / {formatLimit(usageStats.limits?.documents || 0)}
                </span>
              </div>
              {usageStats.limits?.documents !== -1 && (
                <Progress 
                  value={getUsagePercentage(usageStats.current.documents, usageStats.limits?.documents || 0)}
                  className="h-2"
                />
              )}
            </div>

            {/* AI Credits Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">AI Credits</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usageStats.current.aiCredits} / {formatLimit(usageStats.limits?.aiCredits || 0)}
                </span>
              </div>
              {usageStats.limits?.aiCredits !== -1 && usageStats.limits?.aiCredits !== 0 && (
                <Progress 
                  value={getUsagePercentage(usageStats.current.aiCredits, usageStats.limits?.aiCredits || 0)}
                  className="h-2"
                />
              )}
              {usageStats.limits?.aiCredits === 0 && (
                <Badge variant="outline" className="text-xs">
                  Not Available
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your organization's needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free Plan */}
            <div className={`p-6 border rounded-lg ${usageStats.plan === 'Free' ? 'border-primary bg-primary/5' : ''}`}>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Free</h3>
                  <p className="text-2xl font-bold">$0<span className="text-sm font-normal">/month</span></p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    1 organization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    3 projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    5 users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    100 documents
                  </li>
                </ul>
                {usageStats.plan === 'Free' ? (
                  <Badge className="w-full justify-center">Current Plan</Badge>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Downgrade
                  </Button>
                )}
              </div>
            </div>

            {/* Professional Plan */}
            <div className={`p-6 border rounded-lg ${usageStats.plan === 'Professional' ? 'border-primary bg-primary/5' : ''}`}>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Professional</h3>
                  <p className="text-2xl font-bold">$29<span className="text-sm font-normal">/month</span></p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    1 organization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    10 projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    25 users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    1,000 documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    500 AI credits
                  </li>
                </ul>
                {usageStats.plan === 'Professional' ? (
                  <Badge className="w-full justify-center">Current Plan</Badge>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade('professional')}
                    disabled={upgrading}
                  >
                    {upgrading ? 'Processing...' : 'Upgrade'}
                  </Button>
                )}
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className={`p-6 border rounded-lg ${usageStats.plan === 'Enterprise' ? 'border-primary bg-primary/5' : ''}`}>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Enterprise</h3>
                  <p className="text-2xl font-bold">$99<span className="text-sm font-normal">/month</span></p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    3 organizations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    100 users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    2,000 AI credits
                  </li>
                </ul>
                {usageStats.plan === 'Enterprise' ? (
                  <Badge className="w-full justify-center">Current Plan</Badge>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade('enterprise')}
                    disabled={upgrading}
                  >
                    {upgrading ? 'Processing...' : 'Upgrade'}
                  </Button>
                )}
              </div>
            </div>

            {/* Enterprise Plus Plan */}
            <div className={`p-6 border rounded-lg ${usageStats.plan === 'Enterprise Plus' ? 'border-primary bg-primary/5' : ''}`}>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Enterprise Plus</h3>
                  <p className="text-2xl font-bold">$299<span className="text-sm font-normal">/month</span></p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited organizations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited AI credits
                  </li>
                </ul>
                {usageStats.plan === 'Enterprise Plus' ? (
                  <Badge className="w-full justify-center">Current Plan</Badge>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade('enterprise_plus')}
                    disabled={upgrading}
                  >
                    {upgrading ? 'Processing...' : 'Contact Sales'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Billing Information
          </CardTitle>
          <CardDescription>
            Manage your billing details and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Payment Method</h4>
                <p className="text-sm text-muted-foreground">
                  {usageStats.plan === 'Free' ? 'No payment method required' : 'Visa ending in 4242'}
                </p>
              </div>
              {usageStats.plan !== 'Free' && (
                <Button variant="outline" size="sm">
                  Update
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Next Billing Date</h4>
                <p className="text-sm text-muted-foreground">
                  {usageStats.plan === 'Free' ? 'N/A' : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
              {usageStats.plan !== 'Free' && (
                <Button variant="outline" size="sm">
                  View Invoices
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}