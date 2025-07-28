---
inclusion: fileMatch
fileMatchPattern: 'app/api/**/*'
---

# API Conventions & Route Patterns

## Route Structure & Organization

### Multi-Tenant URL Structure
All API routes follow a consistent multi-tenant pattern:

```
/api/org/[orgSlug]/...           # Organization-scoped routes
/api/org/[orgSlug]/projects/...  # Project-scoped routes
/api/admin/...                   # Super-admin only routes
/api/auth/...                    # Authentication routes
/api/public/...                  # Public routes (no auth required)
```

### Route Naming Conventions
```typescript
// RESTful resource routes
GET    /api/org/[orgSlug]/projects              # List projects
POST   /api/org/[orgSlug]/projects              # Create project
GET    /api/org/[orgSlug]/projects/[id]         # Get project
PUT    /api/org/[orgSlug]/projects/[id]         # Update project
DELETE /api/org/[orgSlug]/projects/[id]         # Delete project

// Nested resource routes
GET    /api/org/[orgSlug]/projects/[id]/members # List project members
POST   /api/org/[orgSlug]/projects/[id]/members # Add project member
PUT    /api/org/[orgSlug]/projects/[id]/members/[userId] # Update member role
DELETE /api/org/[orgSlug]/projects/[id]/members/[userId] # Remove member

// Action-based routes (when RESTful doesn't fit)
POST   /api/org/[orgSlug]/projects/[id]/duplicate # Duplicate project
POST   /api/org/[orgSlug]/projects/[id]/archive   # Archive project
```

## Route Protection Patterns

### Organization-Level Protection
```typescript
// app/api/org/[orgSlug]/projects/route.ts
import { protectOrganizationRoute, Permission } from '@/lib/middleware/route-protection'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const projectService = new ProjectService(context.organizationId)
      const projects = await projectService.getAllProjects()
      
      return NextResponse.json({
        success: true,
        data: { projects }
      })
    },
    [Permission.VIEW_PROJECT]
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const body = await req.json()
      const projectService = new ProjectService(context.organizationId)
      const project = await projectService.createProject({
        ...body,
        creatorId: context.userId
      })
      
      return NextResponse.json({
        success: true,
        data: { project }
      }, { status: 201 })
    },
    [Permission.CREATE_PROJECT]
  )
}
```

### Project-Level Protection
```typescript
// app/api/org/[orgSlug]/projects/[projectId]/members/route.ts
import { protectProjectRoute, Permission } from '@/lib/middleware/route-protection'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req, context, projectId) => {
      const projectService = new ProjectService(context.organizationId)
      const members = await projectService.getProjectMembers(projectId)
      
      return NextResponse.json({
        success: true,
        data: { members }
      })
    },
    [Permission.VIEW_PROJECT_MEMBERS]
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req, context, projectId) => {
      const { userId, role } = await req.json()
      
      const projectService = new ProjectService(context.organizationId)
      const member = await projectService.addProjectMember(projectId, userId, role)
      
      return NextResponse.json({
        success: true,
        data: { member }
      }, { status: 201 })
    },
    [Permission.MANAGE_PROJECT_MEMBERS]
  )
}
```

### Super Admin Routes
```typescript
// app/api/admin/organizations/route.ts
import { RouteProtectors } from '@/lib/middleware/route-protection'

export const GET = RouteProtectors.superAdminOnly(
  async (request) => {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { organizations }
    })
  }
)

export const POST = RouteProtectors.superAdminOnly(
  async (request) => {
    const body = await request.json()
    const organization = await createOrganizationWithAdmin(body.orgData, body.adminData)
    
    return NextResponse.json({
      success: true,
      data: { organization }
    }, { status: 201 })
  }
)
```

## Request/Response Patterns

### Standard Response Format
```typescript
// Success response
interface SuccessResponse<T = any> {
  success: true
  data: T
  meta?: {
    pagination?: PaginationMeta
    timestamp?: string
    version?: string
  }
}

// Error response
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string // For validation errors
  }
}

// Usage in routes
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData()
    
    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch data',
        details: error.message
      }
    }, { status: 500 })
  }
}
```

### Pagination Pattern
```typescript
interface PaginationParams {
  cursor?: string
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

interface PaginationMeta {
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor?: string
  previousCursor?: string
  totalCount?: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const sort = searchParams.get('sort') || 'createdAt'
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const projects = await prisma.project.findMany({
        where: { organizationId: context.organizationId },
        take: limit + 1, // Take one extra to check if there's a next page
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor }
        }),
        orderBy: { [sort]: order }
      })

      const hasNextPage = projects.length > limit
      if (hasNextPage) projects.pop() // Remove the extra item

      const nextCursor = hasNextPage ? projects[projects.length - 1]?.id : undefined

      return NextResponse.json({
        success: true,
        data: { projects },
        meta: {
          hasNextPage,
          hasPreviousPage: !!cursor,
          nextCursor
        }
      })
    },
    [Permission.VIEW_PROJECT]
  )
}
```

