import { NextRequest, NextResponse } from 'next/server'
import { protectOrganizationRoute } from '@/lib/middleware/route-protection'
import { Permission } from '@/lib/middleware/rbac-middleware'
import { TenantContext } from '@/lib/middleware/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ProjectMemberRole } from '@prisma/client'

/**
 * GET /api/manager/tasks
 * Get tasks from projects managed by the current user
 */
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') || undefined
        const projectId = searchParams.get('projectId') || undefined

        // Get projects managed by the current user
        const managedProjects = await prisma.project.findMany({
          where: {
            organizationId: context.organizationId,
            members: {
              some: {
                userId: context.userId,
                role: {
                  in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN]
                }
              }
            },
            ...(projectId && { id: projectId })
          },
          select: {
            id: true,
            name: true
          }
        })

        const projectIds = managedProjects.map(p => p.id)

        if (projectIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: []
          })
        }

        // Mock tasks data since we don't have a tasks table yet
        // In a real implementation, you would query from a tasks table
        const mockTasks = [
          {
            id: '1',
            title: 'Update project documentation',
            description: 'Review and update the project README and API documentation',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            assignedTo: {
              id: 'user1',
              name: 'John Doe',
              email: 'john@example.com',
              imageUrl: null
            },
            projectId: projectIds[0],
            projectName: managedProjects[0]?.name || 'Project',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: {
              id: context.userId,
              name: 'Manager',
              email: 'manager@example.com'
            }
          },
          {
            id: '2',
            title: 'Code review for new feature',
            description: 'Review the pull request for the new authentication feature',
            status: 'TODO',
            priority: 'MEDIUM',
            assignedTo: {
              id: 'user2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              imageUrl: null
            },
            projectId: projectIds[0],
            projectName: managedProjects[0]?.name || 'Project',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            createdBy: {
              id: context.userId,
              name: 'Manager',
              email: 'manager@example.com'
            }
          },
          {
            id: '3',
            title: 'Setup CI/CD pipeline',
            description: 'Configure automated testing and deployment pipeline',
            status: 'COMPLETED',
            priority: 'HIGH',
            assignedTo: {
              id: 'user3',
              name: 'Bob Johnson',
              email: 'bob@example.com',
              imageUrl: null
            },
            projectId: projectIds[0],
            projectName: managedProjects[0]?.name || 'Project',
            dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: {
              id: context.userId,
              name: 'Manager',
              email: 'manager@example.com'
            }
          }
        ]

        // Filter by status if provided
        const filteredTasks = status 
          ? mockTasks.filter(task => task.status === status)
          : mockTasks

        return NextResponse.json({
          success: true,
          data: filteredTasks
        })
      } catch (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch tasks' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}

/**
 * POST /api/manager/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req: NextRequest, context: TenantContext) => {
      try {
        const body = await req.json()
        const { title, description, assignedTo, projectId, priority, dueDate } = body

        if (!title || !projectId) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Title and project ID are required' 
            },
            { status: 400 }
          )
        }

        // Verify user can manage the project
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            organizationId: context.organizationId,
            members: {
              some: {
                userId: context.userId,
                role: {
                  in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN]
                }
              }
            }
          }
        })

        if (!project) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Project not found or insufficient permissions' 
            },
            { status: 404 }
          )
        }

        // In a real implementation, you would create the task in the database
        const newTask = {
          id: Date.now().toString(),
          title,
          description,
          status: 'TODO',
          priority: priority || 'MEDIUM',
          assignedTo: assignedTo ? {
            id: assignedTo,
            name: 'Assigned User',
            email: 'user@example.com',
            imageUrl: null
          } : null,
          projectId,
          projectName: project.name,
          dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: {
            id: context.userId,
            name: 'Manager',
            email: 'manager@example.com'
          }
        }

        return NextResponse.json({
          success: true,
          data: newTask,
          message: 'Task created successfully'
        })
      } catch (error) {
        console.error('Error creating task:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to create task' 
          },
          { status: 500 }
        )
      }
    },
    [Permission.MANAGE_PROJECT]
  )
}