import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { MultiTenantService } from '../multi-tenant'

export type TenantContext = {
  organizationId: string
  organizationSlug: string
  userId: string
  userRole: string
}

/**
 * Middleware to extract and validate tenant context from request
 */
export async function withTenantContext(
  request: NextRequest,
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract organization slug from URL path
    const pathname = request.nextUrl.pathname
    const pathSegments = pathname.split('/').filter(Boolean)
    
    // Expecting URL pattern: /org/[orgSlug]/...
    if (pathSegments.length < 2 || pathSegments[0] !== 'org') {
      return NextResponse.json({ error: 'Invalid tenant path' }, { status: 400 })
    }

    const organizationSlug = pathSegments[1]

    // Get organization and verify user access
    const organization = await MultiTenantService.getOrganizationBySlug(organizationSlug)
    
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify user has access to this organization
    const hasAccess = await MultiTenantService.canUserAccessOrganization(userId, organization.id)
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get user details
    const user = await MultiTenantService.getUserByClerkId(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const context: TenantContext = {
      organizationId: organization.id,
      organizationSlug: organizationSlug,
      userId: user.id,
      userRole: user.role,
    }

    return handler(request, context)
  } catch (error) {
    console.error('Tenant middleware error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Middleware to validate project access within tenant context
 */
export async function withProjectAccess(
  request: NextRequest,
  context: TenantContext,
  handler: (req: NextRequest, context: TenantContext, projectId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extract project slug from URL path
    const pathname = request.nextUrl.pathname
    const pathSegments = pathname.split('/').filter(Boolean)
    
    // Expecting URL pattern: /org/[orgSlug]/projects/[projectSlug]/...
    const projectSlugIndex = pathSegments.indexOf('projects') + 1
    
    if (projectSlugIndex === 0 || projectSlugIndex >= pathSegments.length) {
      return NextResponse.json({ error: 'Invalid project path' }, { status: 400 })
    }

    const projectSlug = pathSegments[projectSlugIndex]

    // Get project and verify it belongs to the organization
    const project = await MultiTenantService.getProjectBySlugAndOrg(projectSlug, context.organizationId)
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify user has access to this project
    const user = await MultiTenantService.getUserByClerkId(context.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hasAccess = await MultiTenantService.canUserAccessProject(user.clerkId, project.id)
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project access denied' }, { status: 403 })
    }

    return handler(request, context, project.id)
  } catch (error) {
    console.error('Project access middleware error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Role-based access control decorator
 */
export function requireRole(allowedRoles: string[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (request: NextRequest, context: TenantContext, ...args: any[]) {
      if (!allowedRoles.includes(context.userRole)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      
      return method.apply(this, [request, context, ...args])
    }
  }
}
