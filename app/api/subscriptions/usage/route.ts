import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionService } from '@/lib/services/subscription-service'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Get usage statistics
    const usageStats = await SubscriptionService.getUsageStats(user.organizationId)

    return NextResponse.json({
      success: true,
      data: usageStats
    })

  } catch (error) {
    console.error('Error fetching usage stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}