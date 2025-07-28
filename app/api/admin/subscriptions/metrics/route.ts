import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user and verify super admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Super Admin role required.' },
        { status: 403 }
      )
    }

    // Get all organizations with user counts
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true
          }
        }
      }
    })

    // Calculate subscription metrics (mock data - would integrate with Stripe in production)
    const subscriptionMetrics = {
      totalMrr: 0,
      totalArr: 0,
      activeSubscriptions: 0,
      trialSubscriptions: 0,
      churnedSubscriptions: 2, // Mock value
      mrrGrowth: 15.2, // Mock growth percentage
      churnRate: 3.5, // Mock churn rate
      averageRevenuePerUser: 0,
      planDistribution: {
        Free: 0,
        Professional: 0,
        Enterprise: 0,
        'Enterprise Plus': 0
      }
    }

    // Calculate metrics based on organization data
    organizations.forEach(org => {
      const userCount = org._count.users
      let plan: keyof typeof subscriptionMetrics.planDistribution
      let mrr = 0

      // Determine plan based on user count (mock logic)
      if (userCount <= 5) {
        plan = 'Free'
        mrr = 0
      } else if (userCount <= 25) {
        plan = 'Professional'
        mrr = 29
      } else if (userCount <= 100) {
        plan = 'Enterprise'
        mrr = 99
      } else {
        plan = 'Enterprise Plus'
        mrr = 299
      }

      subscriptionMetrics.planDistribution[plan]++
      subscriptionMetrics.totalMrr += mrr

      if (mrr > 0) {
        subscriptionMetrics.activeSubscriptions++
      }

      // Mock trial logic (10% of free accounts are trials)
      if (plan === 'Free' && Math.random() < 0.1) {
        subscriptionMetrics.trialSubscriptions++
      }
    })

    // Calculate derived metrics
    subscriptionMetrics.totalArr = subscriptionMetrics.totalMrr * 12
    subscriptionMetrics.averageRevenuePerUser = subscriptionMetrics.activeSubscriptions > 0 
      ? subscriptionMetrics.totalMrr / subscriptionMetrics.activeSubscriptions 
      : 0

    return NextResponse.json({
      success: true,
      data: subscriptionMetrics
    })

  } catch (error) {
    console.error('Error fetching subscription metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}