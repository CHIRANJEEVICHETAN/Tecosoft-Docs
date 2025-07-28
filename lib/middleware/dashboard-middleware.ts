import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { MultiTenantService } from '../multi-tenant'
import { Permission, getRolePermissions } from './rbac-middleware'

export interface DashboardContext {
  userId: string
  organizationId: string
  userRole: Role
  permissions: Permission[]
}

/**
 * Maps user roles to their primary dashboard paths
 */
export function getDashboardPathByRole(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '/admin/dashboard'
    case Role.ORG_ADMIN:
      return '/dashboard/organization'
    case Role.MANAGER:
      return '/dashboard/projects'
    case Role.USER:
      return '/dashboard/docs'
    case Role.VIEWER:
      return '/dashboard/browse'
    default:
      return '/dashboard/docs'
  }
}

/**
 * Get all dashboard paths a user can access based on their role
 */
export function getAccessibleDashboardPaths(role: Role): string[] {
  switch (role) {
    case Role.SUPER_ADMIN:
      return [
        '/admin/dashboard',
        '/dashboard/organization',
        '/dashboard/projects',
        '/dashboard/docs',
        '/dashboard/browse'
      ]
    case Role.ORG_ADMIN:
      return [
        '/dashboard/organization',
        '/dashboard/projects',
        '/dashboard/docs',
        '/dashboard/browse'
      ]
    case Role.MANAGER:
      return [
        '/dashboard/projects',
        '/dashboard/docs',
        '/dashboard/browse'
      ]
    case Role.USER:
      return [
        '/dashboard/docs',
        '/dashboard/browse'
      ]
    case Role.VIEWER:
      return ['/dashboard/browse']
    default:
      return ['/dashboard/docs']
  }
}

/**
 * Check if user can access a specific dashboard path
 */
export function canAccessDashboardPath(userRole: Role, requestedPath: string): boolean {
  const accessiblePaths = getAccessibleDashboardPaths(userRole)
  return accessiblePaths.some(path => requestedPath.startsWith(path))
}

/**
 * Validate dashboard access and extract context
 */
export async function validateDashboardAccess(request: NextRequest): Promise<{
  success: boolean
  context?: DashboardContext
  redirectUrl?: string
  error?: string
}> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return {
        success: false,
        redirectUrl: '/sign-in',
        error: 'User not authenticated'
      }
    }

    const user = await MultiTenantService.getUserByClerkId(userId)
    
    if (!user) {
      return {
        success: false,
        redirectUrl: '/sign-in',
        error: 'User not found'
      }
    }

    const userRole = user.role as Role
    const requestedPath = request.nextUrl.pathname

    // Handle generic /dashboard route
    if (requestedPath === '/dashboard') {
      return {
        success: false,
        redirectUrl: getDashboardPathByRole(userRole),
        error: 'Redirecting to role-appropriate dashboard'
      }
    }

    // Validate access to specific dashboard path
    if (!canAccessDashboardPath(userRole, requestedPath)) {
      return {
        success: false,
        redirectUrl: getDashboardPathByRole(userRole),
        error: `Access denied to ${requestedPath} for role ${userRole}`
      }
    }

    // Create dashboard context
    const context: DashboardContext = {
      userId: user.id,
      organizationId: user.organizationId,
      userRole,
      permissions: getRolePermissions(userRole)
    }

    return {
      success: true,
      context
    }
  } catch (error) {
    console.error('Dashboard access validation error:', error)
    return {
      success: false,
      redirectUrl: '/error',
      error: 'Internal server error during dashboard access validation'
    }
  }
}

/**
 * Middleware wrapper for dashboard route protection
 */
