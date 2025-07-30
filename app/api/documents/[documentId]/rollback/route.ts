import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { VersionControlService } from '@/lib/services/version-control-service'

/**
 * POST /api/documents/[documentId]/rollback
 * Rollback document to a specific version
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
    const { version } = body

    if (!version || typeof version !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Version number is required' },
        { status: 400 }
      )
    }

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

    // Verify document exists and user has access
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

    // Check access
    const hasAccess = document.project.members.length > 0 || 
                     user.organizationId === document.project.organizationId

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create backup before rollback
    await VersionControlService.createBackupVersion(
      documentId,
      user.id,
      `Backup before rollback to version ${version}`
    )

    // Perform rollback
    const newVersion = await VersionControlService.rollbackToVersion(
      documentId,
      version,
      user.id
    )

    return NextResponse.json({
      success: true,
      data: newVersion,
      message: `Document rolled back to version ${version}`
    })

  } catch (error) {
    console.error('Error rolling back document:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}