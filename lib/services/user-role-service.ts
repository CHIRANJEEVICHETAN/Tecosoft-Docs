import { prisma } from '../prisma'
import { Role, ProjectMemberRole } from '@prisma/client'

export class UserRoleService {
  // Get all users with their roles in the organization
  static async getUsersWithRoles(
    organizationId: string,
    { page, limit, search, role }: { page: number; limit: number; search?: string; role?: Role }
  ) {
    const where: any = { organizationId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const totalUsers = await prisma.user.count({ where })

    return {
      users,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit)
    }
  }

  // Check if user can assign role to another user
  static async canUserAssignRole(userId: string, organizationId: string, targetRole: Role): Promise<boolean> {
    // Fetch user's role
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) return false

    // Super admin can assign any role
    if (user.role === Role.SUPER_ADMIN) return true

    // Org admin can assign roles up to MANAGER
    if (user.role === Role.ORG_ADMIN) {
      return targetRole !== Role.SUPER_ADMIN && targetRole !== Role.ORG_ADMIN
    }

    // Managers cannot assign roles
    return false
  }

  // Update user role
  static async updateUserRole(
    userId: string,
    organizationId: string,
    newRole: Role,
    modifiedByUserId: string
  ) {
    // Ensure user to modify is in the organization
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser || targetUser.organizationId !== organizationId) {
      throw new Error('User not found or does not belong to organization')
    }

    // Cannot modify self to prevent privilege escalation
    if (userId === modifiedByUserId) {
      throw new Error('Cannot modify own role')
    }

    return prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })
  }
}

export class ProjectRoleService {
  // Get all project members with their roles
  static async getProjectMembersWithRoles(
    projectId: string,
    { page, limit, search, role }: { page: number; limit: number; search?: string; role?: ProjectMemberRole }
  ) {
    const where: any = { projectId }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    if (role) {
      where.role = role
    }

    const members = await prisma.projectMember.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const totalMembers = await prisma.projectMember.count({ where })

    return {
      members,
      total: totalMembers,
      pages: Math.ceil(totalMembers / limit)
    }
  }

  // Ensure user can assign a project member role
  static async canUserAssignProjectRole(
    userId: string,
    projectId: string,
    targetRole: ProjectMemberRole
  ): Promise<boolean> {
    // Fetch user's project role
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    })
    
    if (!member) return false

    // Owners can assign any role
    if (member.role === ProjectMemberRole.OWNER) return true

    // Admin can assign roles up to MEMBER
    if (member.role === ProjectMemberRole.ADMIN) {
      return targetRole !== ProjectMemberRole.OWNER && targetRole !== ProjectMemberRole.ADMIN
    }

    // No other roles can assign
    return false
  }

  // Update a member's role in a project
  static async updateProjectMemberRole(
    userId: string,
    projectId: string,
    newRole: ProjectMemberRole,
    modifiedByUserId: string
  ) {
    // Cannot modify own role to prevent privilege escalation
    if (userId === modifiedByUserId) {
      throw new Error('Cannot modify own project role')
    }

    return prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId,
          projectId
        }
      },
      data: {
        role: newRole
      }
    })
  }

  // Add a member to a project
  static async addProjectMember(
    userId: string,
    projectId: string,
    role: ProjectMemberRole,
    addedByUserId: string
  ) {
    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId
        }
      }
    })

    if (existingMember) {
      throw new Error('User is already a member of the project')
    }

    return prisma.projectMember.create({
      data: {
        userId,
        projectId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  }

  // Remove a member from a project
  static async removeProjectMember(
    userId: string,
    projectId: string,
    removedByUserId: string
  ) {
    // Cannot remove self to prevent disruption
    if (userId === removedByUserId) {
      throw new Error('Cannot remove self from project')
    }

    return prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId
        }
      }
    })
  }

  // Check if user can remove member from project
  static async canUserRemoveProjectMember(
    userId: string,
    projectId: string,
    targetUserId: string
  ): Promise<boolean> {
    // Fetch user's and target user's project roles
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    })

    const targetMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: targetUserId }
    })
    
    if (!member || !targetMember) return false

    // Owners can remove anyone
    if (member.role === ProjectMemberRole.OWNER) return true

    // Admins can remove MEMBER or lower
    return (member.role === ProjectMemberRole.ADMIN) && (targetMember.role !== ProjectMemberRole.OWNER)
  }

  // Check if user can add a project member
  static async canUserAddProjectMember(
    userId: string,
    projectId: string,
    targetRole: ProjectMemberRole
  ): Promise<boolean> {
    // Delegating logic to canUserAssignProjectRole
    return this.canUserAssignProjectRole(userId, projectId, targetRole)
  }
}

