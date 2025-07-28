import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { MultiTenantService } from '@/lib/multi-tenant'
import { Role } from '@prisma/client'
import { Permission } from '@/lib/middleware/rbac-middleware'

/**
 * GET /api/organizations/[orgSlug]
 * Get organization details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const organization = await MultiTenantService.getOrganizationBySlug(params.orgSlug)
        
        if (!organization || organization.id !== context.organizationId) {
          return NextResponse.json(
            { error: 'Organization not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
          usersCount: organization.users.length,
          projectsCount: organization.projects.length,
        })
      } catch (error) {
        console.error('Error fetching organization:', error)
        return NextResponse.json(
          { error: 'Failed to fetch organization' },
          { status: 500 }
        )
      }
    },
    [Permission.VIEW_ORGANIZATION]
}

/**
 * PUT /api/organizations/[orgSlug]
 * Update organization details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        // Only org admins and super admins can update organization
        const user = await MultiTenantService.getUserByClerkId(context.userId)
        
        if (!user || ![Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(user.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }

        const body = await req.json()
        const { name, description } = body

        if (!name) {
          return NextResponse.json(
            { error: 'Name is required' },
            { status: 400 }
          )
        }

        // Update organization using Prisma directly
        // We'll need to add this method to MultiTenantService
        const updatedOrg = await MultiTenantService.updateOrganization(
          context.organizationId,
          { name, description }
        )

        return NextResponse.json({
          message: 'Organization updated successfully',
          organization: {
            id: updatedOrg.id,
            name: updatedOrg.name,
            slug: updatedOrg.slug,
            description: updatedOrg.description,
            updatedAt: updatedOrg.updatedAt,
          },
        })
      } catch (error) {
        console.error('Error updating organization:', error)
        return NextResponse.json(
          { error: 'Failed to update organization' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_ORGANIZATION]
}

/**
 * DELETE /api/organizations/[orgSlug]
 * Delete organization (Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        // Only super admins can delete organizations
        const user = await MultiTenantService.getUserByClerkId(context.userId)
        
        if (!user || user.role !== Role.SUPER_ADMIN) {
          return NextResponse.json(
            { error: 'Only super admins can delete organizations' },
            { status: 403 }
          )
        }

        await MultiTenantService.deleteOrganization(context.organizationId)

        return NextResponse.json({
          message: 'Organization deleted successfully',
        })
      } catch (error) {
        console.error('Error deleting organization:', error)
        return NextResponse.json(
          { error: 'Failed to delete organization' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_ORGANIZATION]
  )
}
