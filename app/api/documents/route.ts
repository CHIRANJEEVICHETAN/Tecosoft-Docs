import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, DocumentStatus, ProjectMemberRole } from '@prisma/client'
import { z } from 'zod'

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Title too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().optional(),
  summary: z.string().max(500, 'Summary too long').optional(),
  status: z.nativeEnum(DocumentStatus).default(DocumentStatus.DRAFT),
  projectId: z.string().min(1, 'Project ID is required')
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
    const validation = createDocumentSchema.safeParse(body)
    
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

    const { title, slug, content, summary, status, projectId } = validation.data

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

    // Get project and check access
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

    // Check permissions
    const userMembership = project.members[0]
    const hasOrgAccess = user.organizationId === project.organizationId && 
                        [Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(user.role)
    const hasProjectAccess = userMembership && 
                            [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN, ProjectMemberRole.MEMBER].includes(userMembership.role)

    if (!hasOrgAccess && !hasProjectAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Insufficient permissions to create documents in this project.' },
        { status: 403 }
      )
    }

    // Check if slug is unique within the project
    const existingDocument = await prisma.document.findFirst({
      where: {
        slug,
        projectId
      }
    })

    if (existingDocument) {
      return NextResponse.json(
        { success: false, error: 'Document slug already exists in this project' },
        { status: 409 }
      )
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        slug,
        content: content || '',
        summary,
        status,
        projectId,
        authorId: user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationId: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}