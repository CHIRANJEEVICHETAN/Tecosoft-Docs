import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, DocumentStatus } from '@prisma/client'

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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as DocumentStatus | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

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

    // Build where clause
    const whereClause: any = {
      projectId
    }

    if (status) {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get documents
    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            documentVersions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Transform data to include additional metadata
    const transformedDocuments = documents.map(doc => ({
      ...doc,
      versionCount: doc._count.documentVersions,
      canEdit: userMembership || hasOrgAccess,
      canDelete: userMembership || hasOrgAccess || doc.authorId === user.id,
      wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
      readingTime: doc.content ? Math.ceil(doc.content.split(/\s+/).length / 200) : 0 // ~200 words per minute
    }))

    // Get total count for pagination
    const totalCount = await prisma.document.count({
      where: whereClause
    })

    // Calculate summary statistics
    const statusCounts = await prisma.document.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true
    })

    const statusSummary = statusCounts.reduce((acc, item) => {
      acc[item.status] = Number(item._count)
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: transformedDocuments,
      meta: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        statusSummary,
        userRole: userMembership?.role || null
      }
    })

  } catch (error) {
    console.error('Error fetching project documents:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}