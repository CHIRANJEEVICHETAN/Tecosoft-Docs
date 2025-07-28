# Role-Specific UI Components

This directory contains comprehensive role-based UI components that adapt functionality and display based on user roles, providing a tailored experience for each type of user.

## Overview

The role-specific components provide:
- **Dynamic layouts** that change based on user roles
- **Permission-based content rendering**
- **Role-aware navigation and sidebars**
- **Contextual dashboards** with role-appropriate widgets
- **Flexible access control** for different user types

## Core Components

### 1. RoleAwareLayout

The main layout wrapper that provides role-based sidebar and content structure.

```tsx
import { RoleAwareLayout } from '@/components/role-specific'

export default function DashboardPage() {
  return (
    <RoleAwareLayout variant="dashboard" showSidebar={true}>
      <div>Your dashboard content here</div>
    </RoleAwareLayout>
  )
}
```

**Props:**
- `variant: 'docs' | 'dashboard' | 'project'` - Layout type
- `showSidebar: boolean` - Whether to show the sidebar
- `projectId?: string` - Project ID for project-specific views

### 2. Sidebar Components

Role-specific sidebars that adapt navigation based on user permissions:

#### AdminSidebar
- Full administrative access
- System management tools
- User and role management
- Analytics and reporting

#### UserSidebar
- Content creation and editing
- Project collaboration
- Personal workspace
- Search and browse functionality

#### ViewerSidebar
- Read-only access
- Browse and search content
- Bookmarks and reading history
- Simple navigation

### 3. RoleAwareContent

Conditional content rendering based on roles and permissions:

```tsx
import { RoleAwareContent, AdminOnly, PermissionGuard } from '@/components/role-specific'

// General role-based content
<RoleAwareContent 
  roles={[Role.ADMIN, Role.MANAGER]}
  permissions={[Permission.EDIT_CONTENT]}
  fallback={<ReadOnlyView />}
>
  <EditableContent />
</RoleAwareContent>

// Admin-only content
<AdminOnly>
  <AdminSettings />
</AdminOnly>

// Permission-based content
<PermissionGuard permissions={[Permission.VIEW_ANALYTICS]}>
  <AnalyticsDashboard />
</PermissionGuard>
```

### 4. Specialized Components

#### EditableContent
Shows edit interface to users with edit permissions, fallback to read-only:

```tsx
<EditableContent readOnlyContent={<DocumentViewer />}>
  <DocumentEditor />
</EditableContent>
```

#### ProjectOwnerOnly
Restricts content to project owners:

```tsx
<ProjectOwnerOnly>
  <ProjectSettings />
</ProjectOwnerOnly>
```

#### RoleBasedWelcome
Dynamic welcome message based on user role:

```tsx
<RoleBasedWelcome />
```

### 5. RoleAwareDashboard

Complete dashboard that adapts widgets and metrics based on user role:

```tsx
import { RoleAwareDashboard } from '@/components/role-specific'

export default function Dashboard() {
  return <RoleAwareDashboard />
}
```

## Role Hierarchy

### Organization Roles
1. **SUPER_ADMIN** - Full system access
2. **ORG_ADMIN** - Organization management
3. **MANAGER** - Team and project management
4. **USER** - Content creation and collaboration
5. **VIEWER** - Read-only access

### Project Roles
1. **OWNER** - Full project control
2. **ADMIN** - Project management
3. **MEMBER** - Content contribution
4. **VIEWER** - Read-only project access

## Permission System

The components integrate with the RBAC (Role-Based Access Control) system:

```tsx
// Check multiple permissions
<PermissionGuard 
  permissions={[Permission.EDIT_CONTENT, Permission.DELETE_CONTENT]}
  requireAll={false} // User needs ANY of the permissions
>
  <ContentActions />
</PermissionGuard>

// Check both role and permissions
<RoleAwareContent
  roles={[Role.MANAGER]}
  permissions={[Permission.MANAGE_PROJECT]}
  requireAll={true} // User needs BOTH role AND permission
>
  <ProjectManagement />
</RoleAwareContent>
```

## Usage Examples

### Basic Dashboard Layout

```tsx
// app/dashboard/page.tsx
import { RoleAwareLayout, RoleAwareDashboard } from '@/components/role-specific'

export default function DashboardPage() {
  return (
    <RoleAwareLayout variant="dashboard">
      <RoleAwareDashboard />
    </RoleAwareLayout>
  )
}
```

### Project-Specific Page

```tsx
// app/projects/[id]/page.tsx
import { RoleAwareLayout, AdminOnly, EditableContent } from '@/components/role-specific'

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <RoleAwareLayout variant="project" projectId={params.id}>
      <div className="space-y-6">
        <AdminOnly>
          <ProjectSettings projectId={params.id} />
        </AdminOnly>
        
        <EditableContent readOnlyContent={<ProjectViewer />}>
          <ProjectEditor />
        </EditableContent>
      </div>
    </RoleAwareLayout>
  )
}
```

### Conditional Navigation

```tsx
import { useRoleContext, AdminOnly } from '@/components/role-specific'

function CustomNavigation() {
  const { userRole, projectRole } = useRoleContext()
  
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      
      <AdminOnly>
        <Link href="/admin">Admin Panel</Link>
      </AdminOnly>
      
      {userRole === Role.MANAGER && (
        <Link href="/projects/create">Create Project</Link>
      )}
    </nav>
  )
}
```

## Best Practices

1. **Always use RoleAwareLayout** as the top-level wrapper for authenticated pages
2. **Combine role & permission checks** for fine-grained access control
3. **Provide fallback content** for better user experience
4. **Use specialized components** (AdminOnly, EditableContent) for common patterns
5. **Test with different roles** to ensure proper access control

## Integration with Clerk

The components automatically integrate with Clerk authentication:

```tsx
// The components automatically detect:
// - User authentication state
// - User's organization role (from Clerk metadata)
// - Project-specific roles (from API calls)
// - Permission checks (via custom hooks)
```

## Styling and Theming

All components support:
- **Dark/light theme** automatic switching
- **Tailwind CSS** utility classes
- **Consistent design system** with shadcn/ui components
- **Responsive design** for mobile and desktop

## Error Handling

Components include built-in error states:
- Loading states during permission checks
- Access denied messages for unauthorized users
- Fallback content for missing roles
- Graceful degradation for API failures
