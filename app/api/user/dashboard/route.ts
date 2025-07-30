import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user with organization context
    const user = await prisma.user.findFirst({
      where: { clerkId: userId },
      include: {
        organization: true,
        projectMembers: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                status: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Check if user has USER role
    if (user.role !== Role.USER) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Get accessible projects
    const accessibleProjects = user.projectMembers.map(pm => ({
      ...pm.project,
      role: pm.role,
      joinedAt: pm.createdAt
    }))

    // Get recent documents (mock data for now - would need document model)
    const recentDocuments = [
      {
        id: '1',
        title: 'Getting Started Guide',
        projectName: 'Documentation Project',
        lastModified: new Date().toISOString(),
        type: 'guide'
      },
      {
        id: '2',
        title: 'API Reference',
        projectName: 'Technical Docs',
        lastModified: new Date(Date.now() - 86400000).toISOString(),
        type: 'reference'
      }
    ]

    // Get collaboration notifications (mock data for now)
    const notifications = [
      {
        id: '1',
        type: 'comment',
        message: 'New comment on "Getting Started Guide"',
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: '2',
        type: 'mention',
        message: 'You were mentioned in "API Documentation"',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false
      }
    ]

    // Calculate metrics
    const metrics = {
      accessibleProjects: accessibleProjects.length,
      recentDocuments: recentDocuments.length,
      pendingReviews: 3, // Mock data
      unreadNotifications: notifications.filter(n => !n.read).length
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization
        },
        accessibleProjects,
        recentDocuments,
        notifications,
        metrics
      }
    })

  } catch (error) {
    console.error('Error fetching user dashboard data:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard data'
        }
      },
      { status: 500 }
    )
  }
}