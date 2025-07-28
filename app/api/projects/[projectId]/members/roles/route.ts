import { NextRequest, NextResponse } from 'next/server'
import { protectProjectRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { ProjectRoleService } from '@/lib/services/project-role-service'
import { ProjectMemberRole } from '@prisma/client'

/**
 * GET /api/projects/[projectId]/members/roles
 * Get all project members with their roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || undefined
        const role = searchParams.get('role') as ProjectMemberRole | undefined

        const result = await ProjectRoleService.getProjectMembersWithRoles(
          projectId,
          { page, limit, search, role }
        )

        return NextResponse.json(result)
      } catch (error) {
        console.error('Error fetching project members:', error)
        return NextResponse.json(
          { error: 'Failed to fetch project members' },
          { status: 500 }
        )
      }
    },
    [Permission.VIEW_PROJECT_MEMBERS]
  )
}

/**
 * PUT /api/projects/[projectId]/members/roles
 * Update a project member's role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        const body = await req.json()
        const { userId, role } = body

        if (!userId || !role) {
          return NextResponse.json(
            { error: 'userId and role are required' },
            { status: 400 }
          )
        }

        // Validate role
        if (!Object.values(ProjectMemberRole).includes(role)) {
          return NextResponse.json(
            { error: 'Invalid project role' },
            { status: 400 }
          )
        }

        // Check if user can assign this role
        const canAssign = await ProjectRoleService.canUserAssignProjectRole(
          context.userId,
          projectId,
          role
        )

        if (!canAssign) {
          return NextResponse.json(
            { error: 'Insufficient permissions to assign this role' },
            { status: 403 }
          )
        }

        const updatedMember = await ProjectRoleService.updateProjectMemberRole(
          userId,
          projectId,
          role,
          context.userId
        )

        return NextResponse.json({
          message: 'Project member role updated successfully',
          member: {
            id: updatedMember.id,
            userId: updatedMember.userId,
            projectId: updatedMember.projectId,
            role: updatedMember.role,
            user: {
              id: updatedMember.user.id,
              name: updatedMember.user.name,
              email: updatedMember.user.email,
            }
          }
        })
      } catch (error) {
        console.error('Error updating project member role:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('Member not found')) {
            return NextResponse.json(
              { error: 'Project member not found' },
              { status: 404 }
            )
          }
          if (error.message.includes('Cannot modify')) {
            return NextResponse.json(
              { error: error.message },
              { status: 403 }
            )
          }
        }

        return NextResponse.json(
          { error: 'Failed to update project member role' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT_MEMBERS]
  )
}

/**
 * POST /api/projects/[projectId]/members/roles
 * Add a member to the project with a specific role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        const body = await req.json()
        const { userId, role = ProjectMemberRole.MEMBER } = body

        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          )
        }

        // Validate role
        if (!Object.values(ProjectMemberRole).includes(role)) {
          return NextResponse.json(
            { error: 'Invalid project role' },
            { status: 400 }
          )
        }

        // Check if user can add members with this role
        const canAdd = await ProjectRoleService.canUserAddProjectMember(
          context.userId,
          projectId,
          role
        )

        if (!canAdd) {
          return NextResponse.json(
            { error: 'Insufficient permissions to add member with this role' },
            { status: 403 }
          )
        }

        const newMember = await ProjectRoleService.addProjectMember(
          userId,
          projectId,
          role,
          context.userId
        )

        return NextResponse.json({
          message: 'Project member added successfully',
          member: {
            id: newMember.id,
            userId: newMember.userId,
            projectId: newMember.projectId,
            role: newMember.role,
            user: {
              id: newMember.user.id,
              name: newMember.user.name,
              email: newMember.user.email,
            }
          }
        }, { status: 201 })
      } catch (error) {
        console.error('Error adding project member:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('already a member')) {
            return NextResponse.json(
              { error: 'User is already a member of this project' },
              { status: 409 }
            )
          }
          if (error.message.includes('User not found')) {
            return NextResponse.json(
              { error: 'User not found in organization' },
              { status: 404 }
            )
          }
        }

        return NextResponse.json(
          { error: 'Failed to add project member' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT_MEMBERS]
  )
}

/**
 * DELETE /api/projects/[projectId]/members/roles
 * Remove a member from the project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        const body = await req.json()
        const { userId } = body

        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          )
        }

        // Check if user can remove this member
        const canRemove = await ProjectRoleService.canUserRemoveProjectMember(
          context.userId,
          projectId,
          userId
        )

        if (!canRemove) {
          return NextResponse.json(
            { error: 'Insufficient permissions to remove this member' },
            { status: 403 }
          )
        }

        await ProjectRoleService.removeProjectMember(
          userId,
          projectId,
          context.userId
        )

        return NextResponse.json({
          message: 'Project member removed successfully'
        })
      } catch (error) {
        console.error('Error removing project member:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('Member not found')) {
            return NextResponse.json(
              { error: 'Project member not found' },
              { status: 404 }
            )
          }
          if (error.message.includes('Cannot remove')) {
            return NextResponse.json(
              { error: error.message },
              { status: 403 }
            )
          }
        }

        return NextResponse.json(
          { error: 'Failed to remove project member' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT_MEMBERS]
  )
}
