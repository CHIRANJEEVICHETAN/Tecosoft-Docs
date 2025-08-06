import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, DocumentStatus, ProjectMemberRole } from '@prisma/client'
import { z } from 'zod'
import { VersionControlService } from '@/lib/services/version-control-service'

const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Title too long').optional(),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  content: z.string().optional(),
  summary: z.string().max(500, 'Summary too long').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  changeDescription: z.string().max(200, 'Change description too long').optional()
})

/**
 * GET /api/documents/[documentId]
 * Get a specific document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    const { documentId } = await params
    
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

    // Get document with access check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
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
            }
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const userMembership = document.project.members[0]
    const hasOrgAccess = user.organizationId === document.project.organizationId
    const isSuperAdmin = user.role === Role.SUPER_ADMIN

    if (!userMembership && !hasOrgAccess && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { document }
    })

  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/documents/[documentId]
 * Update a document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    const { documentId } = await params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = updateDocumentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { changeDescription, ...updateData } = validation.data

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

    // Get document with access check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check edit permissions
    const userMembership = document.project.members[0]
    const hasOrgAccess = user.organizationId === document.project.organizationId && 
                        (user.role === Role.ORG_ADMIN || user.role === Role.SUPER_ADMIN)
    const hasProjectAccess = userMembership && 
                            (userMembership.role === ProjectMemberRole.OWNER || 
                             userMembership.role === ProjectMemberRole.ADMIN || 
                             userMembership.role === ProjectMemberRole.MEMBER)

    if (!hasOrgAccess && !hasProjectAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create version before updating (if content changed)
    if (updateData.content && updateData.content !== document.content) {
      const versionService = new VersionControlService()
      await versionService.createVersion({
        documentId: document.id,
        content: document.content || '',
        title: document.title,
        changeDescription: changeDescription || 'Document updated',
        createdBy: user.id
      })
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...updateData,
        updatedAt: new Date()
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
            slug: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { document: updatedDocument }
    })

  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[documentId]
 * Delete a document
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    const { documentId } = await params
    
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

    // Get document with access check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check delete permissions
    const userMembership = document.project.members[0]
    const hasOrgAccess = user.organizationId === document.project.organizationId && 
                        (user.role === Role.ORG_ADMIN || user.role === Role.SUPER_ADMIN)
    const hasProjectAccess = userMembership && 
                            (userMembership.role === ProjectMemberRole.OWNER || 
                             userMembership.role === ProjectMemberRole.ADMIN)
    const isAuthor = document.authorId === user.id

    if (!hasOrgAccess && !hasProjectAccess && !isAuthor) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete document and its versions
    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.deleteMany({
        where: { documentId }
      })
      await tx.document.delete({
        where: { id: documentId }
      })
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Document deleted successfully' }
    })

  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}