### Search and Filtering
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const status = searchParams.get('status')
  const role = searchParams.get('role')

  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const where: any = {
        organizationId: context.organizationId
      }

      // Text search
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      }

      // Status filter
      if (status) {
        where.status = status
      }

      // Role filter (for project members)
      if (role) {
        where.members = {
          some: {
            userId: context.userId,
            role: role
          }
        }
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          _count: {
            select: { members: true }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: { projects }
      })
    },
    [Permission.VIEW_PROJECT]
  )
}
```

## Input Validation Patterns

### Zod Schema Validation
```typescript
import { z } from 'zod'

// Define schemas for request validation
const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description too long').optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).default('ACTIVE')
})

const updateProjectMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
})

// Validation middleware
async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      }
    }
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Invalid JSON'
      }
    }
  }
}

// Usage in routes
export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, createProjectSchema)
  
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error
    }, { status: 400 })
  }

  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const projectService = new ProjectService(context.organizationId)
      const project = await projectService.createProject({
        ...validation.data,
        creatorId: context.userId
      })
      
      return NextResponse.json({
        success: true,
        data: { project }
      }, { status: 201 })
    },
    [Permission.CREATE_PROJECT]
  )
}
```

## Error Handling Patterns

### Centralized Error Handler
```typescript
// lib/api/error-handler.ts
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof APIError) {
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: error.statusCode })
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      }
    }, { status: 400 })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json({
          success: false,
          error: {
            code: 'DUPLICATE_ERROR',
            message: 'Resource already exists',
            field: error.meta?.target
          }
        }, { status: 409 })
      
      case 'P2025':
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found'
          }
        }, { status: 404 })
      
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed'
          }
        }, { status: 500 })
    }
  }

  // Unknown error
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, { status: 500 })
}

// Usage wrapper
export function withErrorHandler(
  handler: (request: NextRequest, params?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, params?: any) => {
    try {
      return await handler(request, params)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}
```

### Route-Specific Error Handling
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; projectId: string } }
) {
  return protectProjectRoute(
    request,
    async (req, context, projectId) => {
      try {
        const projectService = new ProjectService(context.organizationId)
        
        // Check if user can delete this project
        const project = await projectService.getProject(projectId)
        if (!project) {
          throw new APIError('NOT_FOUND', 'Project not found', 404)
        }

        // Check if project has dependencies
        const memberCount = await projectService.getProjectMemberCount(projectId)
        if (memberCount > 1) {
          throw new APIError(
            'CANNOT_DELETE',
            'Cannot delete project with multiple members',
            400,
            { memberCount }
          )
        }

        await projectService.deleteProject(projectId)
        
        return NextResponse.json({
          success: true,
          data: { message: 'Project deleted successfully' }
        })
      } catch (error) {
        return handleAPIError(error)
      }
    },
    [Permission.DELETE_PROJECT]
  )
}
```

## Rate Limiting Patterns

### Basic Rate Limiting
```typescript
// lib/middleware/rate-limit.ts
import { NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }
  
  const current = rateLimitMap.get(identifier)
  
  if (!current || current.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return {
      success: true,
      remaining: limit - 1,
      resetTime: now + windowMs
    }
  }
  
  if (current.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime
    }
  }
  
  current.count++
  return {
    success: true,
    remaining: limit - current.count,
    resetTime: current.resetTime
  }
}

// Usage in routes
export async function POST(request: NextRequest) {
  const clientIP = request.ip || 'unknown'
  const rateLimitResult = rateLimit(`api:${clientIP}`, 50, 60000)
  
  if (!rateLimitResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      }
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
      }
    })
  }
  
  // Continue with normal processing
}
```

## Webhook Patterns

### Clerk Webhook Handler
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Get the body
  const payload = await request.text()

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: any

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the webhook
  const { type, data } = evt

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data)
        break
      case 'user.updated':
        await handleUserUpdated(data)
        break
      case 'user.deleted':
        await handleUserDeleted(data)
        break
      default:
        console.log(`Unhandled webhook type: ${type}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleUserCreated(data: any) {
  // Sync user creation with local database
  const organizationId = data.public_metadata?.organizationId
  
  if (organizationId) {
    await prisma.user.create({
      data: {
        clerkId: data.id,
        email: data.email_addresses[0].email_address,
        name: `${data.first_name} ${data.last_name}`.trim(),
        firstName: data.first_name,
        lastName: data.last_name,
        imageUrl: data.image_url,
        organizationId,
        role: data.public_metadata?.role || Role.USER
      }
    })
  }
}
```

These API conventions ensure consistent, secure, and maintainable API routes across the Docify.ai Pro platform while supporting multi-tenancy and role-based access control.