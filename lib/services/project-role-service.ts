import { prisma } from '@/lib/prisma'
import { ProjectMemberRole, Role } from '@prisma/client'
import { MultiTenantService } from '@/lib/multi-tenant'

export interface ProjectMemberFilters {
  page?: number
  limit?: number
  search?: string
  role?: ProjectMemberRole
}

export class ProjectRoleService {
  /**
   * Get project members with their roles and pagination
   */
  static async getProjectMembersWithRoles(
    projectId: string,
    filters: ProjectMemberFilters = {}
  ) {
    const { page = 1, limit = 10, search, role } = filters
    const skip = (page - 1) * limit

    const where = {
      projectId,
      ...(role && { role }),
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
    }

    const [members, total] = await Promise.all([
      prisma.projectMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.projectMember.count({ where }),
    ])

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Check if a user can assign a specific project role
   */
  static async canUserAssignProjectRole(
    userId: string,
    projectId: string,
    targetRole: ProjectMemberRole
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projectMembers: {
          where: { projectId },
        },
      },
    })

    if (!user) return false

    // Super admins and org admins can assign any role
    if (user.role === Role.SUPER_ADMIN || user.role === Role.ORG_ADMIN) {
      return true
    }

    const membership = user.projectMembers[0]
    if (!membership) return false

    // Project owners can assign any role
    if (membership.role === ProjectMemberRole.OWNER) {
      return true
    }

    // Project admins can assign member and viewer roles
    if (membership.role === ProjectMemberRole.ADMIN) {
      return ([ProjectMemberRole.MEMBER, ProjectMemberRole.VIEWER] as ProjectMemberRole[]).includes(targetRole)
    }

    return false
  }

  /**
   * Check if a user can add a project member with a specific role
   */
  static async canUserAddProjectMember(
    userId: string,
    projectId: string,
    targetRole: ProjectMemberRole
  ): Promise<boolean> {
    return this.canUserAssignProjectRole(userId, projectId, targetRole)
  }

  /**
   * Check if a user can remove a project member
   */
  static async canUserRemoveProjectMember(
    userId: string,
    projectId: string,
    targetUserId: string
  ): Promise<boolean> {
    const [user, targetMember] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          projectMembers: {
            where: { projectId },
          },
        },
      }),
      prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: targetUserId,
            projectId,
          },
        },
      }),
    ])

    if (!user || !targetMember) return false

    // Super admins and org admins can remove anyone
    if (user.role === Role.SUPER_ADMIN || user.role === Role.ORG_ADMIN) {
      return true
    }

    const membership = user.projectMembers[0]
    if (!membership) return false

    // Project owners can remove anyone except other owners
    if (membership.role === ProjectMemberRole.OWNER) {
      return targetMember.role !== ProjectMemberRole.OWNER || targetMember.userId === userId
    }

    // Project admins can remove members and viewers
    if (membership.role === ProjectMemberRole.ADMIN) {
      return ([ProjectMemberRole.MEMBER, ProjectMemberRole.VIEWER] as ProjectMemberRole[]).includes(targetMember.role)
    }

    // Users can remove themselves
    return targetUserId === userId
  }

  /**
   * Update a project member's role
   */
  static async updateProjectMemberRole(
    userId: string,
    projectId: string,
    role: ProjectMemberRole,
    updatedBy: string
  ) {
    // Check if member exists
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      include: { user: true },
    })

    if (!existingMember) {
      throw new Error('Member not found in project')
    }

    // Prevent modifying the last owner
    if (existingMember.role === ProjectMemberRole.OWNER && role !== ProjectMemberRole.OWNER) {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: ProjectMemberRole.OWNER,
        },
      })

      if (ownerCount <= 1) {
        throw new Error('Cannot modify the last project owner')
      }
    }

    return MultiTenantService.updateProjectMemberRole(userId, projectId, role)
  }

  /**
   * Add a new project member
   */
  static async addProjectMember(
    userId: string,
    projectId: string,
    role: ProjectMemberRole,
    addedBy: string
  ) {
    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    })

    if (existingMember) {
      throw new Error('User is already a member of this project')
    }

    // Verify user exists and belongs to the same organization
    const [user, project] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
      }),
      prisma.project.findUnique({
        where: { id: projectId },
      }),
    ])

    if (!user || !project) {
      throw new Error('User not found in organization')
    }

    if (user.organizationId !== project.organizationId) {
      throw new Error('User not found in organization')
    }

    return MultiTenantService.addProjectMember(userId, projectId, role)
  }

  /**
   * Remove a project member
   */
  static async removeProjectMember(
    userId: string,
    projectId: string,
    removedBy: string
  ) {
    // Check if member exists
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    })

    if (!existingMember) {
      throw new Error('Member not found in project')
    }

    // Prevent removing the last owner
    if (existingMember.role === ProjectMemberRole.OWNER) {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: ProjectMemberRole.OWNER,
        },
      })

      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last project owner')
      }
    }

    return MultiTenantService.removeProjectMember(userId, projectId)
  }
}
