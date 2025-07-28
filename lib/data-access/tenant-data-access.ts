import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'

/**
 * Tenant-isolated data access layer
 * All queries are scoped to the user's organization to prevent data leakage
 */
export class TenantDataAccess {
  
  /**
   * Get organization data with tenant isolation
   */
  static async getOrganization(userId: string, organizationId: string) {
    // First verify user belongs to this organization
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('Access denied: User does not belong to organization')
    }

    return prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            imageUrl: true,
            createdAt: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Get projects with tenant isolation
   */
  static async getProjects(userId: string, organizationId: string, filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }) {
    // Verify user access
    await this.verifyUserAccess(userId, organizationId)

    const { search, status, page = 1, limit = 10 } = filters || {}
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status }),
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  imageUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.project.count({ where }),
    ])

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get project with tenant isolation
   */
  static async getProject(userId: string, organizationId: string, projectSlug: string) {
    // Verify user access
    await this.verifyUserAccess(userId, organizationId)

    const project = await prisma.project.findUnique({
      where: {
        slug_organizationId: {
          slug: projectSlug,
          organizationId,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        members: {
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
            createdAt: 'asc',
          },
        },
      },
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Additional check: verify user has access to this specific project
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('Access denied')
    }

    // Check if user is a project member or has organization-level access
    const isMember = project.members.some(member => member.user.id === user.id)
    const hasOrgAccess = [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER].includes(user.role)

    if (!isMember && !hasOrgAccess) {
      throw new Error('Access denied: User does not have access to this project')
    }

    return project
  }

  /**
   * Get users with tenant isolation
   */
  static async getUsers(userId: string, organizationId: string, filters?: {
    search?: string
    role?: Role
    page?: number
    limit?: number
  }) {
    // Verify user access
    await this.verifyUserAccess(userId, organizationId)

    const { search, role, page = 1, limit = 10 } = filters || {}
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          projectMembers: {
            select: {
              id: true,
              role: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get project members with tenant isolation
   */
  static async getProjectMembers(
    userId: string,
    organizationId: string,
    projectId: string,
    filters?: {
      search?: string
      role?: ProjectMemberRole
      page?: number
      limit?: number
    }
  ) {
    // Verify user access to organization
    await this.verifyUserAccess(userId, organizationId)

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    })

    if (!project) {
      throw new Error('Project not found or access denied')
    }

    // Verify user has access to this project
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('Access denied')
    }

    const isMember = await prisma.projectMember.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    })

    const hasOrgAccess = [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER].includes(user.role)

    if (!isMember && !hasOrgAccess) {
      throw new Error('Access denied: User does not have access to this project')
    }

    const { search, role, page = 1, limit = 10 } = filters || {}
    const skip = (page - 1) * limit

    const where = {
      projectId,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
      ...(role && { role }),
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
   * Create project with tenant isolation
   */
  static async createProject(
    userId: string,
    organizationId: string,
    data: {
      name: string
      slug: string
      description?: string
    }
  ) {
    // Verify user access and permissions
    const user = await this.verifyUserAccess(userId, organizationId)

    // Check if user has permission to create projects
    if (![Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.MANAGER].includes(user.role)) {
      throw new Error('Insufficient permissions to create project')
    }

    // Check if slug is unique within organization
    const existingProject = await prisma.project.findUnique({
      where: {
        slug_organizationId: {
          slug: data.slug,
          organizationId,
        },
      },
    })

    if (existingProject) {
      throw new Error('Project slug already exists in organization')
    }

    // Create project and add creator as owner
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          ...data,
          organizationId,
        },
        include: {
          organization: true,
        },
      })

      // Add creator as project owner
      await tx.projectMember.create({
        data: {
          userId: user.id,
          projectId: project.id,
          role: ProjectMemberRole.OWNER,
        },
      })

      return project
    })
  }

  /**
   * Update project with tenant isolation
   */
  static async updateProject(
    userId: string,
    organizationId: string,
    projectId: string,
    data: {
      name?: string
      description?: string
      status?: string
    }
  ) {
    // Verify user access
    const user = await this.verifyUserAccess(userId, organizationId)

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    })

    if (!project) {
      throw new Error('Project not found or access denied')
    }

    // Check user permissions
    const member = await prisma.projectMember.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    })

    const canUpdate = member && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(member.role) ||
                     [Role.SUPER_ADMIN, Role.ORG_ADMIN].includes(user.role)

    if (!canUpdate) {
      throw new Error('Insufficient permissions to update project')
    }

    return prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        organization: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Delete project with tenant isolation
   */
  static async deleteProject(userId: string, organizationId: string, projectId: string) {
    // Verify user access
    const user = await this.verifyUserAccess(userId, organizationId)

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    })

    if (!project) {
      throw new Error('Project not found or access denied')
    }

    // Check user permissions - only project owners and org admins can delete
    const member = await prisma.projectMember.findFirst({
      where: {
        userId: user.id,
        projectId,
      },
    })

    const canDelete = member && member.role === ProjectMemberRole.OWNER ||
                     [Role.SUPER_ADMIN, Role.ORG_ADMIN].includes(user.role)

    if (!canDelete) {
      throw new Error('Insufficient permissions to delete project')
    }

    return prisma.project.delete({
      where: { id: projectId },
    })
  }

  /**
   * Helper method to verify user access to organization
   */
  private static async verifyUserAccess(userId: string, organizationId: string) {
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('Access denied: User does not belong to organization')
    }

    return user
  }

  /**
   * Get dashboard data with tenant isolation
   */
  static async getDashboardData(userId: string, organizationId: string) {
    const user = await this.verifyUserAccess(userId, organizationId)

    const [
      organization,
      projectsData,
      recentProjects,
      userStats,
    ] = await Promise.all([
      // Organization info
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
        },
      }),

      // Projects summary
      this.getProjects(userId, organizationId, { limit: 100 }),

      // Recent projects (last 5)
      prisma.project.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      }),

      // User statistics
      prisma.user.groupBy({
        by: ['role'],
        where: { organizationId },
        _count: { role: true },
      }),
    ])

    const stats = {
      totalProjects: projectsData.pagination.total,
      totalUsers: userStats.reduce((acc, stat) => acc + stat._count.role, 0),
      usersByRole: userStats.map(stat => ({
        role: stat.role,
        count: stat._count.role,
      })),
    }

    return {
      organization,
      stats,
      recentProjects,
      userRole: user.role,
    }
  }
}
