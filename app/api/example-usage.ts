// Example API route demonstrating multi-tenant database operations
// This file shows how to use the MultiTenantService in your application

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { MultiTenantService } from '@/lib/multi-tenant'
import { withTenantContext } from '@/lib/middleware/tenant-middleware'
import { Role, ProjectMemberRole } from '@prisma/client'

// Example: Get organization data
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (req, context) => {
    try {
      // Get organization with all related data
      const organization = await MultiTenantService.getOrganizationById(context.organizationId)
      
      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      // Get projects for this organization
      const projects = await MultiTenantService.getProjectsByOrganization(context.organizationId)
      
      // Get users in this organization
      const users = await MultiTenantService.getUsersByOrganization(context.organizationId)

      return NextResponse.json({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
        },
        projects: projects.map(project => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          status: project.status,
          memberCount: project.members.length,
        })),
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          projectCount: user.projectMembers.length,
        })),
        stats: {
          totalProjects: projects.length,
          totalUsers: users.length,
          activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
        },
      })
    } catch (error) {
      console.error('Error fetching organization data:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

// Example: Create a new project
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (req, context) => {
    try {
      // Only organization admins and managers can create projects
      if (!['ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(context.userRole)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const { name, slug, description } = body

      if (!name || !slug) {
        return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
      }

      // Create the project
      const project = await MultiTenantService.createProject({
        name,
        slug,
        description,
        organizationId: context.organizationId,
      })

      // Add the creator as project owner
      await MultiTenantService.addProjectMember(
        context.userId,
        project.id,
        ProjectMemberRole.OWNER
      )

      return NextResponse.json({
        message: 'Project created successfully',
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          status: project.status,
        },
      }, { status: 201 })
    } catch (error) {
      console.error('Error creating project:', error)
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'Project slug already exists' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

// Example: Advanced usage patterns
export class MultiTenantExamples {
  
  // Example: Get user's accessible projects with their roles
  static async getUserProjects(clerkId: string, organizationId: string) {
    const user = await MultiTenantService.getUserByClerkId(clerkId)
    
    if (!user || user.organizationId !== organizationId) {
      throw new Error('User not found or access denied')
    }

    // Get projects where user is a member
    const userProjects = user.projectMembers.map(member => ({
      project: member.project,
      role: member.role,
      joinedAt: member.createdAt,
    }))

    // If user is org admin or manager, they can see all org projects
    if (['ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(user.role)) {
      const allProjects = await MultiTenantService.getProjectsByOrganization(organizationId)
      
      return allProjects.map(project => {
        const membership = userProjects.find(up => up.project.id === project.id)
        return {
          project,
          role: membership?.role || 'ADMIN', // Implicit admin access
          joinedAt: membership?.joinedAt || null,
          implicitAccess: !membership,
        }
      })
    }

    return userProjects
  }

  // Example: Bulk user management
  static async inviteUsersToProject(
    inviterClerkId: string,
    projectId: string,
    userEmails: string[],
    role: ProjectMemberRole = ProjectMemberRole.MEMBER
  ) {
    // Check if inviter has permission
    const canInvite = await MultiTenantService.canUserAccessProject(inviterClerkId, projectId)
    if (!canInvite) {
      throw new Error('Access denied')
    }

    const inviter = await MultiTenantService.getUserByClerkId(inviterClerkId)
    if (!inviter) {
      throw new Error('Inviter not found')
    }

    const results = []

    for (const email of userEmails) {
      try {
        // In a real application, you would:
        // 1. Send invitation email
        // 2. Create pending invitation record
        // 3. Handle invitation acceptance
        
        // For this example, we assume users already exist
        const existingUsers = await MultiTenantService.getUsersByOrganization(inviter.organizationId)
        const user = existingUsers.find(u => u.email === email)
        
        if (user) {
          await MultiTenantService.addProjectMember(user.id, projectId, role)
          results.push({ email, status: 'invited', userId: user.id })
        } else {
          results.push({ email, status: 'user_not_found' })
        }
      } catch (error) {
        results.push({ email, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return results
  }

  // Example: Permission-based data filtering
  static async getFilteredProjects(clerkId: string, organizationId: string) {
    const user = await MultiTenantService.getUserByClerkId(clerkId)
    
    if (!user || user.organizationId !== organizationId) {
      return []
    }

    const allProjects = await MultiTenantService.getProjectsByOrganization(organizationId)

    // Filter based on user role and project membership
    return allProjects.filter(project => {
      // Super admins and org admins see everything
      if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(user.role)) {
        return true
      }

      // Managers see all projects in their org
      if (user.role === 'MANAGER') {
        return true
      }

      // Regular users only see projects they're members of
      return project.members.some(member => member.userId === user.id)
    }).map(project => ({
      ...project,
      userRole: project.members.find(m => m.userId === user.id)?.role || null,
      canEdit: this.canUserEditProject(user, project),
    }))
  }

  private static canUserEditProject(user: any, project: any): boolean {
    // Org admins can edit any project in their org
    if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(user.role)) {
      return true
    }

    // Project owners and admins can edit
    const membership = project.members.find((m: any) => m.userId === user.id)
    return membership && ['OWNER', 'ADMIN'].includes(membership.role)
  }
}
