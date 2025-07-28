import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'

/**
 * GET /api/manager/comments
 * Get comments from managed projects
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        // Mock comments data
        // In a real implementation, you would query from a comments table
        const mockComments = [
          {
            id: '1',
            content: 'Great progress on the documentation! The new structure looks much cleaner.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 'user1',
              name: 'John Doe',
              email: 'john@example.com',
              imageUrl: null
            },
            taskId: '1',
            projectId: null
          },
          {
            id: '2',
            content: 'I\'ve completed the code review. Found a few minor issues that need to be addressed.',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 'user2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              imageUrl: null
            },
            taskId: '2',
            projectId: null
          },
          {
            id: '3',
            content: 'The CI/CD pipeline is now fully operational. All tests are passing and deployments are automated.',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 'user3',
              name: 'Bob Johnson',
              email: 'bob@example.com',
              imageUrl: null
            },
            taskId: '3',
            projectId: null
          },
          {
            id: '4',
            content: 'Team meeting scheduled for tomorrow at 2 PM to discuss the upcoming sprint.',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            user: {
              id: context.userId,
              name: 'Manager',
              email: 'manager@example.com',
              imageUrl: null
            },
            taskId: null,
            projectId: 'project1'
          },
          {
            id: '5',
            content: 'Welcome to the team! Looking forward to working with everyone.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 'user4',
              name: 'Alice Wilson',
              email: 'alice@example.com',
              imageUrl: null
            },
            taskId: null,
            projectId: 'project1'
          }
        ]

        return NextResponse.json({
          success: true,
          data: mockComments
        })
      } catch (error) {
        console.error('Error fetching comments:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch comments' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}

/**
 * POST /api/manager/comments
 * Add a new comment
 */
export async function POST(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const body = await req.json()
        const { content, taskId, projectId } = body

        if (!content || (!taskId && !projectId)) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Content and either taskId or projectId are required' 
            },
            { status: 400 }
          )
        }

        // In a real implementation, you would create the comment in the database
        const newComment = {
          id: Date.now().toString(),
          content,
          timestamp: new Date().toISOString(),
          user: {
            id: context.userId,
            name: 'Manager',
            email: 'manager@example.com',
            imageUrl: null
          },
          taskId: taskId || null,
          projectId: projectId || null
        }

        return NextResponse.json({
          success: true,
          data: newComment,
          message: 'Comment added successfully'
        })
      } catch (error) {
        console.error('Error adding comment:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to add comment' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}