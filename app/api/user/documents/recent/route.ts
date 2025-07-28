import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get user to verify organization access
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 403 }
      )
    }

    // Get user's accessible projects
    const userProjects = await prisma.projectMember.findMany({
      where: {
        userId: user.id
      },
      select: {
        projectId: true
      }
    })

    const projectIds = userProjects.map(pm => pm.projectId)

    // Get recent documents from accessible projects
    const recentDocuments = await prisma.document.findMany({
      where: {
        projectId: {
          in: projectIds
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      success: true,
      documents: recentDocuments
    })

  } catch (error) {
    console.error('Error fetching recent documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}