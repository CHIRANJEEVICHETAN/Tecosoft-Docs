---
inclusion: always
---

# Architecture Patterns & Technical Guidelines

## Multi-Tenant Architecture

### Tenant Isolation Strategy
The platform uses a **shared database, separate tenant** approach:

```typescript
// All database queries must include organization context
const projects = await prisma.project.findMany({
  where: {
    organizationId: context.organizationId, // Always filter by tenant
    // other conditions...
  }
})
```

### Tenant Context Pattern
```typescript
// Middleware extracts tenant context from URL or user session
interface TenantContext {
  organizationId: string
  organizationSlug: string
  userId: string
  userRole: Role
}

// Pass context through request chain
export async function protectOrganizationRoute(
  request: NextRequest,
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>,
  requiredPermissions: Permission[]
) {
  const context = await extractTenantContext(request)
  // Validate permissions and execute handler
}
```

## Service Layer Architecture

### Data Access Layer
```typescript
// lib/data-access/base-service.ts
export abstract class BaseService {
  protected prisma = prisma
  protected organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  // All queries automatically scoped to organization
  protected async findMany<T>(model: any, where: any = {}) {
    return model.findMany({
      where: {
        organizationId: this.organizationId,
        ...where
      }
    })
  }
}
```

### Business Logic Services
```typescript
// lib/services/user-service.ts
export class UserService extends BaseService {
  async createUser(userData: CreateUserData) {
    // Business logic with validation
    // Automatic organization scoping
    return this.prisma.user.create({
      data: {
        ...userData,
        organizationId: this.organizationId
      }
    })
  }
}
```

## Authentication & Authorization Patterns

### Role-Based Access Control (RBAC)
```typescript
// Permission matrix pattern
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ORG_ADMIN]: [
    Permission.MANAGE_ORGANIZATION,
    Permission.MANAGE_USERS,
    Permission.CREATE_PROJECT,
    // ... other permissions
  ],
  // ... other roles
}

// Permission checking utility
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
```

### Hierarchical Permission System
```typescript
// Two-level permission system: Organization + Project
interface UserPermissions {
  organizationRole: Role
  organizationPermissions: Permission[]
  projectRoles: Record<string, ProjectMemberRole>
  projectPermissions: Record<string, Permission[]>
}

// Combined permission checking
export async function canUserPerformAction(
  userId: string,
  action: Permission,
  projectId?: string
): Promise<boolean> {
  const permissions = await getUserEffectivePermissions(userId)
  
  // Check organization-level permission first
  if (permissions.organizationPermissions.includes(action)) {
    return true
  }
  
  // Check project-level permission if applicable
  if (projectId && permissions.projectPermissions[projectId]?.includes(action)) {
    return true
  }
  
  return false
}
```

## API Route Patterns

### Route Protection Middleware
```typescript
// Standardized route protection
export function protectRoute(
  request: NextRequest,
  handler: RouteHandler,
  options: {
    requiredPermissions: Permission[]
    requireTenantContext?: boolean
    requireProjectAccess?: boolean
    checkProjectRole?: boolean
  }
) {
  // Extract context, validate permissions, execute handler
}

// Usage in API routes
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req, context) => {
      const service = new ProjectService(context.organizationId)
      const projects = await service.getAllProjects()
      return NextResponse.json({ projects })
    },
    [Permission.VIEW_PROJECT]
  )
}
```

### Error Handling Pattern
```typescript
// Consistent error response format
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
  }
}

// Error handling middleware
export function handleAPIError(error: unknown): NextResponse {
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
  
  // Log unexpected errors
  console.error('Unexpected API error:', error)
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, { status: 500 })
}
```

## Component Architecture Patterns

### Compound Component Pattern
```typescript
// For complex UI components with multiple parts
export const UserRoleManager = {
  Root: UserRoleManagerRoot,
  Header: UserRoleManagerHeader,
  UserList: UserRoleManagerUserList,
  RoleSelector: UserRoleManagerRoleSelector,
  Actions: UserRoleManagerActions
}

// Usage
<UserRoleManager.Root organizationId={orgId}>
  <UserRoleManager.Header />
  <UserRoleManager.UserList />
  <UserRoleManager.Actions />
</UserRoleManager.Root>
```

### Permission Gate Pattern
```typescript
// Declarative permission-based rendering
export function PermissionGate({
  permissions,
  projectId,
  fallback,
  children
}: PermissionGateProps) {
  const { hasPermissions } = usePermissions(permissions, projectId)
  
  if (!hasPermissions) {
    return fallback || null
  }
  
  return <>{children}</>
}

// Usage
<PermissionGate permissions={[Permission.MANAGE_USERS]}>
  <AdminPanel />
</PermissionGate>
```