export async function withDashboardAccess(
  request: NextRequest,
  handler: (req: NextRequest, context: DashboardContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const validation = await validateDashboardAccess(request)
  
  if (!validation.success) {
    if (validation.redirectUrl) {
      return NextResponse.redirect(new URL(validation.redirectUrl, request.url))
    }
    
    return NextResponse.json(
      { error: validation.error || 'Dashboard access denied' },
      { status: 403 }
    )
  }

  return handler(request, validation.context!)
}

/**
 * Middleware for API routes that require dashboard context
 */
export async function withDashboardAPI(
  request: NextRequest,
  handler: (req: NextRequest, context: DashboardContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const validation = await validateDashboardAccess(request)
  
  if (!validation.success) {
    return NextResponse.json(
      { 
        success: false,
        error: validation.error || 'Dashboard access denied',
        code: 'DASHBOARD_ACCESS_DENIED'
      },
      { status: validation.redirectUrl?.includes('sign-in') ? 401 : 403 }
    )
  }

  return handler(request, validation.context!)
}

/**
 * Check if a dashboard path requires specific permissions
 */
export function getDashboardRequiredPermissions(dashboardPath: string): Permission[] {
  if (dashboardPath.startsWith('/admin/dashboard')) {
    return [Permission.MANAGE_ORGANIZATION, Permission.VIEW_ANALYTICS]
  }
  
  if (dashboardPath.startsWith('/dashboard/organization')) {
    return [Permission.MANAGE_ORGANIZATION, Permission.MANAGE_USERS]
  }
  
  if (dashboardPath.startsWith('/dashboard/projects')) {
    return [Permission.MANAGE_PROJECT, Permission.VIEW_PROJECT]
  }
  
  if (dashboardPath.startsWith('/dashboard/docs')) {
    return [Permission.VIEW_CONTENT, Permission.CREATE_CONTENT]
  }
  
  if (dashboardPath.startsWith('/dashboard/browse')) {
    return [Permission.VIEW_CONTENT]
  }
  
  return []
}

/**
 * Validate that user has required permissions for a dashboard path
 */
export function hasRequiredDashboardPermissions(
  userRole: Role,
  dashboardPath: string
): boolean {
  const requiredPermissions = getDashboardRequiredPermissions(dashboardPath)
  const userPermissions = getRolePermissions(userRole)
  
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  )
}

/**
 * Get dashboard navigation items based on user role
 */
export function getDashboardNavigation(userRole: Role): Array<{
  title: string
  href: string
  description: string
  icon?: string
}> {
  const baseNavigation = [
    {
      title: 'Documentation',
      href: '/dashboard/docs',
      description: 'View and edit documentation',
      icon: 'FileText'
    },
    {
      title: 'Browse',
      href: '/dashboard/browse',
      description: 'Browse available documentation',
      icon: 'Search'
    }
  ]

  if (userRole === Role.VIEWER) {
    return [
      {
        title: 'Browse',
        href: '/dashboard/browse',
        description: 'Browse available documentation',
        icon: 'Search'
      }
    ]
  }

  if (userRole === Role.USER) {
    return baseNavigation
  }

  if (userRole === Role.MANAGER) {
    return [
      {
        title: 'Projects',
        href: '/dashboard/projects',
        description: 'Manage your projects',
        icon: 'Folder'
      },
      ...baseNavigation
    ]
  }

  if (userRole === Role.ORG_ADMIN) {
    return [
      {
        title: 'Organization',
        href: '/dashboard/organization',
        description: 'Manage your organization',
        icon: 'Building'
      },
      {
        title: 'Projects',
        href: '/dashboard/projects',
        description: 'Manage projects',
        icon: 'Folder'
      },
      ...baseNavigation
    ]
  }

  if (userRole === Role.SUPER_ADMIN) {
    return [
      {
        title: 'Platform Admin',
        href: '/admin/dashboard',
        description: 'Platform administration',
        icon: 'Shield'
      },
      {
        title: 'Organization',
        href: '/dashboard/organization',
        description: 'Manage organizations',
        icon: 'Building'
      },
      {
        title: 'Projects',
        href: '/dashboard/projects',
        description: 'Manage projects',
        icon: 'Folder'
      },
      ...baseNavigation
    ]
  }

  return baseNavigation
}

/**
 * Error handler for dashboard access errors
 */
export function handleDashboardError(error: unknown, request: NextRequest): NextResponse {
  console.error('Dashboard middleware error:', error)
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown dashboard error'
  
  // For API routes, return JSON error
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Dashboard access error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        code: 'DASHBOARD_ERROR'
      },
      { status: 500 }
    )
  }
  
  // For page routes, redirect to error page
  return NextResponse.redirect(new URL('/error', request.url))
}

/**
 * Utility to check if current request is for a dashboard route
 */
export function isDashboardRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin/dashboard')
}

/**
 * Get dashboard breadcrumbs based on current path
 */
export function getDashboardBreadcrumbs(pathname: string, userRole: Role): Array<{
  title: string
  href: string
  current?: boolean
}> {
  const breadcrumbs: Array<{ title: string; href: string; current?: boolean }> = [
    { title: 'Dashboard', href: getDashboardPathByRole(userRole) }
  ]

  if (pathname.startsWith('/admin/dashboard')) {
    breadcrumbs.push({ title: 'Platform Admin', href: '/admin/dashboard', current: true })
  } else if (pathname.startsWith('/dashboard/organization')) {
    breadcrumbs.push({ title: 'Organization', href: '/dashboard/organization', current: true })
  } else if (pathname.startsWith('/dashboard/projects')) {
    breadcrumbs.push({ title: 'Projects', href: '/dashboard/projects', current: true })
  } else if (pathname.startsWith('/dashboard/docs')) {
    breadcrumbs.push({ title: 'Documentation', href: '/dashboard/docs', current: true })
  } else if (pathname.startsWith('/dashboard/browse')) {
    breadcrumbs.push({ title: 'Browse', href: '/dashboard/browse', current: true })
  }

  return breadcrumbs
}