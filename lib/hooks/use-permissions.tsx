"use client";

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Permission } from '../middleware/rbac-middleware'
import { Role, ProjectMemberRole } from '@prisma/client'

export type PermissionState = {
  hasPermissions: boolean
  userRole: Role | null
  projectRole?: ProjectMemberRole | null
  organizationId: string | null
  loading: boolean
  error: string | null
}

/**
 * Hook to check user permissions for organization-level actions
 */
export function usePermissions(requiredPermissions: Permission[]): PermissionState {
  const { user, isLoaded } = useUser()
  const [permissionState, setPermissionState] = useState<PermissionState>({
    hasPermissions: false,
    userRole: null,
    organizationId: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      setPermissionState({
        hasPermissions: false,
        userRole: null,
        organizationId: null,
        loading: false,
        error: 'User not authenticated'
      })
      return
    }

    const checkPermissions = async () => {
      try {
        const response = await fetch(`/api/permissions/check?userId=${user.id}&permissions=${requiredPermissions.join(',')}`)
        
        if (!response.ok) {
          throw new Error('Failed to check permissions')
        }

        const result = await response.json()
        setPermissionState({
          hasPermissions: result.hasPermissions,
          userRole: result.userRole,
          organizationId: result.organizationId,
          loading: false,
          error: null
        })
      } catch (error) {
        console.error('Permission check error:', error)
        setPermissionState({
          hasPermissions: false,
          userRole: null,
          organizationId: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    checkPermissions()
  }, [user, isLoaded, requiredPermissions])

  return permissionState
}

/**
 * Hook to check user permissions for project-level actions
 */
export function useProjectPermissions(
  projectId: string,
  requiredPermissions: Permission[]
): PermissionState {
  const { user, isLoaded } = useUser()
  const [permissionState, setPermissionState] = useState<PermissionState>({
    hasPermissions: false,
    userRole: null,
    projectRole: null,
    organizationId: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!isLoaded || !projectId) return

    if (!user) {
      setPermissionState({
        hasPermissions: false,
        userRole: null,
        projectRole: null,
        organizationId: null,
        loading: false,
        error: 'User not authenticated'
      })
      return
    }

    const checkPermissions = async () => {
      try {
        const response = await fetch(
          `/api/permissions/check?userId=${user.id}&projectId=${projectId}&permissions=${requiredPermissions.join(',')}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to check permissions')
        }

        const result = await response.json()
        setPermissionState({
          hasPermissions: result.hasPermissions,
          userRole: result.userRole,
          projectRole: result.projectRole,
          organizationId: result.organizationId,
          loading: false,
          error: null
        })
      } catch (error) {
        console.error('Project permission check error:', error)
        setPermissionState({
          hasPermissions: false,
          userRole: null,
          projectRole: null,
          organizationId: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    checkPermissions()
  }, [user, isLoaded, projectId, requiredPermissions])

  return permissionState
}

/**
 * Hook to get all user permissions for displaying role-based UI
 */
export function useUserRole() {
  const { user, isLoaded } = useUser()
  const [roleState, setRoleState] = useState<{
    userRole: Role | null
    organizationId: string | null
    loading: boolean
    error: string | null
  }>({
    userRole: null,
    organizationId: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      setRoleState({
        userRole: null,
        organizationId: null,
        loading: false,
        error: 'User not authenticated'
      })
      return
    }

    const fetchUserRole = async () => {
      try {
        const response = await fetch(`/api/user/role?userId=${user.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch user role')
        }

        const result = await response.json()
        setRoleState({
          userRole: result.userRole,
          organizationId: result.organizationId,
          loading: false,
          error: null
        })
      } catch (error) {
        console.error('User role fetch error:', error)
        setRoleState({
          userRole: null,
          organizationId: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    fetchUserRole()
  }, [user, isLoaded])

  return roleState
}

/**
 * Higher-order component for protecting UI elements based on permissions
 */
export function withPermissions<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  requiredPermissions: Permission[],
  fallbackComponent?: React.ComponentType | null
) {
  return function PermissionWrapper(props: T & { projectId?: string }) {
    const { projectId, ...componentProps } = props
    const permissionState = projectId 
      ? useProjectPermissions(projectId, requiredPermissions)
      : usePermissions(requiredPermissions)

    if (permissionState.loading) {
      return <div>Loading...</div>
    }

    if (permissionState.error) {
      return <div>Error: {permissionState.error}</div>
    }

    if (!permissionState.hasPermissions) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent
        return <FallbackComponent />
      }
      return null
    }

    return <WrappedComponent {...(componentProps as T)} />
  }
}

/**
 * Component for conditionally rendering content based on permissions
 */
export function PermissionGate({
  permissions,
  projectId,
  fallback,
  children
}: {
  permissions: Permission[]
  projectId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const permissionState = projectId 
    ? useProjectPermissions(projectId, permissions)
    : usePermissions(permissions)

  if (permissionState.loading) {
    return <div>Loading permissions...</div>
  }

  if (permissionState.error) {
    console.error('Permission error:', permissionState.error)
    return fallback || null
  }

  if (!permissionState.hasPermissions) {
    return fallback || null
  }

  return <>{children}</>
}

/**
 * Component for role-based conditional rendering
 */
export function RoleGate({
  allowedRoles,
  fallback,
  children
}: {
  allowedRoles: Role[]
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { userRole, loading, error } = useUserRole()

  if (loading) {
    return <div>Loading...</div>
  }

  if (error || !userRole) {
    return fallback || null
  }

  if (!allowedRoles.includes(userRole)) {
    return fallback || null
  }

  return <>{children}</>
}

/**
 * Hook for checking specific permission without component re-renders
 */
export function useHasPermission(permission: Permission, projectId?: string): boolean {
  const permissionState = projectId 
    ? useProjectPermissions(projectId, [permission])
    : usePermissions([permission])
  
  return permissionState.hasPermissions
}

/**
 * Hook for checking if user has any of the specified roles
 */
export function useHasRole(roles: Role[]): boolean {
  const { userRole } = useUserRole()
  return userRole ? roles.includes(userRole) : false
}

/**
 * Utility hook for common permission patterns
 */
export function useCommonPermissions() {
  const canManageOrg = useHasPermission(Permission.MANAGE_ORGANIZATION)
  const canViewOrg = useHasPermission(Permission.VIEW_ORGANIZATION)
  const canManageUsers = useHasPermission(Permission.MANAGE_USERS)
  const canCreateProject = useHasPermission(Permission.CREATE_PROJECT)
  const canViewAnalytics = useHasPermission(Permission.VIEW_ANALYTICS)
  
  const isSuperAdmin = useHasRole([Role.SUPER_ADMIN])
  const isOrgAdmin = useHasRole([Role.ORG_ADMIN])
  const isManager = useHasRole([Role.MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN])

  return {
    canManageOrg,
    canViewOrg,
    canManageUsers,
    canCreateProject,
    canViewAnalytics,
    isSuperAdmin,
    isOrgAdmin,
    isManager
  }
}