### Hook Composition Pattern
```typescript
// Compose multiple hooks for complex state management
export function useProjectManagement(projectId: string) {
  const { user } = useUser()
  const { hasPermissions } = useProjectPermissions(projectId, [Permission.MANAGE_PROJECT])
  const { project, loading, error } = useProject(projectId)
  const { members } = useProjectMembers(projectId)
  
  return {
    project,
    members,
    canManage: hasPermissions,
    isOwner: user?.id === project?.ownerId,
    loading,
    error
  }
}
```

## Data Flow Patterns

### Server-Client Data Flow
```typescript
// Server Components fetch data
export default async function ProjectPage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug)
  
  return (
    <div>
      <ProjectHeader project={project} />
      <ProjectContent projectId={project.id} />
    </div>
  )
}

// Client Components handle interactions
'use client'
export function ProjectContent({ projectId }: { projectId: string }) {
  const { data, mutate } = useSWR(`/api/projects/${projectId}/content`, fetcher)
  
  return (
    <div>
      {/* Interactive content */}
    </div>
  )
}
```

### State Management Pattern
```typescript
// Use React Context for app-wide state
export const OrganizationContext = createContext<{
  organization: Organization | null
  userRole: Role
  permissions: Permission[]
}>()

// Use SWR for server state
export function useProjects() {
  const { data, error, mutate } = useSWR('/api/projects', fetcher)
  
  return {
    projects: data?.projects || [],
    loading: !error && !data,
    error,
    refresh: mutate
  }
}
```

## Database Patterns

### Repository Pattern
```typescript
// Abstract repository for common operations
export abstract class BaseRepository<T> {
  protected abstract model: any
  protected organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findFirst({
      where: {
        id,
        organizationId: this.organizationId
      }
    })
  }

  async create(data: Omit<T, 'id' | 'organizationId'>): Promise<T> {
    return this.model.create({
      data: {
        ...data,
        organizationId: this.organizationId
      }
    })
  }
}

// Specific repository implementation
export class ProjectRepository extends BaseRepository<Project> {
  protected model = prisma.project

  async findBySlug(slug: string): Promise<Project | null> {
    return this.model.findFirst({
      where: {
        slug,
        organizationId: this.organizationId
      }
    })
  }
}
```

### Transaction Pattern
```typescript
// Use transactions for multi-table operations
export async function createProjectWithMembers(
  projectData: CreateProjectData,
  memberIds: string[],
  organizationId: string
) {
  return prisma.$transaction(async (tx) => {
    // Create project
    const project = await tx.project.create({
      data: {
        ...projectData,
        organizationId
      }
    })

    // Add members
    await tx.projectMember.createMany({
      data: memberIds.map(userId => ({
        projectId: project.id,
        userId,
        role: ProjectMemberRole.MEMBER
      }))
    })

    return project
  })
}
```

## Caching Patterns

### Next.js Caching Strategy
```typescript
// Static data with revalidation
export async function getStaticProps() {
  return {
    props: { data },
    revalidate: 3600 // 1 hour
  }
}

// Dynamic data with SWR
export function useProjectData(projectId: string) {
  return useSWR(
    `/api/projects/${projectId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000 // 30 seconds
    }
  )
}
```

### Redis Caching (Future Enhancement)
```typescript
// Cache frequently accessed data
export class CacheService {
  private redis = new Redis(process.env.REDIS_URL)

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async set(key: string, value: any, ttl: number = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }

  async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}
```

## AI Integration Patterns

### LLM Service Abstraction
```typescript
// Abstract LLM provider interface
export interface LLMProvider {
  generateContent(prompt: string, context?: any): Promise<string>
  improveContent(content: string, instructions: string): Promise<string>
  summarizeContent(content: string): Promise<string>
}

// Provider implementations
export class OpenAIProvider implements LLMProvider {
  async generateContent(prompt: string, context?: any): Promise<string> {
    // OpenAI implementation
  }
}

export class ClaudeProvider implements LLMProvider {
  async generateContent(prompt: string, context?: any): Promise<string> {
    // Anthropic Claude implementation
  }
}

// Service factory
export class AIService {
  private provider: LLMProvider

  constructor(providerType: 'openai' | 'claude' | 'gemini') {
    this.provider = this.createProvider(providerType)
  }

  private createProvider(type: string): LLMProvider {
    switch (type) {
      case 'openai': return new OpenAIProvider()
      case 'claude': return new ClaudeProvider()
      default: throw new Error(`Unknown provider: ${type}`)
    }
  }
}
```

## Error Handling & Monitoring

### Structured Error Handling
```typescript
// Error classification
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  PERMISSION = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_ERROR'
}

// Error context
export interface ErrorContext {
  userId?: string
  organizationId?: string
  projectId?: string
  action?: string
  timestamp: Date
}

// Centralized error logging
export class ErrorLogger {
  static log(error: Error, context: ErrorContext) {
    // Log to monitoring service (e.g., Sentry, LogRocket)
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      context
    })
  }
}
```

These architectural patterns ensure scalability, maintainability, and consistency across the Docify.ai Pro platform while supporting multi-tenancy and role-based access control.