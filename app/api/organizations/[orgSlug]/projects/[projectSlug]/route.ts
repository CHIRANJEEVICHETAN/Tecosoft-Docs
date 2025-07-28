import { NextRequest, NextResponse } from 'next/server'
import { protectProjectRoute } from '@/lib/middleware/route-protection'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { MultiTenantService } from '@/lib/multi-tenant'
import { Role, ProjectMemberRole, ProjectStatus } from '@prisma/client'
import { Permission } from '@/lib/middleware/rbac-middleware'

/**
 * GET /api/organizations/[orgSlug]/projects/[projectSlug]
 * Get project details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; projectSlug: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        const project = await MultiTenantService.getProjectBySlugAndOrg(
          params.projectSlug,
          context.organizationId
        )

        if (!project || project.id !== projectId) {
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          organization: {
            id: project.organization.id,
            name: project.organization.name,
            slug: project.organization.slug,
          },
          membersCount: project.members.length,
          members: project.members.map(member => ({
            id: member.id,
            role: member.role,
            joinedAt: member.createdAt,
            user: {
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              imageUrl: member.user.imageUrl,
            },
          })),
        })
      } catch (error) {
        console.error('Error fetching project:', error)
        return NextResponse.json(
          { error: 'Failed to fetch project' },
          { status: 500 }
        )
      }
    },
    [Permission.VIEW_PROJECT]
}

/**
 * PUT /api/organizations/[orgSlug]/projects/[projectSlug]
 * Update project details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; projectSlug: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        // Check if user has permission to update project
        const userRole = await MultiTenantService.getUserProjectRole(
          context.userId,
          projectId
        )
        
        if (!userRole || ![ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }

        const body = await req.json()
        const { name, description, status } = body

        if (!name) {
          return NextResponse.json(
            { error: 'Name is required' },
            { status: 400 }
          )
        }

        // Validate status if provided
        if (status && !Object.values(ProjectStatus).includes(status)) {
          return NextResponse.json(
            { error: 'Invalid project status' },
            { status: 400 }
          )
        }

        const updatedProject = await MultiTenantService.updateProject(
          projectId,
          { name, description, status }
        )

        return NextResponse.json({
          message: 'Project updated successfully',
          project: {
            id: updatedProject.id,
            name: updatedProject.name,
            slug: updatedProject.slug,
            description: updatedProject.description,
            status: updatedProject.status,
            updatedAt: updatedProject.updatedAt,
          },
        })
      } catch (error) {
        console.error('Error updating project:', error)
        return NextResponse.json(
          { error: 'Failed to update project' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
}

/**
 * DELETE /api/organizations/[orgSlug]/projects/[projectSlug]
 * Delete project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; projectSlug: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        // Check if user has permission to delete project
        const userRole = await MultiTenantService.getUserProjectRole(
          context.userId,
          projectId
        )
        
        if (!userRole || userRole !== ProjectMemberRole.OWNER) {
          return NextResponse.json(
            { error: 'Only project owners can delete projects' },
            { status: 403 }
          )
        }

        await MultiTenantService.deleteProject(projectId)

        return NextResponse.json({
          message: 'Project deleted successfully',
        })
      } catch (error) {
        console.error('Error deleting project:', error)
        return NextResponse.json(
          { error: 'Failed to delete project' },
          { status: 500 }
        )
      }
    },
    [Permission.DELETE_PROJECT]
}
