# RBAC Middleware Guide

This guide explains how to use the Role-Based Access Control (RBAC) middleware system for protecting routes and managing user permissions in your application.

## Overview

The RBAC system provides:
- **Role-based permissions** at organization and project levels
- **Route protection middleware** for API endpoints
- **React hooks and components** for client-side permission checking
- **Flexible permission matrices** that can be easily customized

## Architecture

### Roles and Permissions

#### Organization Roles
- `SUPER_ADMIN` - Platform administrator with all permissions
- `ORG_ADMIN` - Organization administrator
- `MANAGER` - Project manager with elevated permissions
- `USER` - Regular user with basic permissions
- `VIEWER` - Read-only access

#### Project Roles
- `OWNER` - Project owner with full control
- `ADMIN` - Project administrator
- `MEMBER` - Regular project member
- `VIEWER` - Read-only project access

#### Permissions
```typescript
enum Permission {
  // Organization-level
  MANAGE_ORGANIZATION = 'manage_organization',
  VIEW_ORGANIZATION = 'view_organization',
  MANAGE_USERS = 'manage_users',
  VIEW_USERS = 'view_users',
  
  // Project-level
  CREATE_PROJECT = 'create_project',
  MANAGE_PROJECT = 'manage_project',
  VIEW_PROJECT = 'view_project',
  DELETE_PROJECT = 'delete_project',
  
  // Content permissions
  CREATE_CONTENT = 'create_content',
  EDIT_CONTENT = 'edit_content',
  DELETE_CONTENT = 'delete_content',
  VIEW_CONTENT = 'view_content',
  PUBLISH_CONTENT = 'publish_content',
  
  // Member management
  MANAGE_PROJECT_MEMBERS = 'manage_project_members',
  VIEW_PROJECT_MEMBERS = 'view_project_members',
  
  // Analytics and reporting
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',
}
```

## Server-Side Usage

### API Route Protection

#### 1. Organization-Level Routes

```typescript
// /api/org/[orgSlug]/settings/route.ts
import { protectOrganizationRoute, Permission } from '@/lib/middleware/route-protection'

export async function PUT(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const body = await req.json()
      // Your organization update logic
      return NextResponse.json({ success: true })
    },
    [Permission.MANAGE_ORGANIZATION]
  )
}
```

#### 2. Project-Level Routes

```typescript
// /api/org/[orgSlug]/projects/[projectSlug]/content/route.ts
import { protectProjectRoute, Permission } from '@/lib/middleware/route-protection'

export async function POST(request: NextRequest) {
  return protectProjectRoute(
    request,
    async (req, context, projectId) => {
      const body = await req.json()
      // Your content creation logic
      return NextResponse.json({ contentId: 'new-content', projectId })
    },
    [Permission.CREATE_CONTENT]
  )
}
```

#### 3. Using Pre-configured Protectors

```typescript
// /api/admin/system-settings/route.ts
import { RouteProtectors } from '@/lib/middleware/route-protection'

export const PUT = RouteProtectors.superAdminOnly(
  async (request) => {
    const settings = await request.json()
    // System configuration logic
    return NextResponse.json({ success: true })
  }
)

// /api/org/[orgSlug]/analytics/route.ts
export const GET = RouteProtectors.analyticsViewer(
  async (request, context) => {
    // Analytics data logic
    return NextResponse.json({ analytics: {} })
  }
)
```

#### 4. Custom Protection with Multiple Options

```typescript
import { protectRoute, Permission } from '@/lib/middleware/route-protection'

export async function POST(request: NextRequest) {
  return protectRoute(
    request,
    async (req, context, projectId) => {
      // Your logic here
      return NextResponse.json({ success: true })
    },
    {
      requiredPermissions: [Permission.PUBLISH_CONTENT],
      requireTenantContext: true,
      requireProjectAccess: true,
      checkProjectRole: true
    }
  )
}
```

### Method-Based Permission Checking

For routes that handle multiple HTTP methods with different permission requirements:

```typescript
export async function handler(request: NextRequest) {
  const requiredPermissions = {
    GET: [Permission.VIEW_USERS],
    POST: [Permission.MANAGE_USERS],
    DELETE: [Permission.MANAGE_USERS]
  }[request.method] || []

  return protectOrganizationRoute(
    request,
    async (req, context) => {
      switch (req.method) {
        case 'GET':
          return NextResponse.json({ users: [] })
        case 'POST':
          const userData = await req.json()
          return NextResponse.json({ created: userData })
        case 'DELETE':
          return NextResponse.json({ deleted: true })
        default:
          return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
      }
    },
    requiredPermissions
  )
}
```

## Client-Side Usage

