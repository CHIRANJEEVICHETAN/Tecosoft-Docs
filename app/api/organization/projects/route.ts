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

    // Get projects with member count
    const projects = await prisma.project.findMany({
      where: {
        organizationId: user.organizationId
      },
      include: {
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    const projectsWithMemberCount = projects.map(project => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      memberCount: project._count.members,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: projectsWithMemberCount
    })

  } catch (error) {
    console.error('Error fetching organization projects:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}