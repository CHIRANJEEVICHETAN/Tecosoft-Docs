import { Role, ProjectMemberRole } from '@prisma/client'
import { Permission, getRolePermissions, getProjectRolePermissions } from '@/lib/middleware/rbac-middleware'

export interface UserPermissions {
  organizationRole: Role
  organizationPermissions: Permission[]
  projectRoles: Record<string, ProjectMemberRole>
  projectPermissions: Record<string, Permission[]>
}

export interface EffectivePermissions {
  organizationPermissions: Permission[]
  projectPermissions: Record<string, Permission[]>
  allPermissions: Set<Permission>
}

/**
 * Check if a user has a specific permission based on their organization role
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = getRolePermissions(userRole)
  return permissions.includes(permission)
}

/**
 * Check if a user has multiple permissions based on their organization role
 */
export function hasPermissions(userRole: Role, requiredPermissions: Permission[]): boolean {
  const permissions = getRolePermissions(userRole)
  return requiredPermissions.every(permission => permissions.includes(permission))
}

/**
 * Check if a user has any of the specified permissions based on their organization role
 */
export function hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
  const userPermissions = getRolePermissions(userRole)
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * Check if a user has a specific permission based on their project role
 */
export function hasProjectPermission(projectRole: ProjectMemberRole, permission: Permission): boolean {
  const permissions = getProjectRolePermissions(projectRole)
  return permissions.includes(permission)
}

/**
 * Check if a user has multiple permissions based on their project role
 */
export function hasProjectPermissions(projectRole: ProjectMemberRole, requiredPermissions: Permission[]): boolean {
  const permissions = getProjectRolePermissions(projectRole)
  return requiredPermissions.every(permission => permissions.includes(permission))
}

/**
 * Check if a user has any of the specified permissions based on their project role
 */
export function hasAnyProjectPermission(projectRole: ProjectMemberRole, permissions: Permission[]): boolean {
  const projectPermissions = getProjectRolePermissions(projectRole)
  return permissions.some(permission => projectPermissions.includes(permission))
}

/**
 * Get user's effective permissions combining organization and project permissions
 */
export function getUserEffectivePermissions(userPermissions: UserPermissions): EffectivePermissions {
  const organizationPermissions = getRolePermissions(userPermissions.organizationRole)
  
  const projectPermissions: Record<string, Permission[]> = {}
  Object.entries(userPermissions.projectRoles).forEach(([projectId, role]) => {
    projectPermissions[projectId] = getProjectRolePermissions(role)
  })

  // Create a set of all unique permissions the user has
  const allPermissions = new Set<Permission>(organizationPermissions)
  
  // Add project-specific permissions to the set
  Object.values(projectPermissions).forEach(permissions => {
    permissions.forEach(permission => allPermissions.add(permission))
  })

  return {
    organizationPermissions,
    projectPermissions,
    allPermissions
  }
}

/**
 * Check if user has permission either at organization level or for a specific project
 */
export function hasEffectivePermission(
  userPermissions: UserPermissions,
  permission: Permission,
  projectId?: string
): boolean {
  // Check organization-level permission first
  const hasOrgPermission = hasPermission(userPermissions.organizationRole, permission)
  
  if (hasOrgPermission) {
    return true
  }

  // If checking for a specific project, check project-level permission
  if (projectId && userPermissions.projectRoles[projectId]) {
    const projectRole = userPermissions.projectRoles[projectId]
    return hasProjectPermission(projectRole, permission)
  }

  return false
}

/**
 * Check if user has all required permissions either at organization level or for a specific project
 */
export function hasEffectivePermissions(
  userPermissions: UserPermissions,
  requiredPermissions: Permission[],
  projectId?: string
): boolean {
  return requiredPermissions.every(permission => 
    hasEffectivePermission(userPermissions, permission, projectId)
  )
}

/**
 * Check if user has any of the required permissions either at organization level or for a specific project
 */
export function hasAnyEffectivePermission(
  userPermissions: UserPermissions,
  permissions: Permission[],
  projectId?: string
): boolean {
  return permissions.some(permission => 
    hasEffectivePermission(userPermissions, permission, projectId)
  )
}

/**
 * Get all projects where user has a specific permission
 */
export function getProjectsWithPermission(
  userPermissions: UserPermissions,
  permission: Permission
): string[] {
  const projectsWithPermission: string[] = []

  // If user has organization-level permission, they have it for all projects
  if (hasPermission(userPermissions.organizationRole, permission)) {
    return Object.keys(userPermissions.projectRoles)
  }

  // Check project-specific permissions
  Object.entries(userPermissions.projectRoles).forEach(([projectId, role]) => {
    if (hasProjectPermission(role, permission)) {
      projectsWithPermission.push(projectId)
    }
  })

  return projectsWithPermission
}

