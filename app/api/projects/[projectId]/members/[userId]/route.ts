import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'
import { z } from 'zod'

const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectMemberRole)
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; userId: string } }
) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId, userId: targetUserId } = params

    // Validate request body
    const body = await request.json()
    const validation = updateMemberRoleSchema.safeParse(body)
    
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

    const { role } = validation.data

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: currentUserId }
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
        { success: false, error: 'Access denied. Insufficient permissions to update member roles.' },
        { status: 403 }
      )
    }

    // Get target member
    const targetMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: targetUserId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clerkId: true
          }
        }
      }
    })

    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this project' },
        { status: 404 }
      )
    }

    // Prevent users from changing their own role
    if (targetMember.user.clerkId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 403 }
      )
    }

    // Prevent non-owners from promoting to owner
    if (role === ProjectMemberRole.OWNER && userMembership?.role !== ProjectMemberRole.OWNER && !hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Only project owners and organization admins can assign owner role' },
        { status: 403 }
      )
    }

    // Update member role
    const updatedMember = await prisma.projectMember.update({
      where: { id: targetMember.id },
      data: { role },
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
        id: updatedMember.id,
        role: updatedMember.role,
        joinedAt: updatedMember.createdAt,
        updatedAt: updatedMember.updatedAt,
        user: updatedMember.user
      },
      message: `Member role updated to ${role.toLowerCase()}`
    })

  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; userId: string } }
) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId, userId: targetUserId } = params

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: currentUserId }
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
        { success: false, error: 'Access denied. Insufficient permissions to remove members.' },
        { status: 403 }
      )
    }

    // Get target member
    const targetMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: targetUserId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clerkId: true
          }
        }
      }
    })

    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this project' },
        { status: 404 }
      )
    }

    // Prevent users from removing themselves (they should leave instead)
    if (targetMember.user.clerkId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove yourself from the project. Use leave project instead.' },
        { status: 403 }
      )
    }

    // Check if this is the last owner
    if (targetMember.role === ProjectMemberRole.OWNER) {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: ProjectMemberRole.OWNER
        }
      })

      if (ownerCount <= 1) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot remove the last owner. Assign another owner first or delete the project.' 
          },
          { status: 400 }
        )
      }
    }

    // Remove member from project
    await prisma.projectMember.delete({
      where: { id: targetMember.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed from project successfully'
    })

  } catch (error) {
    console.error('Error removing project member:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}