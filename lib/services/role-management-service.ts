import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '../prisma'
import { Role, ProjectMemberRole, User } from '@prisma/client'
import { MultiTenantService } from '../multi-tenant'

export interface RoleChangeEvent {
  userId: string
  clerkId: string
  oldRole?: Role
  newRole: Role
  organizationId: string
  changedBy: string
  timestamp: Date
}

export interface ProjectRoleChangeEvent {
  userId: string
  clerkId: string
  projectId: string
  oldRole?: ProjectMemberRole
  newRole: ProjectMemberRole
  changedBy: string
  timestamp: Date
}

/**
 * Comprehensive role management service that integrates with Clerk
 */
export class RoleManagementService extends MultiTenantService {
  
  /**
   * Synchronize user role with Clerk metadata
   */
  static async syncUserRoleWithClerk(userId: string, role: Role, organizationId: string) {
    try {
      const user = await this.getUserByClerkId(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const client = await clerkClient();
      await client.users.updateUserMetadata(user.clerkId, {
        publicMetadata: {
          role,
          organizationId,
          lastRoleUpdate: new Date().toISOString()
        }
      });

      return user
    } catch (error) {
      console.error('Error syncing role with Clerk:', error)
      throw error
    }
  }

  /**
   * Create user with role and sync with Clerk
   */
  static async createUserWithRole(userData: {
    clerkId: string
    email: string
    name?: string
    firstName?: string
    lastName?: string
    imageUrl?: string
    role: Role
    organizationId: string
  }) {
    // Create user in database
    const user = await this.createUser(userData)

    // Sync with Clerk
    await this.syncUserRoleWithClerk(user.clerkId, user.role, user.organizationId)

    return user
  }

  /**
   * Update user role with validation and Clerk sync
   */
  static async updateUserRoleWithSync(
    userId: string,
    newRole: Role,
    changedByUserId: string,
    organizationId: string
  ): Promise<{ user: User; event: RoleChangeEvent }> {
    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!currentUser) {
      throw new Error('User not found')
    }

    if (currentUser.organizationId !== organizationId) {
      throw new Error('User does not belong to this organization')
    }

    // Validate permission to change role
    const canChange = await this.canUserChangeRole(changedByUserId, currentUser.role, newRole)
    if (!canChange) {
      throw new Error('Insufficient permissions to change this role')
    }

    // Update role in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    // Sync with Clerk
    await this.syncUserRoleWithClerk(updatedUser.clerkId, newRole, organizationId)

    // Create role change event
    const roleChangeEvent: RoleChangeEvent = {
      userId,
      clerkId: updatedUser.clerkId,
      oldRole: currentUser.role,
      newRole,
      organizationId,
      changedBy: changedByUserId,
      timestamp: new Date()
    }

    // Log the role change
    await this.logRoleChange(roleChangeEvent)

    return { user: updatedUser, event: roleChangeEvent }
  }

  /**
   * Add project member with role validation
   */
  static async addProjectMemberWithValidation(
    userId: string,
    projectId: string,
    role: ProjectMemberRole,
    addedByUserId: string
  ) {
    // Validate user exists and is in the same organization as the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || user.organizationId !== project.organizationId) {
      throw new Error('User not found or not in the same organization')
    }

    // Check if user can add members with this role
    const canAdd = await this.canUserManageProjectRole(addedByUserId, projectId, role)
    if (!canAdd) {
      throw new Error('Insufficient permissions to add member with this role')
    }

    // Add project member
    const member = await this.addProjectMember(userId, projectId, role)

    // Create project role change event
    const roleChangeEvent: ProjectRoleChangeEvent = {
      userId,
      clerkId: user.clerkId,
      projectId,
      newRole: role,
      changedBy: addedByUserId,
      timestamp: new Date()
    }

    // Log the project role change
    await this.logProjectRoleChange(roleChangeEvent)