/**
 * Check if user can perform an action on a specific resource
 */
export function canPerformAction(
  userPermissions: UserPermissions,
  action: Permission,
  resourceType: 'organization' | 'project',
  resourceId?: string
): boolean {
  switch (resourceType) {
    case 'organization':
      return hasPermission(userPermissions.organizationRole, action)
    
    case 'project':
      if (!resourceId) {
        throw new Error('Project ID is required for project-level permission checks')
      }
      return hasEffectivePermission(userPermissions, action, resourceId)
    
    default:
      return false
  }
}

/**
 * Get the highest role a user has (useful for UI display)
 */
export function getHighestRole(userPermissions: UserPermissions): Role | ProjectMemberRole {
  const orgRole = userPermissions.organizationRole
  
  // Super admin and org admin are always the highest
  if (orgRole === Role.SUPER_ADMIN || orgRole === Role.ORG_ADMIN) {
    return orgRole
  }

  // Check if user has any project owner roles
  const hasOwnerRole = Object.values(userPermissions.projectRoles).some(
    role => role === ProjectMemberRole.OWNER
  )
  
  if (hasOwnerRole) {
    return ProjectMemberRole.OWNER
  }

  // Check if user has any project admin roles
  const hasAdminRole = Object.values(userPermissions.projectRoles).some(
    role => role === ProjectMemberRole.ADMIN
  )
  
  if (hasAdminRole) {
    return ProjectMemberRole.ADMIN
  }

  return orgRole
}

/**
 * Check if a role is higher than another role in the hierarchy
 */
export function isRoleHigher(role1: Role, role2: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    [Role.SUPER_ADMIN]: 5,
    [Role.ORG_ADMIN]: 4,
    [Role.MANAGER]: 3,
    [Role.USER]: 2,
    [Role.VIEWER]: 1
  }

  return roleHierarchy[role1] > roleHierarchy[role2]
}

/**
 * Check if a project role is higher than another project role in the hierarchy
 */
export function isProjectRoleHigher(role1: ProjectMemberRole, role2: ProjectMemberRole): boolean {
  const roleHierarchy: Record<ProjectMemberRole, number> = {
    [ProjectMemberRole.OWNER]: 4,
    [ProjectMemberRole.ADMIN]: 3,
    [ProjectMemberRole.MEMBER]: 2,
    [ProjectMemberRole.VIEWER]: 1
  }

  return roleHierarchy[role1] > roleHierarchy[role2]
}

/**
 * Get permissions that a user is missing for a specific action
 */
export function getMissingPermissions(
  userPermissions: UserPermissions,
  requiredPermissions: Permission[],
  projectId?: string
): Permission[] {
  return requiredPermissions.filter(permission => 
    !hasEffectivePermission(userPermissions, permission, projectId)
  )
}

/**
 * Check if user can manage another user (based on role hierarchy)
 */
export function canManageUser(managerRole: Role, targetRole: Role): boolean {
  // Super admin can manage everyone
  if (managerRole === Role.SUPER_ADMIN) {
    return true
  }

  // Org admin can manage everyone except super admin
  if (managerRole === Role.ORG_ADMIN) {
    return targetRole !== Role.SUPER_ADMIN
  }

  // Manager can manage users and viewers
  if (managerRole === Role.MANAGER) {
    return targetRole === Role.USER || targetRole === Role.VIEWER
  }

  // Users and viewers cannot manage other users
  return false
}

/**
 * Check if user can manage a project member (based on project role hierarchy)
 */
export function canManageProjectMember(
  managerRole: ProjectMemberRole,
  targetRole: ProjectMemberRole
): boolean {
  // Owner can manage everyone
  if (managerRole === ProjectMemberRole.OWNER) {
    return true
  }

  // Admin can manage members and viewers
  if (managerRole === ProjectMemberRole.ADMIN) {
    return targetRole === ProjectMemberRole.MEMBER || targetRole === ProjectMemberRole.VIEWER
  }

  // Members and viewers cannot manage other members
  return false
}

/**
 * Get all available permissions for a role
 */
export function getAvailablePermissions(role: Role): Permission[] {
  return getRolePermissions(role)
}

/**
 * Get all available permissions for a project role
 */
export function getAvailableProjectPermissions(role: ProjectMemberRole): Permission[] {
  return getProjectRolePermissions(role)
}

/**
 * Validate if a permission exists
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission)
}

/**
 * Validate if a role exists
 */
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role)
}

/**
 * Validate if a project role exists
 */
export function isValidProjectRole(role: string): role is ProjectMemberRole {
  return Object.values(ProjectMemberRole).includes(role as ProjectMemberRole)
}