import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole, ProjectStatus } from '@prisma/client'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long').optional(),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(500, 'Description too long').optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  isPublic: z.boolean().optional()
})

/**
 * GET /api/projects/[projectId]
 * Get a specific project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth()
    const { projectId } = await params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        members: {
          where: { userId: user.id }
        },
        _count: {
          select: {
            members: true,
            documents: true
          }
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

    return NextResponse.json({
      success: true,
      data: { project }
    })

  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[projectId]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth()
    const { projectId } = await params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = updateProjectSchema.safeParse(body)
    
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

    // Check edit permissions
    const userMembership = project.members[0]
    const hasOrgAccess = user.organizationId === project.organizationId && 
                        [Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(user.role)
    const hasProjectAccess = userMembership && 
                            [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userMembership.role)

    if (!hasOrgAccess && !hasProjectAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...validation.data,
        updatedAt: new Date()
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            members: true,
            documents: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { project: updatedProject }
    })

  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[projectId]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth()
    const { projectId } = await params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Check delete permissions
    const userMembership = project.members[0]
    const hasOrgAccess = user.organizationId === project.organizationId && 
                        [Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(user.role)
    const hasProjectAccess = userMembership && 
                            userMembership.role === ProjectMemberRole.OWNER

    if (!hasOrgAccess && !hasProjectAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete project and all related data
    await prisma.$transaction([
      // Delete document versions
      prisma.documentVersion.deleteMany({
        where: {
          document: {
            projectId
          }
        }
      }),
      // Delete documents
      prisma.document.deleteMany({
        where: { projectId }
      }),
      // Delete project members
      prisma.projectMember.deleteMany({
        where: { projectId }
      }),
      // Delete project
      prisma.project.delete({
        where: { id: projectId }
      })
    ])

    return NextResponse.json({
      success: true,
      data: { message: 'Project deleted successfully' }
    })

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}