### React Hooks

#### 1. Organization Permissions

```typescript
import { usePermissions, Permission } from '@/lib/hooks/use-permissions'

function OrganizationSettings() {
  const { hasPermissions, loading } = usePermissions([Permission.MANAGE_ORGANIZATION])
  
  if (loading) return <div>Loading...</div>
  if (!hasPermissions) return <div>Access denied</div>
  
  return (
    <div>
      <h1>Organization Settings</h1>
      {/* Settings form */}
    </div>
  )
}
```

#### 2. Project Permissions

```typescript
import { useProjectPermissions, Permission } from '@/lib/hooks/use-permissions'

function ProjectEditor({ projectId }: { projectId: string }) {
  const { hasPermissions, projectRole } = useProjectPermissions(
    projectId,
    [Permission.EDIT_CONTENT]
  )
  
  if (!hasPermissions) {
    return <div>You don't have permission to edit content in this project</div>
  }
  
  return (
    <div>
      <h1>Content Editor (Role: {projectRole})</h1>
      {/* Editor interface */}
    </div>
  )
}
```

#### 3. Common Permissions Hook

```typescript
import { useCommonPermissions } from '@/lib/hooks/use-permissions'

function NavigationMenu() {
  const {
    canManageOrg,
    canCreateProject,
    canViewAnalytics,
    isSuperAdmin,
    isOrgAdmin
  } = useCommonPermissions()
  
  return (
    <nav>
      {canCreateProject && <a href="/projects/new">New Project</a>}
      {canManageOrg && <a href="/org/settings">Organization Settings</a>}
      {canViewAnalytics && <a href="/analytics">Analytics</a>}
      {isSuperAdmin && <a href="/admin">System Admin</a>}
    </nav>
  )
}
```

### Permission Gates

#### 1. Permission-Based Rendering

```typescript
import { PermissionGate, Permission } from '@/lib/hooks/use-permissions'

function ProjectDashboard({ projectId }: { projectId: string }) {
  return (
    <div>
      <h1>Project Dashboard</h1>
      
      <PermissionGate
        permissions={[Permission.MANAGE_PROJECT]}
        projectId={projectId}
        fallback={<div>Read-only view</div>}
      >
        <button>Edit Project Settings</button>
      </PermissionGate>
      
      <PermissionGate
        permissions={[Permission.CREATE_CONTENT]}
        projectId={projectId}
      >
        <button>Create New Content</button>
      </PermissionGate>
    </div>
  )
}
```

#### 2. Role-Based Rendering

```typescript
import { RoleGate, Role } from '@/lib/hooks/use-permissions'

function AdminPanel() {
  return (
    <div>
      <RoleGate allowedRoles={[Role.SUPER_ADMIN]}>
        <button>System Configuration</button>
      </RoleGate>
      
      <RoleGate 
        allowedRoles={[Role.ORG_ADMIN, Role.SUPER_ADMIN]}
        fallback={<div>Organization admin access required</div>}
      >
        <button>Manage Organization</button>
      </RoleGate>
    </div>
  )
}
```

### Higher-Order Components

```typescript
import { withPermissions, Permission } from '@/lib/hooks/use-permissions'

const ProtectedAdminPanel = withPermissions(
  function AdminPanel() {
    return <div>Admin Panel Content</div>
  },
  [Permission.MANAGE_ORGANIZATION],
  () => <div>Access Denied</div>
)

// Usage
function App() {
  return <ProtectedAdminPanel />
}
```

## Permission Checking Utilities

### Server-Side Permission Checks

```typescript
import { checkUserPermissions, checkUserProjectPermissions } from '@/lib/middleware/route-protection'

// Check organization permissions
const orgPermissions = await checkUserPermissions(userId, [Permission.MANAGE_USERS])
console.log(orgPermissions.hasPermissions) // boolean
console.log(orgPermissions.userRole) // Role

// Check project permissions
const projectPermissions = await checkUserProjectPermissions(
  userId, 
  projectId, 
  [Permission.EDIT_CONTENT]
)
console.log(projectPermissions.hasPermissions) // boolean
console.log(projectPermissions.projectRole) // ProjectMemberRole
```

### Client-Side Utility Hooks

```typescript
import { useHasPermission, useHasRole } from '@/lib/hooks/use-permissions'

function ConditionalButton({ projectId }: { projectId: string }) {
  const canEdit = useHasPermission(Permission.EDIT_CONTENT, projectId)
  const isAdmin = useHasRole([Role.ORG_ADMIN, Role.SUPER_ADMIN])
  
  return (
    <div>
      {canEdit && <button>Edit</button>}
      {isAdmin && <button>Admin Actions</button>}
    </div>
  )
}
```

