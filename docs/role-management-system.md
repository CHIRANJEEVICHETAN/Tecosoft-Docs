# User Role Management System

This documentation covers the comprehensive user role management system that integrates seamlessly with Clerk's user management capabilities.

## Overview

The role management system provides hierarchical access control at both organization and project levels, with the following key features:

- **Organization-level roles**: SUPER_ADMIN, ORG_ADMIN, MANAGER, USER, VIEWER
- **Project-level roles**: OWNER, ADMIN, MEMBER, VIEWER
- **Permission-based access control**: Fine-grained permissions for different actions
- **Clerk integration**: Seamless synchronization with Clerk user metadata
- **Audit logging**: Track all role changes for security and compliance
- **React components**: Ready-to-use UI components for role management

## Architecture

### Core Components

1. **Database Schema** (`prisma/schema.prisma`)
   - User model with organization-level roles
   - ProjectMember model for project-level roles
   - Multi-tenant organization structure

2. **Role-Based Access Control** (`lib/middleware/rbac-middleware.ts`)
   - Permission definitions and role matrices
   - Middleware for API route protection
   - Permission validation utilities

3. **Services**
   - `UserRoleService`: Organization-level role management
   - `ProjectRoleService`: Project-level role management
   - `RoleManagementService`: Comprehensive role management with Clerk integration

4. **API Routes**
   - `/api/users/roles`: Organization user role management
   - `/api/projects/[projectId]/members/roles`: Project member role management

5. **React Components**
   - `UserRolesManager`: Organization user role management UI
   - `ProjectRolesManager`: Project member role management UI

## Role Hierarchy

### Organization Roles

```
SUPER_ADMIN (Platform Administrator)
├── Full system access
├── Can manage any organization
└── Can assign any role

ORG_ADMIN (Organization Administrator)
├── Full organization access
├── Can manage organization settings
├── Can manage users (except SUPER_ADMIN and other ORG_ADMIN)
└── Can manage all projects in organization

MANAGER (Project Manager)
├── Can create and manage projects
├── Can view organization users
└── Limited administrative access

USER (Regular User)
├── Can participate in projects
├── Can create content
└── Basic organization access

VIEWER (Read-only Access)
├── Can view organization content
├── Cannot create or modify content
└── Minimal permissions
```

### Project Roles

```
OWNER (Project Owner)
├── Full project control
├── Can manage project settings
├── Can manage all project members
└── Can delete project

ADMIN (Project Administrator)
├── Can manage project content
├── Can manage project members (except OWNER)
└── Administrative project access

MEMBER (Project Member)
├── Can create and edit content
├── Can view project members
└── Standard project participation

VIEWER (Project Viewer)
├── Can view project content
├── Cannot modify content
└── Read-only project access
```

## Permission System

### Organization Permissions

- `MANAGE_ORGANIZATION`: Modify organization settings
- `VIEW_ORGANIZATION`: View organization details
- `MANAGE_USERS`: Add, remove, and modify user roles
- `VIEW_USERS`: View organization users
- `CREATE_PROJECT`: Create new projects
- `VIEW_ANALYTICS`: Access organization analytics
- `EXPORT_DATA`: Export organization data

### Project Permissions

- `MANAGE_PROJECT`: Modify project settings
- `VIEW_PROJECT`: View project details
- `DELETE_PROJECT`: Delete the project
- `CREATE_CONTENT`: Create new content
- `EDIT_CONTENT`: Modify existing content
- `DELETE_CONTENT`: Remove content
- `VIEW_CONTENT`: View project content
- `PUBLISH_CONTENT`: Publish content
- `MANAGE_PROJECT_MEMBERS`: Add, remove, and modify member roles
- `VIEW_PROJECT_MEMBERS`: View project members

## Usage Examples

### API Usage

#### Update User Organization Role

```typescript
const response = await fetch('/api/users/roles', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    role: 'MANAGER'
  })
})
```

#### Add Project Member

```typescript
const response = await fetch(`/api/projects/${projectId}/members/roles`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    role: 'MEMBER'
  })
})
```

### Service Usage

#### Using RoleManagementService

```typescript
import { RoleManagementService } from '@/lib/services/role-management-service'

// Update user role with Clerk sync
const { user, event } = await RoleManagementService.updateUserRoleWithSync(
  userId,
  Role.MANAGER,
  currentUserId,
  organizationId
)

// Get user's effective permissions
const permissions = await RoleManagementService.getUserEffectivePermissions(clerkId)

// Bulk role assignment
const result = await RoleManagementService.bulkAssignRoles(
  [
    { userId: 'user1', role: Role.USER },
    { userId: 'user2', role: Role.MANAGER }
  ],
  organizationId,
  currentUserId
)
```

