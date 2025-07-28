import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ProjectMemberRole } from '@prisma/client'

/**
 * GET /api/manager/analytics
 * Get analytics for projects managed by the current user
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') || '30' // days
        const periodDays = parseInt(period)
        
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - periodDays)

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
            }
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            _count: {
              select: {
                members: true
              }
            }
          }
        })

        const projectIds = managedProjects.map(p => p.id)

        if (projectIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: {
              totalProjects: 0,
              totalMembers: 0,
              activeProjects: 0,
              projectsCreatedThisPeriod: 0,
              membersAddedThisPeriod: 0,
              projectsByStatus: {
                ACTIVE: 0,
                DRAFT: 0,
                ARCHIVED: 0
              },
              membersByRole: {
                OWNER: 0,
                ADMIN: 0,
                MEMBER: 0,
                VIEWER: 0
              },
              recentActivity: [],
              topProjects: []
            }
          })
        }

        // Calculate metrics
        const totalProjects = managedProjects.length
        const activeProjects = managedProjects.filter(p => p.status === 'ACTIVE').length
        
        // Count unique members across all managed projects
        const allMembers = managedProjects.flatMap(p => p.members)
        const uniqueMembers = new Set(allMembers.map(m => m.userId))
        const totalMembers = uniqueMembers.size

        // Projects created in the period
        const projectsCreatedThisPeriod = managedProjects.filter(
          p => p.createdAt >= startDate
        ).length

        // Members added in the period
        const membersAddedThisPeriod = allMembers.filter(
          m => m.createdAt >= startDate
        ).length

        // Projects by status
        const projectsByStatus = {
          ACTIVE: managedProjects.filter(p => p.status === 'ACTIVE').length,
          DRAFT: managedProjects.filter(p => p.status === 'DRAFT').length,
          ARCHIVED: managedProjects.filter(p => p.status === 'ARCHIVED').length
        }

        // Members by role
        const membersByRole = {
          OWNER: allMembers.filter(m => m.role === 'OWNER').length,
          ADMIN: allMembers.filter(m => m.role === 'ADMIN').length,
          MEMBER: allMembers.filter(m => m.role === 'MEMBER').length,
          VIEWER: allMembers.filter(m => m.role === 'VIEWER').length
        }

        // Recent activity (project updates and member additions)
        const recentProjectUpdates = managedProjects
          .filter(p => p.updatedAt >= startDate)
          .map(p => ({
            type: 'project_updated',
            projectId: p.id,
            projectName: p.name,
            timestamp: p.updatedAt.toISOString(),
            description: `Project "${p.name}" was updated`
          }))

        const recentMemberAdditions = allMembers
          .filter(m => m.createdAt >= startDate)
          .map(m => ({
            type: 'member_added',
            projectId: m.projectId,
            projectName: managedProjects.find(p => p.id === m.projectId)?.name || 'Unknown',
            userId: m.userId,
            userName: m.user.name || m.user.email,
            timestamp: m.createdAt.toISOString(),
            description: `${m.user.name || m.user.email} joined the project`
          }))

        const recentActivity = [...recentProjectUpdates, ...recentMemberAdditions]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)

        // Top projects by member count
        const topProjects = managedProjects
          .sort((a, b) => b._count.members - a._count.members)
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            memberCount: p._count.members,
            status: p.status,
            createdAt: p.createdAt.toISOString()
          }))

        return NextResponse.json({
          success: true,
          data: {
            totalProjects,
            totalMembers,
            activeProjects,
            projectsCreatedThisPeriod,
            membersAddedThisPeriod,
            projectsByStatus,
            membersByRole,
            recentActivity,
            topProjects,
            period: periodDays
          }
        })
      } catch (error) {
        console.error('Error fetching manager analytics:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch analytics' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}