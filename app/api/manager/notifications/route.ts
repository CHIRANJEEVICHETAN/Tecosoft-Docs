import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'

/**
 * GET /api/manager/notifications
 * Get notifications for the manager
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        // Mock notifications data
        // In a real implementation, you would query from a notifications table
        const mockNotifications = [
          {
            id: '1',
            type: 'task_assigned',
            title: 'New task assigned',
            message: 'You assigned "Update project documentation" to John Doe',
            read: false,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            relatedId: '1',
            relatedType: 'task',
            user: {
              id: 'user1',
              name: 'John Doe',
              email: 'john@example.com'
            }
          },
          {
            id: '2',
            type: 'task_completed',
            title: 'Task completed',
            message: 'Bob Johnson completed "Setup CI/CD pipeline"',
            read: false,
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            relatedId: '3',
            relatedType: 'task',
            user: {
              id: 'user3',
              name: 'Bob Johnson',
              email: 'bob@example.com'
            }
          },
          {
            id: '3',
            type: 'member_added',
            title: 'New team member',
            message: 'Alice Wilson joined the project team',
            read: true,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            relatedId: 'project1',
            relatedType: 'project',
            user: {
              id: 'user4',
              name: 'Alice Wilson',
              email: 'alice@example.com'
            }
          },
          {
            id: '4',
            type: 'project_update',
            title: 'Project milestone reached',
            message: 'Project "Documentation Platform" reached 75% completion',
            read: true,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            relatedId: 'project1',
            relatedType: 'project',
            user: {
              id: context.userId,
              name: 'Manager',
              email: 'manager@example.com'
            }
          },
          {
            id: '5',
            type: 'comment_added',
            title: 'New comment',
            message: 'Jane Smith commented on "Code review for new feature"',
            read: true,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            relatedId: '2',
            relatedType: 'task',
            user: {
              id: 'user2',
              name: 'Jane Smith',
              email: 'jane@example.com'
            }
          }
        ]

        return NextResponse.json({
          success: true,
          data: mockNotifications
        })
      } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch notifications' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}