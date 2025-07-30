import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { VersionControlService } from '@/lib/services/version-control-service'

/**
 * GET /api/documents/[documentId]/versions
 * Get all versions of a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documentId } = params

    // Verify user has access to this document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          include: {
            organization: true,
            members: {
              where: {
                user: { clerkId: userId }
              }
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

    // Check if user has access to this document's project
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const hasAccess = document.project.members.length > 0 || 
                     user.organizationId === document.project.organizationId

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get version history
    const versions = await VersionControlService.getVersionHistory(documentId)

    return NextResponse.json({
      success: true,
      data: versions
    })

  } catch (error) {
    console.error('Error fetching document versions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/[documentId]/versions
 * Create a new version of a document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documentId } = params
    const body = await request.json()
    const { title, content, summary, changeDescription } = body

    // Verify user has edit access to this document
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Create new version
    const version = await VersionControlService.createVersion(
      documentId,
      title,
      content,
      summary,
      user.id,
      changeDescription
    )

    // Update the main document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        title,
        content,
        summary,
      }
    })

    return NextResponse.json({
      success: true,
      data: version
    })

  } catch (error) {
    console.error('Error creating document version:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}