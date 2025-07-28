import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ProjectMemberRole } from '@prisma/client'

/**
 * GET /api/manager/team
 * Get team members from projects managed by the current user
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const { searchParams } = new URL(req.url)
        const projectId = searchParams.get('projectId') || undefined

        // Get projects managed by the current user
        const managedProjects = await prisma.project.findMany({
          where: {
            organizationId: context.organizationId,
            members: {
              some: {
                userId: context.userId,
                role: {
                  in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN]
                }
              }
            },
            ...(projectId && { id: projectId })
          },
          select: {
            id: true,
            name: true,
            slug: true
          }
        })

        const projectIds = managedProjects.map(p => p.id)

        if (projectIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: {
              members: [],
              projects: []
            }
          })
        }

        // Get all team members from managed projects
        const projectMembers = await prisma.projectMember.findMany({
          where: {
            projectId: {
              in: projectIds
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                role: true
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        // Group members by user to avoid duplicates
        const memberMap = new Map()
        
        projectMembers.forEach(member => {
          const userId = member.user.id
          if (!memberMap.has(userId)) {
            memberMap.set(userId, {
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              imageUrl: member.user.imageUrl,
              organizationRole: member.user.role,
              projects: []
            })
          }
          
          memberMap.get(userId).projects.push({
            projectId: member.project.id,
            projectName: member.project.name,
            projectSlug: member.project.slug,
            role: member.role,
            joinedAt: member.createdAt.toISOString()
          })
        })

        const uniqueMembers = Array.from(memberMap.values())

        return NextResponse.json({
          success: true,
          data: {
            members: uniqueMembers,
            projects: managedProjects.map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug
            })),
            totalMembers: uniqueMembers.length,
            totalProjects: managedProjects.length
          }
        })
      } catch (error) {
        console.error('Error fetching team members:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch team members' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}