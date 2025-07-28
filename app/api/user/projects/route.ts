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

    // Get user's project memberships with project details
    const projectMemberships = await prisma.projectMember.findMany({
      where: {
        userId: user.id
      },
      include: {
        project: {
          include: {
            _count: {
              select: {
                members: true,
                documents: true
              }
            }
          }
        }
      },
      orderBy: {
        project: {
          updatedAt: 'desc'
        }
      }
    })

    // Transform the data to include role and counts
    const projects = projectMemberships.map(membership => ({
      id: membership.project.id,
      name: membership.project.name,
      slug: membership.project.slug,
      description: membership.project.description,
      status: membership.project.status,
      role: membership.role,
      memberCount: membership.project._count.members,
      documentCount: membership.project._count.documents,
      updatedAt: membership.project.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      projects
    })

  } catch (error) {
    console.error('Error fetching user projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}