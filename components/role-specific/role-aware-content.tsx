'use client'

import { ReactNode } from 'react'
import { Role, ProjectMemberRole } from '@prisma/client'
import { usePermissions, useProjectPermissions, useRole } from '@/lib/hooks/use-permissions'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { useRoleContext } from './role-aware-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock } from 'lucide-react'

interface RoleAwareContentProps {
  children: ReactNode
  roles?: Role[]
  projectRoles?: ProjectMemberRole[]
  permissions?: Permission[]
  fallback?: ReactNode
  showAccessDenied?: boolean
  requireAll?: boolean // If true, user must have ALL specified roles/permissions
}

export function RoleAwareContent({
  children,
  roles = [],
  projectRoles = [],
  permissions = [],
  fallback = null,
  showAccessDenied = true,
  requireAll = false
}: RoleAwareContentProps) {
  const { userRole, projectRole, projectId } = useRoleContext()
  
  // Check organization-level permissions
  const { hasPermissions: hasOrgPermissions, loading: orgLoading } = usePermissions(permissions)
  
  // Check project-level permissions if projectId is available
  const { hasPermissions: hasProjectPermissions, loading: projectLoading } = useProjectPermissions(
    projectId || '', 
    permissions
  )

  // Loading state
  if (permissions.length > 0 && (orgLoading || (projectId && projectLoading))) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check role-based access
  const hasRoleAccess = () => {
    if (roles.length === 0 && projectRoles.length === 0) return true

    const hasOrgRole = roles.length === 0 || roles.includes(userRole)
    const hasProjectRole = projectRoles.length === 0 || (projectRole && projectRoles.includes(projectRole))

    if (requireAll) {
      return hasOrgRole && hasProjectRole
    } else {
      return hasOrgRole || hasProjectRole
    }
  }

  // Check permission-based access
  const hasPermissionAccess = () => {
    if (permissions.length === 0) return true

    // Super admin always has access
    if (userRole === Role.SUPER_ADMIN) return true

    // Check if user has either org-level OR project-level permissions
    if (projectId) {
      return hasOrgPermissions || hasProjectPermissions
    } else {
      return hasOrgPermissions
    }
  }

  // Determine access
  const hasAccess = hasRoleAccess() && hasPermissionAccess()

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showAccessDenied) {
      return (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            You don't have permission to view this content. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return <>{children}</>
}

// Specialized components for common use cases
interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
  showAccessDenied?: boolean
}

export function AdminOnly({ children, fallback, showAccessDenied = true }: AdminOnlyProps) {
  return (
    <RoleAwareContent
      roles={[Role.SUPER_ADMIN, Role.ORG_ADMIN]}
      projectRoles={[ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN]}
      fallback={fallback}
      showAccessDenied={showAccessDenied}
    >
      {children}
    </RoleAwareContent>
  )
}

interface PermissionGuardProps {
  children: ReactNode
  permissions: Permission[]
  fallback?: ReactNode
  showAccessDenied?: boolean
  requireAll?: boolean
}

export function PermissionGuard({ 
  children, 
  permissions, 
  fallback, 
  showAccessDenied = true,
  requireAll = false 
}: PermissionGuardProps) {
  return (
    <RoleAwareContent
      permissions={permissions}
      fallback={fallback}
      showAccessDenied={showAccessDenied}
      requireAll={requireAll}
    >
      {children}
    </RoleAwareContent>
  )
}

interface ProjectOwnerOnlyProps {
  children: ReactNode
  fallback?: ReactNode
  showAccessDenied?: boolean
}

export function ProjectOwnerOnly({ children, fallback, showAccessDenied = true }: ProjectOwnerOnlyProps) {
  return (
    <RoleAwareContent
      projectRoles={[ProjectMemberRole.OWNER]}
      fallback={fallback}
      showAccessDenied={showAccessDenied}
    >
      {children}
    </RoleAwareContent>
  )
}

interface EditableContentProps {
  children: ReactNode
  readOnlyContent?: ReactNode
  showAccessDenied?: boolean
}

export function EditableContent({ children, readOnlyContent, showAccessDenied = false }: EditableContentProps) {
  return (
    <RoleAwareContent
      permissions={[Permission.EDIT_CONTENT, Permission.CREATE_CONTENT]}
      fallback={readOnlyContent}
      showAccessDenied={showAccessDenied}
    >
      {children}
    </RoleAwareContent>
  )
}

interface ViewerOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ViewerOnly({ children, fallback }: ViewerOnlyProps) {
  return (
    <RoleAwareContent
      roles={[Role.VIEWER]}
      projectRoles={[ProjectMemberRole.VIEWER]}
      fallback={fallback}
      showAccessDenied={false}
    >
      {children}
    </RoleAwareContent>
  )
}

// Component to show role-specific welcome messages
export function RoleBasedWelcome() {
  const { userRole, projectRole } = useRoleContext()

  const getWelcomeMessage = () => {
    if (projectRole) {
      switch (projectRole) {
        case ProjectMemberRole.OWNER:
          return {
            title: "Welcome, Project Owner",
            message: "You have full control over this project. Manage members, content, and settings.",
            color: "text-red-600 dark:text-red-400"
          }
        case ProjectMemberRole.ADMIN:
          return {
            title: "Welcome, Project Admin",
            message: "You can manage project content and members. Let's build something great!",
            color: "text-purple-600 dark:text-purple-400"
          }
        case ProjectMemberRole.MEMBER:
          return {
            title: "Welcome, Team Member",
            message: "You can create and edit content in this project. Start contributing!",
            color: "text-blue-600 dark:text-blue-400"
          }
        case ProjectMemberRole.VIEWER:
          return {
            title: "Welcome, Viewer",
            message: "Browse and read the project documentation. Enjoy exploring!",
            color: "text-gray-600 dark:text-gray-400"
          }
      }
    }

    switch (userRole) {
      case Role.SUPER_ADMIN:
        return {
          title: "Welcome, Super Admin",
          message: "You have system-wide access. Manage organizations, users, and platform settings.",
          color: "text-red-600 dark:text-red-400"
        }
      case Role.ORG_ADMIN:
        return {
          title: "Welcome, Administrator",
          message: "Manage your organization's users, projects, and settings.",
          color: "text-purple-600 dark:text-purple-400"
        }
      case Role.MANAGER:
        return {
          title: "Welcome, Manager",
          message: "Create projects, manage content, and collaborate with your team.",
          color: "text-blue-600 dark:text-blue-400"
        }
      case Role.USER:
        return {
          title: "Welcome, User",
          message: "Create content, collaborate on projects, and contribute to documentation.",
          color: "text-green-600 dark:text-green-400"
        }
      case Role.VIEWER:
        return {
          title: "Welcome, Viewer",
          message: "Browse and read documentation. Discover what you need to know.",
          color: "text-gray-600 dark:text-gray-400"
        }
      default:
        return {
          title: "Welcome",
          message: "Explore the documentation platform.",
          color: "text-gray-600 dark:text-gray-400"
        }
    }
  }

  const { title, message, color } = getWelcomeMessage()

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-3">
        <Shield className={`h-6 w-6 ${color}`} />
        <div>
          <h2 className={`text-lg font-semibold ${color}`}>{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}
