import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'

/**
 * PATCH /api/manager/tasks/[taskId]
 * Update a task status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const { taskId } = params
        const body = await req.json()
        const { status } = body

        if (!status) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Status is required' 
            },
            { status: 400 }
          )
        }

        const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid status' 
            },
            { status: 400 }
          )
        }

        // In a real implementation, you would update the task in the database
        // For now, we'll just return a success response
        const updatedTask = {
          id: taskId,
          status,
          updatedAt: new Date().toISOString()
        }

        return NextResponse.json({
          success: true,
          data: updatedTask,
          message: 'Task updated successfully'
        })
      } catch (error) {
        console.error('Error updating task:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to update task' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}