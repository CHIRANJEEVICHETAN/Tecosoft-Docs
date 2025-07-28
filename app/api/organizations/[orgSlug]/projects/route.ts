import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { MultiTenantService } from '@/lib/multi-tenant'
import { Role, ProjectMemberRole } from '@prisma/client'
import { Permission } from '@/lib/middleware/rbac-middleware'

/**
 * GET /api/organizations/[orgSlug]/projects
 * Get all projects within an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const projects = await MultiTenantService.getProjectsByOrganization(
          context.organizationId
        )
        return NextResponse.json(projects)
      } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
          { error: 'Failed to fetch projects' },
          { status: 500 }
        )
      }
    },
    [Permission.VIEW_PROJECT]
}

/**
 * POST /api/organizations/[orgSlug]/projects
 * Create a new project within an organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const body = await req.json()
        const { name, slug, description } = body

        if (!name || !slug) {
          return NextResponse.json(
            { error: 'Name and slug are required' },
            { status: 400 }
          )
        }

        const existingProject = await MultiTenantService.getProjectBySlugAndOrg(
          slug,
          context.organizationId
        )
        if (existingProject) {
          return NextResponse.json(
            { error: 'Project slug already exists in the organization' },
            { status: 409 }
          )
        }

        const project = await MultiTenantService.createProject({
          name,
          slug,
          description,
          organizationId: context.organizationId,
        })

        return NextResponse.json({
          message: 'Project created successfully',
          project: {
            id: project.id,
            name: project.name,
            slug: project.slug,
            description: project.description,
            createdAt: project.createdAt,
          },
        }, { status: 201 })
      } catch (error) {
        console.error('Error creating project:', error)
        return NextResponse.json(
          { error: 'Failed to create project' },
          { status: 500 }
        )
      }
    },
    [Permission.CREATE_PROJECT]
}
