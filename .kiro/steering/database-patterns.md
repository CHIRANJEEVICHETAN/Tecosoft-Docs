---
inclusion: fileMatch
fileMatchPattern: 'prisma/**/*'
---

# Database Patterns & Prisma Guidelines

## Multi-Tenant Database Architecture

### Core Principles
1. **Shared Database, Separate Tenant**: All organizations share the same database with data isolation through `organizationId`
2. **Row-Level Security**: Every tenant-specific table includes `organizationId` for filtering
3. **Cascade Deletes**: Proper cleanup when organizations or users are removed
4. **Audit Trails**: Track all changes for compliance and debugging

### Schema Structure
```prisma
// Base organization model - the tenant boundary
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique // URL-friendly identifier
  description String?
  
  // Relationships
  users       User[]
  projects    Project[]
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("organizations")
}

// User model with organization scoping
model User {
  id             String       @id @default(cuid())
  clerkId        String       @unique // Clerk authentication ID
  email          String       @unique
  name           String?
  firstName      String?
  lastName       String?
  imageUrl       String?
  role           Role         @default(USER)
  
  // Multi-tenant relationship
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Project relationships
  projectMembers ProjectMember[]
  
  // Metadata
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("users")
}
```

### Role Hierarchy Models
```prisma
// Organization-level roles
enum Role {
  SUPER_ADMIN // Platform administrator
  ORG_ADMIN   // Organization administrator
  MANAGER     // Project manager
  USER        // Regular user
  VIEWER      // Read-only access
}

// Project-level roles
enum ProjectMemberRole {
  OWNER   // Project owner
  ADMIN   // Project administrator
  MEMBER  // Regular member
  VIEWER  // Read-only access
}

// Project membership junction table
model ProjectMember {
  id        String            @id @default(cuid())
  userId    String
  projectId String
  role      ProjectMemberRole @default(MEMBER)
  
  // Relationships
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  // Metadata
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@unique([userId, projectId])
  @@map("project_members")
}
```

## Data Access Patterns

### Base Service Pattern
```typescript
// lib/data-access/base-service.ts
export abstract class BaseService {
  protected prisma = prisma
  protected organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  // Automatically scope all queries to organization
  protected async findMany<T>(
    model: any,
    where: any = {},
    include?: any
  ): Promise<T[]> {
    return model.findMany({
      where: {
        organizationId: this.organizationId,
        ...where
      },
      include
    })
  }

  protected async findUnique<T>(
    model: any,
    where: any,
    include?: any
  ): Promise<T | null> {
    return model.findFirst({
      where: {
        organizationId: this.organizationId,
        ...where
      },
      include
    })
  }

  protected async create<T>(
    model: any,
    data: any
  ): Promise<T> {
    return model.create({
      data: {
        ...data,
        organizationId: this.organizationId
      }
    })
  }

  protected async update<T>(
    model: any,
    where: any,
    data: any
  ): Promise<T> {
    return model.update({
      where: {
        ...where,
        organizationId: this.organizationId
      },
      data
    })
  }

  protected async delete<T>(
    model: any,
    where: any
  ): Promise<T> {
    return model.delete({
      where: {
        ...where,
        organizationId: this.organizationId
      }
    })
  }
}
```

### Specific Service Implementation
```typescript
// lib/services/project-service.ts
export class ProjectService extends BaseService {
  async getAllProjects(): Promise<Project[]> {
    return this.findMany(prisma.project, {}, {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true
            }
          }
        }
      }
    })
  }

  async getProjectBySlug(slug: string): Promise<Project | null> {
    return this.findUnique(prisma.project, { slug }, {
      members: {
        include: {
          user: true
        }
      }
    })
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    return prisma.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          ...data,
          organizationId: this.organizationId
        }
      })

      // Add creator as owner
      await tx.projectMember.create({
        data: {
          userId: data.creatorId,
          projectId: project.id,
          role: ProjectMemberRole.OWNER
        }
      })

      return project
    })
  }

  async addProjectMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole = ProjectMemberRole.MEMBER
  ): Promise<ProjectMember> {
    // Verify project belongs to organization
    const project = await this.findUnique(prisma.project, { id: projectId })
    if (!project) {
      throw new Error('Project not found')
    }

    return prisma.projectMember.create({
      data: {
        userId,
        projectId,
        role
      }
    })
  }
}
```

## Query Optimization Patterns

### Efficient Relationship Loading
```typescript
// Use select and include strategically
export async function getProjectsWithMembers(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true
            }
          }
        }
      }
    }
  })
}

// Use pagination for large datasets
export async function getProjectsPaginated(
  organizationId: string,
  cursor?: string,
  limit: number = 20
) {
  return prisma.project.findMany({
    where: { organizationId },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor }
    }),
    orderBy: { createdAt: 'desc' }
  })
}
```

### Aggregation Queries
```typescript
// Get organization statistics
export async function getOrganizationStats(organizationId: string) {
  const [userCount, projectCount, documentCount] = await Promise.all([
    prisma.user.count({
      where: { organizationId }
    }),
    prisma.project.count({
      where: { organizationId }
    }),
    prisma.document.count({
      where: { 
        project: { organizationId }
      }
    })
  ])

  return {
    users: userCount,
    projects: projectCount,
    documents: documentCount
  }
}

// Get project member counts
export async function getProjectMemberCounts(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          members: true
        }
      }
    }
  })
}
```

