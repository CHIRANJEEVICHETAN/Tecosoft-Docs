import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectStatus, ProjectMemberRole } from '@prisma/client'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description too long').optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE)
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = createProjectSchema.safeParse(body)
    
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

    const { name, slug, description, status } = validation.data

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user || !user.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Check if user can create projects
    if (![Role.ORG_ADMIN, Role.MANAGER, Role.SUPER_ADMIN].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Insufficient permissions to create projects.' },
        { status: 403 }
      )
    }

    // Check if slug is unique within the organization
    const existingProject = await prisma.project.findFirst({
      where: {
        slug,
        organizationId: user.organizationId!
      }
    })

    if (existingProject) {
      return NextResponse.json(
        { success: false, error: 'Project slug already exists in this organization' },
        { status: 409 }
      )
    }

    // Create project and add creator as owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the project
      const project = await tx.project.create({
        data: {
          name,
          slug,
          description,
          status,
          organizationId: user.organizationId!
        }
      })

      // Add creator as project owner
      await tx.projectMember.create({
        data: {
          userId: user.id,
          projectId: project.id,
          role: ProjectMemberRole.OWNER
        }
      })

      return project
    })

    // Fetch the created project with member information
    const createdProject = await prisma.project.findUnique({
      where: { id: result.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true
              }
            }
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
      data: {
        ...createdProject,
        memberCount: createdProject?._count.members,
        documentCount: createdProject?._count.documents
      },
      message: 'Project created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}