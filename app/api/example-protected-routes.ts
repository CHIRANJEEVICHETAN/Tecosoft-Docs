// Example API routes demonstrating RBAC middleware usage
// These are examples - you would typically split these into separate route files

import { NextRequest, NextResponse } from 'next/server'
import { 
  protectRoute, 
  protectOrganizationRoute, 
  protectProjectRoute,
  RouteProtectors,
  checkUserPermissions,
  checkUserProjectPermissions
} from '../../lib/middleware/route-protection'
import { Permission } from '../../lib/middleware/rbac-middleware'
import { TenantContext } from '../../lib/middleware/tenant-middleware'

// Example 1: Organization management route
// /api/org/[orgSlug]/settings
export async function updateOrganizationSettings(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      // Only organization admins can update settings
      const body = await req.json()
      
      // Your organization update logic here
      console.log('Updating organization:', context.organizationId, 'with data:', body)
      
      return NextResponse.json({ 
        message: 'Organization updated successfully',
        organizationId: context.organizationId
      })
    },
    [Permission.MANAGE_ORGANIZATION]
  )
}

// Example 2: User management route
// /api/org/[orgSlug]/users
export async function manageUsers(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      if (req.method === 'GET') {
        // View users - managers and admins can do this
        return NextResponse.json({ 
          message: 'Listing users',
          organizationId: context.organizationId,
          userRole: context.userRole
        })
      } else if (req.method === 'POST') {
        // Add user - only admins can do this
        const body = await req.json()
        return NextResponse.json({ 
          message: 'User added',
          userData: body
        })
      }
      
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    },
    req.method === 'GET' ? [Permission.VIEW_USERS] : [Permission.MANAGE_USERS]
  )
}

// Example 3: Project management route
// /api/org/[orgSlug]/projects/[projectSlug]/settings
export async function updateProjectSettings(request: NextRequest) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      const body = await req.json()
      
      // Your project update logic here
      console.log('Updating project:', projectId, 'with data:', body)
      
      return NextResponse.json({ 
        message: 'Project updated successfully',
        projectId,
        organizationId: context.organizationId
      })
    },
    [Permission.MANAGE_PROJECT]
  )
}

// Example 4: Content creation route
// /api/org/[orgSlug]/projects/[projectSlug]/content
export async function createContent(request: NextRequest) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      const body = await req.json()
      
      // Your content creation logic here
      console.log('Creating content in project:', projectId, 'with data:', body)
      
      return NextResponse.json({ 
        message: 'Content created successfully',
        projectId,
        contentData: body
      })
    },
    [Permission.CREATE_CONTENT]
  )
}

// Example 5: Using pre-configured route protectors
// /api/org/[orgSlug]/analytics
export const getAnalytics = RouteProtectors.analyticsViewer(
  async (request: NextRequest, context?: TenantContext) => {
    return NextResponse.json({
      message: 'Analytics data',
      organizationId: context?.organizationId,
      analytics: {
        // Your analytics data here
      }
    })
  }
)

// Example 6: Complex route with multiple permission checks
// /api/org/[orgSlug]/projects/[projectSlug]/publish
export async function publishContent(request: NextRequest) {
  return protectRoute(
    request,
    async (req: NextRequest, context?: TenantContext, projectId?: string) => {
      const body = await req.json()
      const { contentId } = body
      
      // Your content publishing logic here
      console.log('Publishing content:', contentId, 'in project:', projectId)
      
      return NextResponse.json({ 
        message: 'Content published successfully',
        contentId,
        projectId
      })
    },
    {
      requiredPermissions: [Permission.PUBLISH_CONTENT],
      requireTenantContext: true,
      requireProjectAccess: true,
      checkProjectRole: true
    }
  )
}

// Example 7: Route with conditional permissions based on request
// /api/org/[orgSlug]/projects/[projectSlug]/members
export async function manageProjectMembers(request: NextRequest) {
  // Different permissions for different HTTP methods
  const requiredPermissions = request.method === 'GET' 
    ? [Permission.VIEW_PROJECT_MEMBERS]
    : [Permission.MANAGE_PROJECT_MEMBERS]

  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      if (req.method === 'GET') {
        return NextResponse.json({
          message: 'Project members list',
          projectId,
          members: [] // Your members data here
        })
      } else if (req.method === 'POST') {
        const body = await req.json()
        return NextResponse.json({
          message: 'Member added to project',
          projectId,
          newMember: body
        })
      } else if (req.method === 'DELETE') {
        const { memberId } = await req.json()
        return NextResponse.json({
          message: 'Member removed from project',
          projectId,
          removedMemberId: memberId
        })
      }
      
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    },
    requiredPermissions
  )
}

// Example 8: Utility function to check permissions for UI rendering
// This would be used in React components to conditionally show/hide UI elements
export async function checkUIPermissions(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const permissions = searchParams.get('permissions')?.split(',') as Permission[]
    
    if (!userId || !permissions) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (projectId) {
      const result = await checkUserProjectPermissions(userId, projectId, permissions)
      return NextResponse.json(result)
    } else {
      const result = await checkUserPermissions(userId, permissions)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Permission check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Example 9: Super admin only route
// /api/admin/system-settings
export const updateSystemSettings = RouteProtectors.superAdminOnly(
  async (request: NextRequest) => {
    const body = await request.json()
    
    // System-level configuration changes
    console.log('Updating system settings:', body)
    
    return NextResponse.json({
      message: 'System settings updated',
      settings: body
    })
  }
)

// Example 10: Custom permission validation
// /api/org/[orgSlug]/custom-action
export async function customPermissionAction(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      // You can also add custom business logic for permission checks
      const body = await req.json()
      const { actionType } = body
      
      // Additional custom validation based on business rules
      if (actionType === 'critical_action' && context.userRole !== 'ORG_ADMIN') {
        return NextResponse.json(
          { error: 'Critical actions require organization admin role' },
          { status: 403 }
        )
      }
      
      return NextResponse.json({
        message: 'Custom action executed',
        actionType,
        executedBy: context.userRole
      })
    },
    [Permission.MANAGE_ORGANIZATION] // Base permission requirement
  )
}

/* 
Usage examples for different route patterns:

1. Organization-level routes: /api/org/[orgSlug]/...
   - Use protectOrganizationRoute() or RouteProtectors.organizationMember/organizationAdmin

2. Project-level routes: /api/org/[orgSlug]/projects/[projectSlug]/...
   - Use protectProjectRoute() or RouteProtectors.projectMember/projectManager

3. Global admin routes: /api/admin/...
   - Use RouteProtectors.superAdminOnly

4. Custom protection: 
   - Use protectRoute() with custom options

5. UI permission checks:
   - Use checkUserPermissions() or checkUserProjectPermissions()

Remember to:
- Always validate input data
- Log security-relevant actions
- Handle errors gracefully
- Follow the principle of least privilege
- Test permission boundaries thoroughly
*/ 
