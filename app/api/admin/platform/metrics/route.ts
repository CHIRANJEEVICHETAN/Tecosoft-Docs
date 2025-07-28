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

    // Calculate date ranges for growth metrics
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch platform metrics
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      totalProjects,
      currentMonthOrgs,
      lastMonthOrgs,
      currentMonthUsers,
      lastMonthUsers
    ] = await Promise.all([
      // Total organizations
      prisma.organization.count(),
      
      // Active organizations (with at least one user active in last 30 days)
      prisma.organization.count({
        where: {
          users: {
            some: {
              updatedAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),
      
      // Total users
      prisma.user.count(),
      
      // Active users (updated in last 30 days)
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total projects
      prisma.project.count(),
      
      // Organizations created this month
      prisma.organization.count({
        where: {
          createdAt: {
            gte: currentMonthStart
          }
        }
      }),
      
      // Organizations created last month
      prisma.organization.count({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd
          }
        }
      }),
      
      // Users created this month
      prisma.user.count({
        where: {
          createdAt: {
            gte: currentMonthStart
          }
        }
      }),
      
      // Users created last month
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd
          }
        }
      })
    ])

    // Calculate growth percentages
    const organizationsGrowth = lastMonthOrgs > 0 
      ? Math.round(((currentMonthOrgs - lastMonthOrgs) / lastMonthOrgs) * 100)
      : currentMonthOrgs > 0 ? 100 : 0

    const usersGrowth = lastMonthUsers > 0 
      ? Math.round(((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100)
      : currentMonthUsers > 0 ? 100 : 0

    // Mock revenue data (would integrate with Stripe in production)
    const monthlyRevenue = 15750 // Mock value
    const revenueGrowth = 12 // Mock growth percentage

    // Mock system health data (would integrate with monitoring service)
    const systemHealth = {
      status: 'healthy' as const,
      uptime: 99.9,
      responseTime: 145,
      errorRate: 0.02
    }

    const metrics = {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      totalProjects,
      monthlyRevenue,
      systemHealth,
      growth: {
        organizationsGrowth,
        usersGrowth,
        revenueGrowth
      }
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Error fetching platform metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}