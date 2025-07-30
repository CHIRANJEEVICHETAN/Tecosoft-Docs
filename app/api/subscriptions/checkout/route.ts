import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionService } from '@/lib/services/subscription-service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user || !user.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Check if user is organization admin
    if (user.role !== 'ORG_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only organization admins can manage subscriptions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Validate plan exists
    const plan = SubscriptionService.getSubscriptionPlan(planId)
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Create checkout session
    const session = await SubscriptionService.createCheckoutSession(
      user.organizationId!,
      planId,
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing/success`,
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing/cancel`
    )

    return NextResponse.json({
      success: true,
      data: session
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}