## Customizing Permissions

### Adding New Permissions

1. Add the permission to the `Permission` enum:

```typescript
// lib/middleware/rbac-middleware.ts
export enum Permission {
  // ... existing permissions
  MANAGE_BILLING = 'manage_billing',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
}
```

2. Update the role permission matrices:

```typescript
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ORG_ADMIN]: [
    // ... existing permissions
    Permission.MANAGE_BILLING,
    Permission.VIEW_AUDIT_LOGS,
  ],
  // ... other roles
}
```

### Custom Permission Logic

For complex business rules, you can add custom validation:

```typescript
export async function customPermissionCheck(
  request: NextRequest,
  context: TenantContext
): Promise<NextResponse | null> {
  // Custom business logic
  const user = await MultiTenantService.getUserByClerkId(context.userId)
  
  if (someCustomCondition) {
    return NextResponse.json({ error: 'Custom permission denied' }, { status: 403 })
  }
  
  return null // Permission granted
}

// Use in route protection
export async function protectedRoute(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req, context) => {
      // First check custom permissions
      const customCheck = await customPermissionCheck(req, context)
      if (customCheck) return customCheck
      
      // Then proceed with normal logic
      return NextResponse.json({ success: true })
    },
    [Permission.MANAGE_ORGANIZATION]
  )
}
```

## Testing RBAC

### Unit Testing Permissions

```typescript
import { hasPermission, hasProjectPermission } from '@/lib/middleware/rbac-middleware'
import { Role, ProjectMemberRole } from '@prisma/client'

describe('RBAC Permissions', () => {
  test('ORG_ADMIN can manage organization', () => {
    expect(hasPermission(Role.ORG_ADMIN, Permission.MANAGE_ORGANIZATION)).toBe(true)
  })
  
  test('USER cannot manage organization', () => {
    expect(hasPermission(Role.USER, Permission.MANAGE_ORGANIZATION)).toBe(false)
  })
  
  test('PROJECT_ADMIN can manage project', () => {
    expect(hasProjectPermission(ProjectMemberRole.ADMIN, Permission.MANAGE_PROJECT)).toBe(true)
  })
})
```

### Integration Testing Routes

```typescript
import { NextRequest } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'

describe('Protected Routes', () => {
  test('allows access with correct permissions', async () => {
    const mockRequest = new NextRequest('https://example.com/api/test')
    // Mock authentication and user data
    
    const response = await protectOrganizationRoute(
      mockRequest,
      async () => NextResponse.json({ success: true }),
      [Permission.VIEW_ORGANIZATION]
    )
    
    expect(response.status).toBe(200)
  })
})
```

## Best Practices

### 1. Principle of Least Privilege
- Grant users the minimum permissions necessary
- Regularly audit and review user permissions
- Use project-level roles for fine-grained control

### 2. Defense in Depth
- Implement permissions at both API and UI levels
- Always validate permissions server-side, even if UI restricts access
- Log all permission-related actions for auditing

### 3. Error Handling
```typescript
// Always handle permission errors gracefully
const { hasPermissions, error } = usePermissions([Permission.MANAGE_USERS])

if (error) {
  console.error('Permission check failed:', error)
  // Show user-friendly error message
  return <div>Unable to verify permissions. Please try again.</div>
}
```

### 4. Performance Considerations
- Cache permission checks when possible
- Use React.memo for permission-gated components
- Batch permission checks for multiple actions

### 5. Security Considerations
- Never trust client-side permission checks alone
- Implement rate limiting on permission-checking endpoints
- Log all access attempts for security monitoring
- Regularly rotate authentication tokens

## Troubleshooting

### Common Issues

1. **Permission denied despite correct role**
   - Check if user is properly associated with organization/project
   - Verify permission matrices are correctly defined
   - Ensure middleware is properly configured

2. **Client-side hooks not updating**
   - Check if user context is properly loaded
   - Verify API endpoints are accessible
   - Check browser network tab for failed requests

3. **Middleware not executing**
   - Verify middleware is imported correctly
   - Check route patterns match your API structure
   - Ensure tenant context is properly extracted

### Debug Logging

Enable debug logging to troubleshoot permission issues:

```typescript
// Add to your environment variables
DEBUG_RBAC=true

// In your middleware
if (process.env.DEBUG_RBAC) {
  console.log('Permission check:', {
    userId: context.userId,
    userRole: context.userRole,
    requiredPermissions,
    hasPermissions
  })
}
```

This comprehensive RBAC system provides secure, flexible, and maintainable access control for your multi-tenant application. Always test permission boundaries thoroughly and follow security best practices when implementing access controls.
