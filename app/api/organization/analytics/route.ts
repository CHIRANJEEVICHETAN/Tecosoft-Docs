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

    // Calculate date ranges for analytics
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    // Get current month data
    const [
      currentMonthProjects,
      currentMonthUsers,
      lastMonthProjects,
      lastMonthUsers
    ] = await Promise.all([
      // Current month projects
      prisma.project.count({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: currentMonth
          }
        }
      }),
      // Current month users
      prisma.user.count({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: currentMonth
          }
        }
      }),
      // Last month projects
      prisma.project.count({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: lastMonth,
            lt: currentMonth
          }
        }
      }),
      // Last month users
      prisma.user.count({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: lastMonth,
            lt: currentMonth
          }
        }
      })
    ])

    // Calculate growth metrics
    const projectsCreated = currentMonthProjects
    const teamGrowth = currentMonthUsers
    
    // Mock documents created (would come from actual document tracking)
    const documentsCreated = Math.floor(currentMonthProjects * 3 + Math.random() * 10)
    
    // Mock AI usage growth (would come from AI usage tracking)
    const aiUsageGrowth = Math.floor((Math.random() - 0.5) * 40) // Random growth between -20% and +20%

    const analytics = {
      projectsCreated,
      documentsCreated,
      teamGrowth,
      aiUsageGrowth
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Error fetching organization analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}