import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ProjectMemberRole } from '@prisma/client'

/**
 * GET /api/manager/projects
 * Get projects managed by the current user
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || undefined
        const status = searchParams.get('status') || undefined

        const skip = (page - 1) * limit

        // Build where clause
        const where: any = {
          organizationId: context.organizationId,
          members: {
            some: {
              userId: context.userId,
              role: {
                in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN]
              }
            }
          }
        }

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }

        if (status) {
          where.status = status
        }

        // Get projects with member counts
        const [projects, total] = await Promise.all([
          prisma.project.findMany({
            where,
            include: {
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
                  members: true
                }
              }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit
          }),
          prisma.project.count({ where })
        ])

        // Transform data for response
        const transformedProjects = projects.map(project => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          status: project.status,
          memberCount: project._count.members,
          members: project.members.map(member => ({
            id: member.id,
            role: member.role,
            user: member.user
          })),
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        }))

        return NextResponse.json({
          success: true,
          data: transformedProjects,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        })
      } catch (error) {
        console.error('Error fetching managed projects:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch managed projects' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}