## Transaction Patterns

### Complex Multi-Table Operations
```typescript
// Create organization with initial admin user
export async function createOrganizationWithAdmin(
  orgData: CreateOrganizationData,
  adminData: CreateUserData
) {
  return prisma.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: orgData
    })

    // Create admin user
    const adminUser = await tx.user.create({
      data: {
        ...adminData,
        organizationId: organization.id,
        role: Role.ORG_ADMIN
      }
    })

    // Create default project
    const defaultProject = await tx.project.create({
      data: {
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Default project for new organizations',
        organizationId: organization.id
      }
    })

    // Add admin as project owner
    await tx.projectMember.create({
      data: {
        userId: adminUser.id,
        projectId: defaultProject.id,
        role: ProjectMemberRole.OWNER
      }
    })

    return {
      organization,
      adminUser,
      defaultProject
    }
  })
}
```

### Bulk Operations
```typescript
// Bulk add users to project
export async function bulkAddProjectMembers(
  projectId: string,
  userIds: string[],
  role: ProjectMemberRole = ProjectMemberRole.MEMBER
) {
  return prisma.$transaction(async (tx) => {
    // Verify project exists and get organization
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Verify all users belong to the same organization
    const users = await tx.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: project.organizationId
      },
      select: { id: true }
    })

    if (users.length !== userIds.length) {
      throw new Error('Some users not found in organization')
    }

    // Create project memberships
    const memberships = await tx.projectMember.createMany({
      data: userIds.map(userId => ({
        userId,
        projectId,
        role
      })),
      skipDuplicates: true
    })

    return memberships
  })
}
```

## Migration Patterns

### Schema Evolution
```prisma
// Adding new fields with defaults
model User {
  // ... existing fields
  
  // New optional field
  timezone     String?
  
  // New field with default
  isActive     Boolean @default(true)
  
  // New field with computed default
  lastLoginAt  DateTime?
}
```

### Data Migration Scripts
```typescript
// prisma/migrations/add-default-projects.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all organizations without a default project
  const organizations = await prisma.organization.findMany({
    where: {
      projects: {
        none: {
          slug: 'getting-started'
        }
      }
    }
  })

  // Create default projects
  for (const org of organizations) {
    await prisma.project.create({
      data: {
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Default project for documentation',
        organizationId: org.id
      }
    })
  }

  console.log(`Created default projects for ${organizations.length} organizations`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Performance Optimization

### Database Indexes
```prisma
model User {
  // ... fields
  
  // Composite indexes for common queries
  @@index([organizationId, role])
  @@index([organizationId, createdAt])
  @@index([clerkId]) // Single field index
}

model Project {
  // ... fields
  
  @@index([organizationId, slug])
  @@index([organizationId, createdAt])
}

model ProjectMember {
  // ... fields
  
  @@index([projectId, role])
  @@index([userId, projectId]) // Composite unique constraint also serves as index
}
```

### Query Optimization
```typescript
// Use select to limit returned fields
const projects = await prisma.project.findMany({
  where: { organizationId },
  select: {
    id: true,
    name: true,
    slug: true,
    // Don't select description if not needed
    _count: {
      select: {
        members: true
      }
    }
  }
})

// Use cursor-based pagination for better performance
const projects = await prisma.project.findMany({
  where: { organizationId },
  take: 20,
  cursor: lastProjectId ? { id: lastProjectId } : undefined,
  skip: lastProjectId ? 1 : 0,
  orderBy: { createdAt: 'desc' }
})
```

## Error Handling Patterns

### Database Error Handling
```typescript
export async function safeCreateProject(data: CreateProjectData) {
  try {
    return await prisma.project.create({ data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new Error('Project with this slug already exists')
        case 'P2003':
          throw new Error('Invalid organization reference')
        case 'P2025':
          throw new Error('Organization not found')
        default:
          throw new Error('Database operation failed')
      }
    }
    throw error
  }
}
```

### Connection Management
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
```

## Seeding Patterns

### Development Seed Data
```typescript
// prisma/seed.ts
import { PrismaClient, Role, ProjectMemberRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create test organization
  const testOrg = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for development'
    }
  })

  // Create test users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      clerkId: 'test-admin-clerk-id',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: Role.ORG_ADMIN,
      organizationId: testOrg.id
    }
  })

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      clerkId: 'test-user-clerk-id',
      email: 'user@test.com',
      name: 'Test User',
      role: Role.USER,
      organizationId: testOrg.id
    }
  })

  // Create test project
  const testProject = await prisma.project.upsert({
    where: { 
      slug_organizationId: {
        slug: 'test-project',
        organizationId: testOrg.id
      }
    },
    update: {},
    create: {
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test project for development',
      organizationId: testOrg.id
    }
  })

  // Add users to project
  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: adminUser.id,
        projectId: testProject.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      projectId: testProject.id,
      role: ProjectMemberRole.OWNER
    }
  })

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: regularUser.id,
        projectId: testProject.id
      }
    },
    update: {},
    create: {
      userId: regularUser.id,
      projectId: testProject.id,
      role: ProjectMemberRole.MEMBER
    }
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

These database patterns ensure data integrity, performance, and maintainability while supporting the multi-tenant architecture of Docify.ai Pro.