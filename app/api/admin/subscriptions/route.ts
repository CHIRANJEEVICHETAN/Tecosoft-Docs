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

    // Get all organizations with user and project counts
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data to include subscription information (mock data - would integrate with Stripe)
    const subscriptions = organizations.map(org => {
      const userCount = org._count.users
      const projectCount = org._count.projects

      // Determine plan and limits based on user count (mock logic)
      let plan: 'Free' | 'Professional' | 'Enterprise' | 'Enterprise Plus'
      let mrr = 0
      let userLimit = 5
      let projectLimit: number | null = 3

      if (userCount <= 5) {
        plan = 'Free'
        mrr = 0
        userLimit = 5
        projectLimit = 3
      } else if (userCount <= 25) {
        plan = 'Professional'
        mrr = 29
        userLimit = 25
        projectLimit = 10
      } else if (userCount <= 100) {
        plan = 'Enterprise'
        mrr = 99
        userLimit = 100
        projectLimit = null // unlimited
      } else {
        plan = 'Enterprise Plus'
        mrr = 299
        userLimit = 1000
        projectLimit = null // unlimited
      }

      // Mock subscription status
      const status = mrr === 0 ? 'active' : 'active' // Most are active, some could be trialing
      const billingCycle = 'monthly'
      
      // Mock billing dates
      const currentPeriodStart = new Date()
      currentPeriodStart.setDate(1) // First of current month
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      // Mock last payment data
      const lastPayment = mrr > 0 ? {
        amount: mrr,
        date: currentPeriodStart.toISOString(),
        status: 'succeeded' as const
      } : undefined

      return {
        organizationId: org.id,
        organizationName: org.name,
        plan,
        status,
        mrr,
        billingCycle,
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        userCount,
        userLimit,
        projectCount,
        projectLimit,
        lastPayment
      }
    })

    return NextResponse.json({
      success: true,
      data: subscriptions
    })

  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}