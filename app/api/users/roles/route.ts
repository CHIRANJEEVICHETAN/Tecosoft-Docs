import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { UserRoleService } from '@/lib/services/user-role-service'
import { Role } from '@prisma/client'

/**
 * GET /api/users/roles
 * Get all users with their roles in the organization
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || undefined
        const role = searchParams.get('role') as Role | undefined

        const result = await UserRoleService.getUsersWithRoles(
          context.organizationId,
          { page, limit, search, role }
        )

        return NextResponse.json(result)
      } catch (error) {
        console.error('Error fetching users with roles:', error)
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        )
      }
    },
    [Permission.VIEW_USERS]
  )
}

/**
 * PUT /api/users/roles
 * Update a user's role in the organization
 */
export async function PUT(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
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
        if (!Object.values(Role).includes(role)) {
          return NextResponse.json(
            { error: 'Invalid role' },
            { status: 400 }
          )
        }

        // Check if user can assign this role
        const canAssign = await UserRoleService.canUserAssignRole(
          context.userId,
          context.organizationId,
          role
        )

        if (!canAssign) {
          return NextResponse.json(
            { error: 'Insufficient permissions to assign this role' },
            { status: 403 }
          )
        }

        const updatedUser = await UserRoleService.updateUserRole(
          userId,
          context.organizationId,
          role,
          context.userId
        )

        return NextResponse.json({
          message: 'User role updated successfully',
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          }
        })
      } catch (error) {
        console.error('Error updating user role:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('User not found')) {
            return NextResponse.json(
              { error: 'User not found' },
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
          { error: 'Failed to update user role' },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_USERS]
  )
}
