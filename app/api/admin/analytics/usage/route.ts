import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is Super Admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    })

    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get usage metrics
    const usageMetrics = await getUsageMetrics()

    return NextResponse.json({
      success: true,
      data: usageMetrics
    })
  } catch (error) {
    console.error('Error fetching usage metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getUsageMetrics(): Promise<UsageMetrics> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get real data from database
  const [
    totalUsers,
    newUsersToday,
    totalOrganizations,
    totalProjects,
    totalDocuments,
    documentsCreatedToday,
    documentsUpdatedToday
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    }),
    prisma.organization.count(),
    prisma.project.count(),
    // Simulated document count (you'd have a documents table)
    Promise.resolve(Math.floor(Math.random() * 10000 + 5000)),
    Promise.resolve(Math.floor(Math.random() * 50 + 10)),
    Promise.resolve(Math.floor(Math.random() * 100 + 20))
  ])

  // Simulated metrics (in a real app, you'd track these)
  const totalRequests = Math.floor(Math.random() * 100000 + 50000)
  const requestsPerMinute = Math.floor(Math.random() * 200 + 50)
  const uniqueVisitors = Math.floor(totalUsers * 0.7)
  const pageViews = Math.floor(totalRequests * 1.5)
  const averageSessionDuration = Math.floor(Math.random() * 300 + 180) // 3-8 minutes
  const bounceRate = Math.floor(Math.random() * 30 + 20) // 20-50%

  const topPages = [
    { path: '/dashboard', views: Math.floor(Math.random() * 5000 + 2000), uniqueVisitors: Math.floor(Math.random() * 1000 + 500) },
    { path: '/docs', views: Math.floor(Math.random() * 3000 + 1500), uniqueVisitors: Math.floor(Math.random() * 800 + 400) },
    { path: '/projects', views: Math.floor(Math.random() * 2000 + 1000), uniqueVisitors: Math.floor(Math.random() * 600 + 300) },
    { path: '/settings', views: Math.floor(Math.random() * 1500 + 500), uniqueVisitors: Math.floor(Math.random() * 400 + 200) },
    { path: '/profile', views: Math.floor(Math.random() * 1000 + 300), uniqueVisitors: Math.floor(Math.random() * 300 + 150) }
  ]

  const topReferrers = [
    { source: 'Direct', visits: Math.floor(Math.random() * 3000 + 2000), percentage: 45 },
    { source: 'Google', visits: Math.floor(Math.random() * 2000 + 1000), percentage: 30 },
    { source: 'GitHub', visits: Math.floor(Math.random() * 800 + 400), percentage: 12 },
    { source: 'Twitter', visits: Math.floor(Math.random() * 500 + 200), percentage: 8 },
    { source: 'LinkedIn', visits: Math.floor(Math.random() * 300 + 100), percentage: 5 }
  ]

  return {
    totalRequests,
    requestsPerMinute,
    uniqueVisitors,
    pageViews,
    averageSessionDuration,
    bounceRate,
    topPages,
    topReferrers,
    userActivity: {
      activeUsers: Math.floor(uniqueVisitors * 0.3),
      newUsers: newUsersToday,
      returningUsers: Math.floor(uniqueVisitors * 0.7),
      sessionsToday: Math.floor(uniqueVisitors * 1.2)
    },
    contentMetrics: {
      totalDocuments,
      documentsCreated: documentsCreatedToday,
      documentsUpdated: documentsUpdatedToday,
      aiGenerations: Math.floor(Math.random() * 200 + 50)
    }
  }
}