import { prisma } from './prisma'
import { Role, ProjectMemberRole } from '@prisma/client'

export type CreateOrganizationInput = {
  name: string
  slug: string
  description?: string
}

export type CreateUserInput = {
  clerkId: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  role?: Role
  organizationId: string
}

export type CreateProjectInput = {
  name: string
  slug: string
  description?: string
  organizationId: string
}

/**
 * Multi-tenant database operations
 */
export class MultiTenantService {
  
  // Organization operations
  static async createOrganization(data: CreateOrganizationInput) {
    return prisma.organization.create({
      data,
      include: {
        users: true,
        projects: true,
      },
    })
  }

  static async getOrganizationBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        users: true,
        projects: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })
  }

  static async getOrganizationById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        users: true,
        projects: true,
      },
    })
  }

  // Organization update operation
  static async updateOrganization(id: string, data: Partial<CreateOrganizationInput>) {
    return prisma.organization.update({
      where: { id },
      data,
      include: {
        users: true,
        projects: true,
      },
    })
  }

  static async deleteOrganization(id: string) {
    return prisma.organization.delete({
      where: { id },
    })
  }

  // User operations
  static async createUser(data: CreateUserInput) {
    return prisma.user.create({
      data,
      include: {
        organization: true,
        projectMembers: {
          include: {
            project: true,
          },
        },
      },
    })
  }

  static async getUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({
      where: { clerkId },
      include: {
        organization: true,
        projectMembers: {
          include: {
            project: true,
          },
        },
      },
    })
  }

  static async getUsersByOrganization(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId },
      include: {
        projectMembers: {
          include: {
            project: true,
          },
        },
      },
    })
  }

  // Project operations
  static async createProject(data: CreateProjectInput) {
    return prisma.project.create({
      data,
      include: {
        organization: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  static async getProjectsByOrganization(organizationId: string) {
    return prisma.project.findMany({
      where: { organizationId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  static async getProjectBySlugAndOrg(slug: string, organizationId: string) {
    return prisma.project.findUnique({
      where: {
        slug_organizationId: {
          slug,
          organizationId,
        },
      },
      include: {
        organization: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  // Project operations update
  static async updateProject(id: string, data: Partial<CreateProjectInput>) {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        organization: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  static async deleteProject(id: string) {
    return prisma.project.delete({
      where: { id },
    })
  }

  // Project member operations
  static async addProjectMember(
    userId: string,
    projectId: string,
    role: ProjectMemberRole = ProjectMemberRole.MEMBER
  ) {
    return prisma.projectMember.create({
      data: {
        userId,
        projectId,
        role,
      },
      include: {
        user: true,
        project: true,
      },
    })
  }

  static async removeProjectMember(userId: string, projectId: string) {
    return prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    })
  }

  static async updateProjectMemberRole(
    userId: string,
    projectId: string,
    role: ProjectMemberRole
  ) {
    return prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: { role },
      include: {
        user: true,
        project: true,
      },
    })
  }

  // Permission checks
  static async canUserAccessOrganization(clerkId: string, organizationId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        clerkId,
        organizationId,
      },
    })
    return !!user
  }

  static async canUserAccessProject(clerkId: string, projectId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        clerkId,
        OR: [
          // User is a member of the project
          {
            projectMembers: {
              some: {
                projectId,
              },
            },
          },
          // User is an admin/manager in the same organization as the project
          {
            role: {
              in: [Role.ORG_ADMIN, Role.MANAGER, Role.SUPER_ADMIN],
            },
            organization: {
              projects: {
                some: {
                  id: projectId,
                },
              },
            },
          },
        ],
      },
    })
    return !!user
  }

  static async getUserProjectRole(clerkId: string, projectId: string): Promise<ProjectMemberRole | null> {
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        user: {
          clerkId,
        },
      },
    })
    return member?.role || null
  }
}
