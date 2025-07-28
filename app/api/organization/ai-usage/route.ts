import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        organization: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is organization admin
    if (user.role !== 'ORG_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Organization admin role required.' },
        { status: 403 }
      )
    }

    // For now, return mock AI usage data since AI features aren't implemented yet
    // In the future, this would query actual AI usage from a dedicated table
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Mock data based on organization size and activity
    const projectCount = await prisma.project.count({
      where: { organizationId: user.organizationId }
    })

    const userCount = await prisma.user.count({
      where: { organizationId: user.organizationId }
    })

    // Calculate mock usage based on organization activity
    const baseUsage = Math.floor(projectCount * 10 + userCount * 5)
    const totalGenerations = Math.floor(baseUsage * 1.5)
    const totalDocuments = Math.floor(projectCount * 8)
    const monthlyUsage = Math.floor(baseUsage * 0.3)
    
    // Mock subscription limits (would come from subscription service)
    const usageLimit = 1000 // Default limit for organization
    const remainingCredits = Math.max(0, usageLimit - monthlyUsage)

    const aiUsageMetrics = {
      totalGenerations,
      totalDocuments,
      monthlyUsage,
      usageLimit,
      remainingCredits
    }

    return NextResponse.json({
      success: true,
      data: aiUsageMetrics
    })

  } catch (error) {
    console.error('Error fetching AI usage metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}