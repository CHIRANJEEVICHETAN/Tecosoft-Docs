// Role-Based Access Control (RBAC) Middleware and Types

export enum Permission {
  // Organization Management
  MANAGE_ORGANIZATION = 'MANAGE_ORGANIZATION',
  VIEW_ORGANIZATION = 'VIEW_ORGANIZATION',
  
  // User Management
  MANAGE_USERS = 'MANAGE_USERS',
  INVITE_USERS = 'INVITE_USERS',
  VIEW_USERS = 'VIEW_USERS',
  
  // Project Management
  CREATE_PROJECT = 'CREATE_PROJECT',
  MANAGE_PROJECT = 'MANAGE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  VIEW_PROJECT = 'VIEW_PROJECT',
  
  // Document Management
  CREATE_DOCUMENT = 'CREATE_DOCUMENT',
  EDIT_DOCUMENT = 'EDIT_DOCUMENT',
  DELETE_DOCUMENT = 'DELETE_DOCUMENT',
  VIEW_DOCUMENT = 'VIEW_DOCUMENT',
  PUBLISH_DOCUMENT = 'PUBLISH_DOCUMENT',
  
  // Analytics and Reporting
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_DATA = 'EXPORT_DATA',
  
  // AI Features
  USE_AI_FEATURES = 'USE_AI_FEATURES',
  MANAGE_AI_SETTINGS = 'MANAGE_AI_SETTINGS',
  
  // System Administration (Super Admin only)
  MANAGE_SYSTEM = 'MANAGE_SYSTEM',
  VIEW_SYSTEM_LOGS = 'VIEW_SYSTEM_LOGS',
  MANAGE_BILLING = 'MANAGE_BILLING',
}

export interface PermissionContext {
  userId: string
  organizationId: string
  projectId?: string
  resourceId?: string
}

export interface RolePermissions {
  organizationPermissions: Permission[]
  projectPermissions: Record<string, Permission[]>
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userPermissions: RolePermissions,
  permission: Permission,
  context?: { projectId?: string }
): boolean {
  // Check organization-level permission first
  if (userPermissions.organizationPermissions.includes(permission)) {
    return true
  }
  
  // Check project-level permission if context provided
  if (context?.projectId && userPermissions.projectPermissions[context.projectId]) {
    return userPermissions.projectPermissions[context.projectId].includes(permission)
  }
  
  return false
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: RolePermissions,
  permissions: Permission[],
  context?: { projectId?: string }
): boolean {
  return permissions.some(permission => 
    hasPermission(userPermissions, permission, context)
  )
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: RolePermissions,
  permissions: Permission[],
  context?: { projectId?: string }
): boolean {
  return permissions.every(permission => 
    hasPermission(userPermissions, permission, context)
  )
}

/**
 * Filter permissions based on user's role and context
 */
export function filterPermissions(
  userPermissions: RolePermissions,
  availablePermissions: Permission[],
  context?: { projectId?: string }
): Permission[] {
  return availablePermissions.filter(permission =>
    hasPermission(userPermissions, permission, context)
  )
}

/**
 * Get effective permissions for a user in a specific context
 */
export function getEffectivePermissions(
  userPermissions: RolePermissions,
  context?: { projectId?: string }
): Permission[] {
  const orgPermissions = userPermissions.organizationPermissions
  
  if (context?.projectId && userPermissions.projectPermissions[context.projectId]) {
    const projectPermissions = userPermissions.projectPermissions[context.projectId]
    // Combine and deduplicate permissions
    return Array.from(new Set([...orgPermissions, ...projectPermissions]))
  }
  
  return orgPermissions
}

// Import Role and ProjectMemberRole for the helper functions
import { Role, ProjectMemberRole } from '@prisma/client'

/**
 * Get permissions for a specific organization role
 */
