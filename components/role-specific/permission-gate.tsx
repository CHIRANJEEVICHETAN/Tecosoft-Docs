'use client'

import React from 'react'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { useUserPermissions } from '@/lib/hooks/use-user-role'
import { hasEffectivePermissions } from '@/lib/utils/permission-utils'
import { AlertCircleIcon, ShieldXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export interface PermissionGateProps {
  permissions: Permission[]
  projectId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  showError?: boolean
  errorMessage?: string
  requireAll?: boolean
}

/**
 * PermissionGate component for conditional rendering based on user permissions
 * 
 * @param permissions - Array of permissions required to render children
 * @param projectId - Optional project ID for project-specific permission checks
 * @param fallback - Component to render when user doesn't have permissions
 * @param children - Content to render when user has permissions
 * @param showError - Whether to show a default error message when access is denied
 * @param errorMessage - Custom error message to display
 * @param requireAll - Whether user needs ALL permissions (true) or ANY permission (false)
 */
export function PermissionGate({
  permissions,
  projectId,
  fallback = null,
  children,
  showError = false,
  errorMessage,
  requireAll = true
}: PermissionGateProps) {
  const { userRole, loading, error } = useUserPermissions(permissions, projectId)

  // Show loading state
  if (loading) {
    return <PermissionGateLoading />
  }

  // Show error state if there's an error fetching permissions
  if (error) {
    return (
      <PermissionGateError 
        error={error} 
        showError={showError}
        fallback={fallback}
      />
    )
  }

  // No user role data available
  if (!userRole) {
    return showError ? (
      <PermissionDeniedError message="User not authenticated" />
    ) : (
      <>{fallback}</>
    )
  }

  // Check permissions
  let hasPermissions = false
  
  if (requireAll) {
    // User needs ALL specified permissions
    hasPermissions = hasEffectivePermissions(
      {
        organizationRole: userRole.role,
        organizationPermissions: userRole.permissions,
        projectRoles: userRole.projectRoles,
        projectPermissions: userRole.projectPermissions
      },
      permissions,
      projectId
    )
  } else {
    // User needs ANY of the specified permissions
    hasPermissions = permissions.some(permission => {
      // Check organization-level permission
      if (userRole.permissions.includes(permission)) {
        return true
      }
      
      // Check project-level permission if projectId is provided
      if (projectId && userRole.projectPermissions[projectId]) {
        return userRole.projectPermissions[projectId].includes(permission)
      }
      
      return false
    })
  }

  // Render children if user has permissions
  if (hasPermissions) {
    return <>{children}</>
  }

  // Show error message or fallback
  if (showError) {
    return (
      <PermissionDeniedError 
        message={errorMessage || 'You do not have permission to access this content'}
        permissions={permissions}
        userRole={userRole.role}
        projectId={projectId}
      />
    )
  }

  return <>{fallback}</>
}

/**
 * Loading component for PermissionGate
 */
function PermissionGateLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded-md"></div>
    </div>
  )
}

/**
 * Error component for PermissionGate when there's an error fetching permissions
 */
function PermissionGateError({ 
  error, 
  showError, 
  fallback 
}: { 
  error: Error
  showError: boolean
  fallback: React.ReactNode 
}) {
  if (showError) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
        <AlertCircleIcon className="w-4 h-4" />
        <span>Error checking permissions: {error.message}</span>
      </div>
    )
  }
  
  return <>{fallback}</>
}

/**
 * Permission denied error component
 */
function PermissionDeniedError({ 
  message, 
  permissions, 
  userRole, 
  projectId 
}: {
  message: string
  permissions?: Permission[]
  userRole?: string
  projectId?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 p-6 text-center">
      <ShieldXIcon className="w-12 h-12 text-muted-foreground" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {message}
        </p>
        {process.env.NODE_ENV === 'development' && permissions && (
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Debug Info (Development Only)
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-left">
              <p><strong>Required Permissions:</strong> {permissions.join(', ')}</p>
              <p><strong>User Role:</strong> {userRole || 'Unknown'}</p>
              {projectId && <p><strong>Project ID:</strong> {projectId}</p>}
            </div>
          </details>
        )}
      </div>
      <Button variant="outline" asChild>
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  )
}

/**
 * Simple permission gate that only checks organization-level permissions
 */
export function SimplePermissionGate({
  permission,
  fallback = null,
  children
}: {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PermissionGate
      permissions={[permission]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Permission gate for project-specific permissions
 */
export function ProjectPermissionGate({
  projectId,
  permissions,
  fallback = null,
  children,
  showError = false
}: {
  projectId: string
  permissions: Permission[]
  fallback?: React.ReactNode
  children: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      permissions={permissions}
      projectId={projectId}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Permission gate that requires ANY of the specified permissions (OR logic)
 */
export function AnyPermissionGate({
  permissions,
  projectId,
  fallback = null,
  children
}: {
  permissions: Permission[]
  projectId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PermissionGate
      permissions={permissions}
      projectId={projectId}
      fallback={fallback}
      requireAll={false}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Permission gate for admin-only content
 */
export function AdminGate({
  fallback = null,
  children,
  showError = false
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      permissions={[Permission.MANAGE_ORGANIZATION]}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Permission gate for content that requires user management permissions
 */
export function UserManagementGate({
  fallback = null,
  children,
  showError = false
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      permissions={[Permission.MANAGE_USERS]}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Permission gate for project creation
 */
export function ProjectCreationGate({
  fallback = null,
  children,
  showError = false
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
  showError?: boolean
}) {
  return (
    <PermissionGate
      permissions={[Permission.CREATE_PROJECT]}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGate>
  )
}