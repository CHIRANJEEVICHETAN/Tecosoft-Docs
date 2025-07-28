import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
    const query = searchParams.get('q')
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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

    // Get user's accessible projects
    const userProjects = await prisma.projectMember.findMany({
      where: {
        userId: user.id
      },
      select: {
        projectId: true
      }
    })

    const accessibleProjectIds = userProjects.map(pm => pm.projectId)

    // Build where clause
    const whereClause: Prisma.DocumentWhereInput = {
      projectId: {
        in: projectId ? [projectId] : accessibleProjectIds
      }
    }

    // Add search query filter
    if (query) {
      whereClause.OR = [
        {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          content: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          summary: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Add status filter
    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase() as any
    }

    // Build order by clause
    let orderBy: Prisma.DocumentOrderByWithRelationInput = {}
    
    switch (sortBy) {
      case 'title':
        orderBy = { title: sortOrder as 'asc' | 'desc' }
        break
      case 'createdAt':
        orderBy = { createdAt: sortOrder as 'asc' | 'desc' }
        break
      case 'project':
        orderBy = { project: { name: sortOrder as 'asc' | 'desc' } }
        break
      default:
        orderBy = { updatedAt: sortOrder as 'asc' | 'desc' }
    }

    // Search documents
    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      },
      orderBy,
      take: 50 // Limit results
    })

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length
    })

  } catch (error) {
    console.error('Error searching documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}