export function getRolePermissions(role: Role): Permission[] {
  const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.SUPER_ADMIN]: Object.values(Permission),
    [Role.ORG_ADMIN]: [
      Permission.MANAGE_ORGANIZATION,
      Permission.VIEW_ORGANIZATION,
      Permission.MANAGE_USERS,
      Permission.INVITE_USERS,
      Permission.VIEW_USERS,
      Permission.CREATE_PROJECT,
      Permission.MANAGE_PROJECT,
      Permission.VIEW_PROJECT,
      Permission.CREATE_DOCUMENT,
      Permission.EDIT_DOCUMENT,
      Permission.DELETE_DOCUMENT,
      Permission.VIEW_DOCUMENT,
      Permission.PUBLISH_DOCUMENT,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_DATA,
      Permission.USE_AI_FEATURES,
      Permission.MANAGE_AI_SETTINGS,
    ],
    [Role.MANAGER]: [
      Permission.VIEW_ORGANIZATION,
      Permission.VIEW_USERS,
      Permission.CREATE_PROJECT,
      Permission.MANAGE_PROJECT,
      Permission.VIEW_PROJECT,
      Permission.CREATE_DOCUMENT,
      Permission.EDIT_DOCUMENT,
      Permission.DELETE_DOCUMENT,
      Permission.VIEW_DOCUMENT,
      Permission.PUBLISH_DOCUMENT,
      Permission.VIEW_ANALYTICS,
    ],
    [Role.USER]: [
      Permission.VIEW_ORGANIZATION,
      Permission.VIEW_PROJECT,
      Permission.CREATE_DOCUMENT,
      Permission.EDIT_DOCUMENT,
      Permission.VIEW_DOCUMENT,
    ],
    [Role.VIEWER]: [
      Permission.VIEW_ORGANIZATION,
      Permission.VIEW_PROJECT,
      Permission.VIEW_DOCUMENT,
    ],
  }

  return ROLE_PERMISSIONS[role] || []
}

/**
 * Get permissions for a specific project role
 */
export function getProjectRolePermissions(role: ProjectMemberRole): Permission[] {
  const PROJECT_ROLE_PERMISSIONS: Record<ProjectMemberRole, Permission[]> = {
    [ProjectMemberRole.OWNER]: [
      Permission.MANAGE_PROJECT,
      Permission.DELETE_PROJECT,
      Permission.VIEW_PROJECT,
      Permission.CREATE_DOCUMENT,
      Permission.EDIT_DOCUMENT,
      Permission.DELETE_DOCUMENT,
      Permission.VIEW_DOCUMENT,
      Permission.PUBLISH_DOCUMENT,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_DATA,
    ],
    [ProjectMemberRole.ADMIN]: [
      Permission.MANAGE_PROJECT,
      Permission.VIEW_PROJECT,
      Permission.CREATE_DOCUMENT,
      Permission.EDIT_DOCUMENT,
      Permission.DELETE_DOCUMENT,
      Permission.VIEW_DOCUMENT,
      Permission.PUBLISH_DOCUMENT,
      Permission.VIEW_ANALYTICS,
    ],
    [ProjectMemberRole.MEMBER]: [
      Permission.VIEW_PROJECT,
      Permission.CREATE_DOCUMENT,
      Permission.EDIT_DOCUMENT,
      Permission.VIEW_DOCUMENT,
    ],
    [ProjectMemberRole.VIEWER]: [
      Permission.VIEW_PROJECT,
      Permission.VIEW_DOCUMENT,
    ],
  }

  return PROJECT_ROLE_PERMISSIONS[role] || []
}

/**
 * Check if a user has a specific permission in a project context
 */
export function hasProjectPermission(
  userPermissions: RolePermissions,
  permission: Permission,
  projectId: string
): boolean {
  return hasPermission(userPermissions, permission, { projectId })
}

/**
 * RBAC middleware wrapper for organization-level routes
 */
export async function withRBAC(
  request: NextRequest,
  context: any,
  requiredPermissions: Permission[],
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>,
  options?: { checkProjectRole?: boolean }
): Promise<NextResponse> {
  try {
    // This is a simplified version - in a real implementation,
    // you would get the user's actual permissions from the database
    // For now, we'll assume the handler can proceed
    return handler(request, context)
  } catch (error) {
    console.error('RBAC middleware error:', error)
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
  }
}

/**
 * RBAC middleware wrapper for project-level routes
 */
export async function withProjectRBAC(
  request: NextRequest,
  context: any,
  projectId: string,
  requiredPermissions: Permission[],
  handler: (req: NextRequest, ctx: any, projId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // This is a simplified version - in a real implementation,
    // you would get the user's actual project permissions from the database
    // For now, we'll assume the handler can proceed
    return handler(request, context, projectId)
  } catch (error) {
    console.error('Project RBAC middleware error:', error)
    return NextResponse.json({ error: 'Project permission check failed' }, { status: 500 })
  }
}