import { NextRequest, NextResponse } from 'next/server'
import { protectProjectRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/projects/[projectId]/members/[memberId]
 * Remove a member from a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  return protectProjectRoute(
    request,
    async (req: NextRequest, context: TenantContext, projectId: string) => {
      try {
        const { memberId } = params

        // Check if the member exists in the project
        const existingMember = await prisma.projectMember.findFirst({
          where: {
            userId: memberId,
            projectId,
            project: {
              organizationId: context.organizationId
            }
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

        if (!existingMember) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Member not found in this project' 
            },
            { status: 404 }
          )
        }

        // Prevent removing the project owner (unless there's another owner)
        if (existingMember.role === 'OWNER') {
          const ownerCount = await prisma.projectMember.count({
            where: {
              projectId,
              role: 'OWNER'
            }
          })

          if (ownerCount <= 1) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Cannot remove the only project owner' 
              },
              { status: 400 }
            )
          }
        }

        // Remove the member
        await prisma.projectMember.delete({
          where: {
            id: existingMember.id
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Member removed from project successfully',
          removedMember: {
            id: existingMember.id,
            userId: existingMember.userId,
            role: existingMember.role,
            user: existingMember.user
          }
        })
      } catch (error) {
        console.error('Error removing project member:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to remove project member' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT_MEMBERS]
  )
}