### React Component Usage

#### Organization User Role Management

```tsx
import UserRolesManager from '@/components/role-management/user-roles-manager'

function OrganizationSettings() {
  return (
    <div>
      <h1>Organization Settings</h1>
      <UserRolesManager organizationId="org-id" />
    </div>
  )
}
```

#### Project Member Role Management

```tsx
import ProjectRolesManager from '@/components/role-management/project-roles-manager'

function ProjectSettings() {
  return (
    <div>
      <h1>Project Settings</h1>
      <ProjectRolesManager projectId="project-id" />
    </div>
  )
}
```

### Permission-based UI Rendering

```tsx
import { PermissionGate, RoleGate } from '@/lib/hooks/use-permissions'

function AdminPanel() {
  return (
    <div>
      <PermissionGate permissions={[Permission.MANAGE_USERS]}>
        <button>Manage Users</button>
      </PermissionGate>
      
      <RoleGate allowedRoles={[Role.ORG_ADMIN, Role.SUPER_ADMIN]}>
        <button>Organization Settings</button>
      </RoleGate>
    </div>
  )
}
```

## Clerk Integration

### User Metadata Synchronization

When roles are updated, the system automatically synchronizes with Clerk:

```typescript
// Clerk user metadata structure
{
  publicMetadata: {
    role: 'MANAGER',
    organizationId: 'org-id',
    lastRoleUpdate: '2024-01-01T00:00:00.000Z'
  }
}
```

### Webhook Integration

To keep roles synchronized, set up Clerk webhooks for user events:

```typescript
// Example webhook handler
export async function POST(request: Request) {
  const { type, data } = await request.json()
  
  switch (type) {
    case 'user.created':
      await RoleManagementService.createUserWithRole({
        clerkId: data.id,
        email: data.email_addresses[0].email_address,
        role: Role.USER,
        organizationId: getOrganizationFromRequest(request)
      })
      break
      
    case 'user.updated':
      // Handle user updates
      break
  }
}
```

## Security Considerations

### Role Hierarchy Enforcement

- Users cannot elevate their own privileges
- Role changes are validated against the hierarchy
- Audit logs track all role modifications

### Permission Validation

- All API routes are protected with middleware
- Permissions are checked at both route and service levels
- UI components respect permission boundaries

### Best Practices

1. **Principle of Least Privilege**: Assign minimal necessary permissions
2. **Regular Audits**: Review role assignments periodically
3. **Separation of Duties**: Distribute administrative responsibilities
4. **Monitoring**: Track role changes and access patterns

## Testing

### Unit Tests

```typescript
describe('RoleManagementService', () => {
  test('should update user role with proper permissions', async () => {
    const result = await RoleManagementService.updateUserRoleWithSync(
      userId,
      Role.MANAGER,
      adminUserId,
      organizationId
    )
    
    expect(result.user.role).toBe(Role.MANAGER)
    expect(result.event.newRole).toBe(Role.MANAGER)
  })
})
```

### Integration Tests

```typescript
describe('Role API Routes', () => {
  test('PUT /api/users/roles should update user role', async () => {
    const response = await fetch('/api/users/roles', {
      method: 'PUT',
      body: JSON.stringify({ userId, role: 'MANAGER' })
    })
    
    expect(response.status).toBe(200)
  })
})
```

## Migration and Deployment

### Database Migration

```sql
-- Add audit log table for role changes
CREATE TABLE role_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  old_role TEXT,
  new_role TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

### Environment Variables

```env
# Clerk configuration
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Database
DATABASE_URL=your_database_url
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user role assignments
   - Verify permission matrices
   - Review API route protection

2. **Clerk Sync Issues**
   - Validate Clerk API credentials
   - Check network connectivity
   - Review error logs

3. **UI Component Errors**
   - Ensure proper permission hooks usage
   - Check component prop types
   - Verify API endpoint availability

### Debug Mode

Enable debug logging:

```typescript
// In your service methods
if (process.env.NODE_ENV === 'development') {
  console.log('Role change event:', event)
}
```

## Contributing

When contributing to the role management system:

1. Follow the established role hierarchy
2. Maintain backward compatibility
3. Add appropriate tests
4. Update documentation
5. Consider security implications

## License

This role management system is part of the Tecosoft-Docs project and follows the same licensing terms.
