import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { withTenantContext, withProjectAccess, TenantContext } from './tenant-middleware'
import { 
  Permission, 
  hasPermission,
  RolePermissions,
  getRolePermissions,
  getProjectRolePermissions,
  withRBAC,
  withProjectRBAC,
  hasProjectPermission
} from './rbac-middleware'
import { MultiTenantService } from '../multi-tenant'
import { Role, ProjectMemberRole } from '@prisma/client'

export type ProtectedRouteOptions = {
  requiredPermissions: Permission[]
  checkProjectRole?: boolean
  requireTenantContext?: boolean
  requireProjectAccess?: boolean
}

export type RouteHandler = (
  request: NextRequest,
  context?: TenantContext,
  projectId?: string
) => Promise<NextResponse>

/**
 * Main route protection wrapper that combines authentication, tenant context, and RBAC
 */
export async function protectRoute(
  request: NextRequest,
  handler: RouteHandler,
  options: ProtectedRouteOptions
): Promise<NextResponse> {
  try {
    // Check authentication first
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If tenant context is not required, just check basic permissions
    if (!options.requireTenantContext) {
      const user = await MultiTenantService.getUserByClerkId(userId)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Check if user has required permissions at organization level
      const userPermissions = getRolePermissions(user.role)
      const hasRequiredPermissions = options.requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      )

      if (!hasRequiredPermissions && user.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({
          error: 'Insufficient permissions',
          required: options.requiredPermissions,
          userRole: user.role
        }, { status: 403 })
      }

      return handler(request)
    }

    // For routes requiring tenant context, use the tenant middleware
    return withTenantContext(request, async (req, context) => {
      // If project access is required, use project middleware
      if (options.requireProjectAccess) {
        return withProjectAccess(req, context, async (request, tenantContext, projectId) => {
          return withProjectRBAC(
            request,
            tenantContext,
            projectId,
            options.requiredPermissions,
            (req, ctx, projId) => handler(req, ctx, projId)
          )
        })
      }

      // Otherwise, just use RBAC with tenant context
      return withRBAC(
        req,
        context,
        options.requiredPermissions,
        (request, ctx) => handler(request, ctx),
        { checkProjectRole: options.checkProjectRole }
      )
    })

  } catch (error) {
    console.error('Route protection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Quick protection for organization-level routes
 * This version gets organization context from the user's database record
 */
export async function protectOrganizationRoute(
  request: NextRequest,
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>,
  requiredPermissions: Permission[]
): Promise<NextResponse> {
  try {
    // Check authentication first
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await MultiTenantService.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has required permissions
    const userPermissions = getRolePermissions(user.role)
    const hasRequiredPermissions = user.role === Role.SUPER_ADMIN || 
      requiredPermissions.every(permission => userPermissions.includes(permission))

    if (!hasRequiredPermissions) {
      return NextResponse.json({
        error: 'Insufficient permissions',
        required: requiredPermissions,
        userRole: user.role
      }, { status: 403 })
    }

    // Create tenant context from user data
    const context: TenantContext = {
      organizationId: user.organizationId || '',
      organizationSlug: '', // We don't have this from the user record
      userId: user.id,
      userRole: user.role,
    }

    return handler(request, context)
  } catch (error) {
    console.error('Route protection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Quick protection for project-level routes
 */
export async function protectProjectRoute(
  request: NextRequest,
  handler: (req: NextRequest, context: TenantContext, projectId: string) => Promise<NextResponse>,
  requiredPermissions: Permission[]
): Promise<NextResponse> {
  return protectRoute(
    request,
    (req: NextRequest, context?: TenantContext, projectId?: string) => {
      if (!context || !projectId) {
        return Promise.resolve(NextResponse.json({ error: 'Missing tenant context or project ID' }, { status: 500 }))
      }
      return handler(req, context, projectId)
    },
    {
      requiredPermissions,
      requireTenantContext: true,
      requireProjectAccess: true,
      checkProjectRole: true
    }
  )
}

/**
 * Utility to check permissions without route protection (for conditional UI logic)
 */
export async function checkUserPermissions(userId: string, permissions: Permission[]): Promise<{
  hasPermissions: boolean
  userRole: Role | null
  organizationId: string | null
}> {
  try {
    const user = await MultiTenantService.getUserByClerkId(userId)
    
    if (!user) {
      return {
        hasPermissions: false,
        userRole: null,
        organizationId: null
      }
    }

    const userPermissions = getRolePermissions(user.role)
    const hasPermissions = user.role === Role.SUPER_ADMIN || 
      permissions.every(permission => userPermissions.includes(permission))

    return {
      hasPermissions,
      userRole: user.role,
      organizationId: user.organizationId
    }
  } catch (error) {
    console.error('Permission check error:', error)
    return {
      hasPermissions: false,
      userRole: null,
      organizationId: null
    }
  }
}

/**
 * Utility to check project-specific permissions
 */
export async function checkUserProjectPermissions(
  userId: string, 
  projectId: string, 
  permissions: Permission[]
): Promise<{
  hasPermissions: boolean
  userRole: Role | null
  projectRole: ProjectMemberRole | null
  organizationId: string | null
}> {
  try {
    const user = await MultiTenantService.getUserByClerkId(userId)
    
    if (!user) {
      return {
        hasPermissions: false,
        userRole: null,
        projectRole: null,
        organizationId: null
      }
    }

    // Check organization-level permissions
    const userPermissions = getRolePermissions(user.role)
    const hasOrgPermissions = user.role === Role.SUPER_ADMIN || 
      permissions.every(permission => userPermissions.includes(permission))

    // Check project-level permissions
    const projectRole = await MultiTenantService.getUserProjectRole(user.clerkId, projectId)
    let hasProjectPermissions = false

    if (projectRole) {
      const projectPermissions = getProjectRolePermissions(projectRole)
      hasProjectPermissions = permissions.every(permission => 
        projectPermissions.includes(permission)
      )
    }

    return {
      hasPermissions: hasOrgPermissions || hasProjectPermissions,
      userRole: user.role,
      projectRole,
      organizationId: user.organizationId
    }
  } catch (error) {
    console.error('Project permission check error:', error)
    return {
      hasPermissions: false,
      userRole: null,
      projectRole: null,
      organizationId: null
    }
  }
}

/**
 * Higher-order function to create protected API route handlers
 */
export function createProtectedRoute(options: ProtectedRouteOptions) {
  return function(handler: RouteHandler) {
    return async function(request: NextRequest, ...args: any[]) {
      return protectRoute(request, handler, options)
    }
  }
}

/**
 * Pre-configured route protectors for common scenarios
 */
export const RouteProtectors = {
  // Super admin only
  superAdminOnly: createProtectedRoute({
    requiredPermissions: [Permission.MANAGE_ORGANIZATION],
    requireTenantContext: false
  }),

  // Organization admin routes
  organizationAdmin: createProtectedRoute({
    requiredPermissions: [Permission.MANAGE_ORGANIZATION],
    requireTenantContext: true
  }),

  // Organization member routes
  organizationMember: createProtectedRoute({
    requiredPermissions: [Permission.VIEW_ORGANIZATION],
    requireTenantContext: true
  }),

  // Project management routes
  projectManager: createProtectedRoute({
    requiredPermissions: [Permission.MANAGE_PROJECT],
    requireTenantContext: true,
    requireProjectAccess: true,
    checkProjectRole: true
  }),

  // Project member routes
  projectMember: createProtectedRoute({
    requiredPermissions: [Permission.VIEW_PROJECT],
    requireTenantContext: true,
    requireProjectAccess: true,
    checkProjectRole: true
  }),

  // Content creation routes
  contentCreator: createProtectedRoute({
    requiredPermissions: [Permission.CREATE_CONTENT],
    requireTenantContext: true,
    requireProjectAccess: true,
    checkProjectRole: true
  }),

  // Content editing routes
  contentEditor: createProtectedRoute({
    requiredPermissions: [Permission.EDIT_CONTENT],
    requireTenantContext: true,
    requireProjectAccess: true,
    checkProjectRole: true
  }),

  // Analytics routes
  analyticsViewer: createProtectedRoute({
    requiredPermissions: [Permission.VIEW_ANALYTICS],
    requireTenantContext: true,
    checkProjectRole: true
  })
}
