'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Role, ProjectMemberRole } from '@prisma/client'
import { Permission } from '@/lib/middleware/rbac-middleware'

export interface UserRole {
  role: Role
  organizationId: string
  organizationSlug: string
  permissions: Permission[]
  projectRoles: Record<string, ProjectMemberRole>
  projectPermissions: Record<string, Permission[]>
}

interface UseUserRoleReturn {
  userRole: UserRole | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Cache for user role data to avoid repeated API calls
const roleCache = new Map<string, {
  data: UserRole
  timestamp: number
  expiry: number
}>()

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_WHILE_REVALIDATE = 10 * 60 * 1000 // 10 minutes

/**
 * Custom hook to fetch user role and permissions from database
 * Includes loading and error states with intelligent caching
 */
export function useUserRole(): UseUserRoleReturn {
  const { user, isLoaded } = useUser()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUserRole = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      console.log('useUserRole: No user ID, skipping fetch')
      setUserRole(null)
      setLoading(false)
      return
    }

    console.log('useUserRole: Fetching role for user:', user.id)

    const cacheKey = user.id
    const now = Date.now()
    const cached = roleCache.get(cacheKey)

    const shouldForceRefresh = forceRefresh

    // Return cached data if it's still fresh and not forcing refresh
    if (!shouldForceRefresh && cached && now < cached.expiry) {
      console.log('useUserRole: Using cached data')
      setUserRole(cached.data)
      setLoading(false)
      setError(null)
      return
    }

    // If we have stale data, return it immediately but fetch fresh data in background
    if (!shouldForceRefresh && cached && now < cached.timestamp + STALE_WHILE_REVALIDATE) {
      console.log('useUserRole: Using stale cached data, fetching fresh in background')
      setUserRole(cached.data)
      setLoading(false)
      setError(null)
      // Continue to fetch fresh data in background
    } else {
      console.log('useUserRole: Setting loading state')
      setLoading(true)
    }

    try {
      setError(null)

      console.log('useUserRole: Fetching user role from API...')
      
      const response = await fetch('/api/user/role', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('useUserRole: API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.log('useUserRole: API error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('useUserRole: API response data:', data)
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user role')
      }

      const roleData: UserRole = data.data

      // Cache the fresh data
      roleCache.set(cacheKey, {
        data: roleData,
        timestamp: now,
        expiry: now + CACHE_DURATION
      })

      setUserRole(roleData)
    } catch (err) {
      console.error('Error fetching user role:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user role'
      
      // If it's a 404 error, it might be a sync issue
      if (errorMessage.includes('404') || errorMessage.includes('User not found')) {
        setError(new Error('User not found in database. Please try syncing your account using the debug page.'))
      } else {
        setError(new Error(errorMessage))
      }
      
      // If we have cached data and this is a background refresh, keep the cached data
      if (cached && !forceRefresh) {
        setUserRole(cached.data)
      } else {
        setUserRole(null)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const refetch = useCallback(async () => {
    await fetchUserRole(true)
  }, [fetchUserRole])

  useEffect(() => {
    if (!isLoaded) return

    fetchUserRole()
  }, [isLoaded, fetchUserRole])

  // Clear cache when user changes
  useEffect(() => {
    if (user?.id) {
      const cacheKey = user.id
      // Don't clear immediately, but mark for cleanup
      const cleanup = setTimeout(() => {
        const otherKeys = Array.from(roleCache.keys()).filter(key => key !== cacheKey)
        otherKeys.forEach(key => roleCache.delete(key))
      }, 1000)

      return () => clearTimeout(cleanup)
    }
  }, [user?.id])

  return {
    userRole,
    loading,
    error,
    refetch
  }
}

/**
 * Hook to check if user has specific permissions
 */
export function useUserPermissions(requiredPermissions: Permission[], projectId?: string) {
  const { userRole, loading, error } = useUserRole()
  const [hasPermissions, setHasPermissions] = useState(false)

  useEffect(() => {
    if (!userRole || loading) {
      setHasPermissions(false)
      return
    }

    // Check organization-level permissions
    const hasOrgPermissions = requiredPermissions.every(permission =>
      userRole.permissions.includes(permission)
    )

    // If checking project-specific permissions
    if (projectId && userRole.projectPermissions[projectId]) {
      const hasProjectPermissions = requiredPermissions.every(permission =>
        userRole.projectPermissions[projectId].includes(permission)
      )
      
      // User needs either org-level OR project-level permissions
      setHasPermissions(hasOrgPermissions || hasProjectPermissions)
    } else {
      setHasPermissions(hasOrgPermissions)
    }
  }, [userRole, loading, requiredPermissions, projectId])

  return {
    hasPermissions,
    loading,
    error,
    userRole
  }
}

/**
 * Hook to check if user has a specific role
 */
export function useUserRoleCheck() {
  const { userRole, loading, error } = useUserRole()

  const hasRole = useCallback((role: Role) => {
    return userRole?.role === role
  }, [userRole])

  const hasAnyRole = useCallback((roles: Role[]) => {
    return userRole ? roles.includes(userRole.role) : false
  }, [userRole])

  const hasProjectRole = useCallback((projectId: string, role: ProjectMemberRole) => {
    return userRole?.projectRoles[projectId] === role
  }, [userRole])

  const hasAnyProjectRole = useCallback((projectId: string, roles: ProjectMemberRole[]) => {
    const userProjectRole = userRole?.projectRoles[projectId]
    return userProjectRole ? roles.includes(userProjectRole) : false
  }, [userRole])

  // Common role checks
  const isSuperAdmin = hasRole(Role.SUPER_ADMIN)
  const isOrgAdmin = hasRole(Role.ORG_ADMIN)
  const isManager = hasRole(Role.MANAGER)
  const isUser = hasRole(Role.USER)
  const isViewer = hasRole(Role.VIEWER)

  // Admin-level roles (can manage organization)
  const isAdmin = hasAnyRole([Role.SUPER_ADMIN, Role.ORG_ADMIN])
  
  // Management-level roles (can manage projects)
  const canManageProjects = hasAnyRole([Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER])
  
  // Content creation roles
  const canCreateContent = hasAnyRole([Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER, Role.USER])

  return {
    userRole,
    loading,
    error,
    hasRole,
    hasAnyRole,
    hasProjectRole,
    hasAnyProjectRole,
    // Convenience flags
    isSuperAdmin,
    isOrgAdmin,
    isManager,
    isUser,
    isViewer,
    isAdmin,
    canManageProjects,
    canCreateContent
  }
}

/**
 * Hook for common permission checks
 */
export function useCommonPermissions() {
  const { userRole, loading, error } = useUserRole()

  const canManageOrg = userRole?.permissions.includes(Permission.MANAGE_ORGANIZATION) ?? false
  const canManageUsers = userRole?.permissions.includes(Permission.MANAGE_USERS) ?? false
  const canCreateProject = userRole?.permissions.includes(Permission.CREATE_PROJECT) ?? false
  const canViewAnalytics = userRole?.permissions.includes(Permission.VIEW_ANALYTICS) ?? false
  const canExportData = userRole?.permissions.includes(Permission.EXPORT_DATA) ?? false

  return {
    userRole,
    loading,
    error,
    canManageOrg,
    canManageUsers,
    canCreateProject,
    canViewAnalytics,
    canExportData
  }
}

/**
 * Clear the role cache (useful for testing or when user data changes)
 */
export function clearUserRoleCache(userId?: string) {
  if (userId) {
    roleCache.delete(userId)
  } else {
    roleCache.clear()
  }
}