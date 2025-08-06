import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(ProjectMemberRole).default(ProjectMemberRole.MEMBER)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId } = params

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get project with access check
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: user.id }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const userMembership = project.members[0]
    const hasOrgAccess = user.organizationId === project.organizationId
    const isSuperAdmin = user.role === Role.SUPER_ADMIN

    if (!userMembership && !hasOrgAccess && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get all project members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
            role: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // Owners first, then admins, etc.
        { createdAt: 'asc' }
      ]
    })

    // Transform data
    const transformedMembers = members.map(member => ({
      id: member.id,
      role: member.role,
      joinedAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user
    }))

    // Calculate member statistics
    const roleDistribution = members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        members: transformedMembers,
        statistics: {
          totalMembers: members.length,
          roleDistribution,
          userRole: userMembership?.role || null
        }
      }
    })

  } catch (error) {
    console.error('Error fetching project members:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId } = params

    // Validate request body
    const body = await request.json()
    const validation = addMemberSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { userId: targetUserId, role } = validation.data

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get project with current user's membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: currentUser.id }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userMembership = project.members[0]
    const hasOrgAccess = currentUser.organizationId === project.organizationId && 
                        [Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)
    const hasProjectAccess = userMembership && 
                            [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userMembership.role)

    if (!hasOrgAccess && !hasProjectAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Insufficient permissions to add members.' },
        { status: 403 }
      )
    }

    // Get target user and verify they're in the same organization
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetUser.organizationId !== project.organizationId) {
      return NextResponse.json(
        { success: false, error: 'User is not in the same organization as the project' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: targetUserId
      }
    })

    if (existingMembership) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this project' },
        { status: 409 }
      )
    }

    // Add member to project
    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newMember.id,
        role: newMember.role,
        joinedAt: newMember.createdAt,
        user: newMember.user
      },
      message: 'Member added to project successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding project member:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}