    return { member, event: roleChangeEvent }
  }

  /**
   * Update project member role with validation
   */
  static async updateProjectMemberRoleWithValidation(
    userId: string,
    projectId: string,
    newRole: ProjectMemberRole,
    changedByUserId: string
  ) {
    // Get current member data
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId }
      },
      include: { user: true }
    })

    if (!currentMember) {
      throw new Error('Project member not found')
    }

    // Validate permission to change role
    const canChange = await this.canUserManageProjectRole(changedByUserId, projectId, newRole)
    if (!canChange) {
      throw new Error('Insufficient permissions to change this role')
    }

    // Prevent self-modification
    if (userId === changedByUserId) {
      throw new Error('Cannot modify own project role')
    }

    // Update role
    const updatedMember = await this.updateProjectMemberRole(userId, projectId, newRole)

    // Create project role change event
    const roleChangeEvent: ProjectRoleChangeEvent = {
      userId,
      clerkId: currentMember.user.clerkId,
      projectId,
      oldRole: currentMember.role,
      newRole,
      changedBy: changedByUserId,
      timestamp: new Date()
    }

    // Log the project role change
    await this.logProjectRoleChange(roleChangeEvent)

    return { member: updatedMember, event: roleChangeEvent }
  }

  /**
   * Get user's effective permissions across all contexts
   */
  static async getUserEffectivePermissions(clerkId: string) {
    const user = await this.getUserByClerkId(clerkId)
    if (!user) {
      throw new Error('User not found')
    }

    // Get organization-level permissions
    const orgPermissions = this.getOrganizationPermissions(user.role)

    // Get project-level permissions
    const projectPermissions = await Promise.all(
      user.projectMembers.map(async (member) => {
        const permissions = this.getProjectPermissions(member.role)
        return {
          projectId: member.projectId,
          role: member.role,
          permissions
        }
      })
    )

    return {
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role
      },
      organization: {
        id: user.organizationId,
        role: user.role,
        permissions: orgPermissions
      },
      projects: projectPermissions
    }
  }

  /**
   * Bulk role assignment with validation
   */
  static async bulkAssignRoles(
    assignments: Array<{ userId: string; role: Role }>,
    organizationId: string,
    changedByUserId: string
  ) {
    const results = []
    const errors = []

    for (const assignment of assignments) {
      try {
        const result = await this.updateUserRoleWithSync(
          assignment.userId,
          assignment.role,
          changedByUserId,
          organizationId
        )
        results.push(result)
      } catch (error) {
        errors.push({
          userId: assignment.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return { results, errors }
  }

  /**
   * Role hierarchy and permission validation
   */
  private static async canUserChangeRole(
    changerUserId: string,
    currentRole: Role,
    newRole: Role
  ): Promise<boolean> {
    const changerUser = await prisma.user.findUnique({
      where: { id: changerUserId }
    })

    if (!changerUser) return false

    // Super admin can change any role
    if (changerUser.role === Role.SUPER_ADMIN) return true

    // Org admin can change roles except SUPER_ADMIN and other ORG_ADMIN
    if (changerUser.role === Role.ORG_ADMIN) {
      return newRole !== Role.SUPER_ADMIN && newRole !== Role.ORG_ADMIN && currentRole !== Role.SUPER_ADMIN
    }

    return false
  }

  private static async canUserManageProjectRole(
    userId: string,
    projectId: string,
    targetRole: ProjectMemberRole
  ): Promise<boolean> {
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId }
      }
    })

    if (!member) {
      // Check if user has organization-level permissions
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: { include: { projects: true } } }
      })

      if (!user) return false

      // Org admins can manage project roles
      const hasProjectInOrg = user.organization.projects.some(p => p.id === projectId)
      return hasProjectInOrg && (user.role === Role.ORG_ADMIN || user.role === Role.SUPER_ADMIN)
    }

    // Project owners can assign any role
    if (member.role === ProjectMemberRole.OWNER) return true

    // Project admins can assign up to MEMBER role
    if (member.role === ProjectMemberRole.ADMIN) {
      return targetRole !== ProjectMemberRole.OWNER
    }

    return false
  }

  private static getOrganizationPermissions(role: Role): string[] {
    // This would return the permissions based on the role
    // Implementation depends on your permission system
    const rolePermissions = {
      [Role.SUPER_ADMIN]: ['*'], // All permissions
      [Role.ORG_ADMIN]: ['manage_org', 'manage_users', 'manage_projects'],
      [Role.MANAGER]: ['manage_projects', 'view_users'],
      [Role.USER]: ['view_org', 'view_projects'],
      [Role.VIEWER]: ['view_org']
    }

    return rolePermissions[role] || []
  }

  private static getProjectPermissions(role: ProjectMemberRole): string[] {
    const rolePermissions = {
      [ProjectMemberRole.OWNER]: ['*'], // All project permissions
      [ProjectMemberRole.ADMIN]: ['manage_project', 'manage_members', 'manage_content'],
      [ProjectMemberRole.MEMBER]: ['view_project', 'create_content'],
      [ProjectMemberRole.VIEWER]: ['view_project']
    }

    return rolePermissions[role] || []
  }

  /**
   * Log role changes for audit purposes
   */
  private static async logRoleChange(event: RoleChangeEvent) {
    // You could implement a separate audit log table
    console.log('Role change event:', event)
    
    // Example: Store in audit log
    // await prisma.auditLog.create({
    //   data: {
    //     action: 'ROLE_CHANGE',
    //     userId: event.userId,
    //     details: JSON.stringify(event),
    //     performedBy: event.changedBy,
    //     timestamp: event.timestamp
    //   }
    // })
  }

  private static async logProjectRoleChange(event: ProjectRoleChangeEvent) {
    // You could implement a separate audit log table
    console.log('Project role change event:', event)
    
    // Example: Store in audit log
    // await prisma.projectAuditLog.create({
    //   data: {
    //     action: 'PROJECT_ROLE_CHANGE',
    //     userId: event.userId,
    //     projectId: event.projectId,
    //     details: JSON.stringify(event),
    //     performedBy: event.changedBy,
    //     timestamp: event.timestamp
    //   }
    // })
  }

  /**
   * Get role assignment statistics
   */
  static async getRoleStatistics(organizationId: string) {
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      where: { organizationId },
      _count: { role: true }
    })

    const projectStats = await prisma.projectMember.groupBy({
      by: ['role'],
      where: {
        project: { organizationId }
      },
      _count: { role: true }
    })

    return {
      organizationRoles: userStats.map(stat => ({
        role: stat.role,
        count: stat._count.role
      })),
      projectRoles: projectStats.map(stat => ({
        role: stat.role,
        count: stat._count.role
      }))
    }
  }

  /**
   * Validate role transitions
   */
  static validateRoleTransition(fromRole: Role, toRole: Role): boolean {
    // Define valid role transitions
    const validTransitions: Record<Role, Role[]> = {
      [Role.VIEWER]: [Role.USER, Role.MANAGER],
      [Role.USER]: [Role.VIEWER, Role.MANAGER],
      [Role.MANAGER]: [Role.USER, Role.VIEWER, Role.ORG_ADMIN],
      [Role.ORG_ADMIN]: [Role.MANAGER],
      [Role.SUPER_ADMIN]: Object.values(Role) // Super admin can be changed to any role
    }

    return validTransitions[fromRole]?.includes(toRole) || false
  }

  /**
   * Get users eligible for role change
   */
  static async getEligibleUsersForRole(
    organizationId: string,
    targetRole: Role,
    changerUserId: string
  ) {
    const changerUser = await prisma.user.findUnique({
      where: { id: changerUserId }
    })

    if (!changerUser) {
      throw new Error('Changer user not found')
    }

    // Determine which users can be changed to the target role
    let whereCondition: any = {
      organizationId,
      id: { not: changerUserId } // Exclude self
    }

    if (changerUser.role === Role.ORG_ADMIN) {
      // Org admin cannot change super admins or other org admins
      whereCondition.role = {
        notIn: [Role.SUPER_ADMIN, Role.ORG_ADMIN]
      }
    } else if (changerUser.role !== Role.SUPER_ADMIN) {
      // Only super admin can change roles
      return []
    }

    const eligibleUsers = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        role: true
      }
    })

    // Filter by valid transitions
    return eligibleUsers.filter(user => 
      this.validateRoleTransition(user.role, targetRole)
    )
  }
}
