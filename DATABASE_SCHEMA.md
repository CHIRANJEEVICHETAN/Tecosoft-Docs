# Multi-Tenant Database Schema

This document describes the multi-tenant database schema implemented using Prisma ORM for the documentation platform.

## Architecture Overview

The schema follows a **shared database, separate tenant approach** where:
- All tenants share the same database
- Data isolation is achieved through organization-level filtering
- Each organization acts as a tenant with its own users and projects

## Core Models

### Organization
Represents a tenant in the multi-tenant system.

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique // URL-friendly identifier
  description String?
  users       User[]
  projects    Project[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("organizations")
}
```

**Key Features:**
- `slug`: Used for tenant identification in URLs (e.g., `/org/tecosoft/...`)
- Cascading relationships ensure data cleanup when organization is deleted

### User
Represents users within an organization, integrated with Clerk authentication.

```prisma
model User {
  id             String       @id @default(cuid())
  clerkId        String       @unique // Clerk user ID for authentication
  email          String       @unique
  name           String?
  firstName      String?
  lastName       String?
  imageUrl       String?
  role           Role         @default(USER)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  projectMembers ProjectMember[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("users")
}
```

**Key Features:**
- `clerkId`: Links to Clerk authentication system
- Organization-scoped: Each user belongs to exactly one organization
- Role-based access control through the `role` field

### Role Hierarchy

```prisma
enum Role {
  SUPER_ADMIN // Platform admin
  ORG_ADMIN   // Organization admin
  MANAGER     // Project manager
  USER        // Regular user
  VIEWER      // Read-only access
}
```

**Role Permissions:**
- `SUPER_ADMIN`: Platform-wide access
- `ORG_ADMIN`: Full access within their organization
- `MANAGER`: Can manage projects within their organization
- `USER`: Standard access to assigned projects
- `VIEWER`: Read-only access to assigned projects

### Project
Represents projects within an organization.

```prisma
model Project {
  id             String          @id @default(cuid())
  name           String
  slug           String          // URL-friendly identifier
  description    String?
  status         ProjectStatus   @default(ACTIVE)
  organizationId String
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members        ProjectMember[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([slug, organizationId]) // Unique slug per organization
  @@map("projects")
}
```

**Key Features:**
- Slug is unique per organization (not globally)
- Status management for project lifecycle
- Automatic cleanup when organization is deleted

### ProjectMember
Junction table for project-user relationships with role-based access.

```prisma
model ProjectMember {
  id        String            @id @default(cuid())
  userId    String
  projectId String
  role      ProjectMemberRole @default(MEMBER)
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@unique([userId, projectId])
  @@map("project_members")
}
```

**Project Role Hierarchy:**
```prisma
enum ProjectMemberRole {
  OWNER   // Project owner
  ADMIN   // Project admin
  MEMBER  // Regular member
  VIEWER  // Read-only access
}
```

## Multi-Tenant Features

### Data Isolation
- All queries are automatically filtered by `organizationId`
- Middleware ensures users can only access their organization's data
- URL structure enforces tenant context: `/org/{orgSlug}/...`

### Permission System
The schema implements a two-level permission system:

1. **Organization Level**: User roles within the organization
2. **Project Level**: User roles within specific projects

### Security Considerations

- **Row Level Security**: Implemented through application-level filtering
- **Cascade Deletes**: Ensure data consistency when organizations/users are removed
- **Unique Constraints**: Prevent conflicts within tenant boundaries
- **Authentication Integration**: Seamless integration with Clerk

## Usage Examples

### Creating a Multi-Tenant Service
```typescript
import { MultiTenantService } from '@/lib/multi-tenant'

// Create organization
const org = await MultiTenantService.createOrganization({
  name: 'Tecosoft',
  slug: 'tecosoft',
  description: 'Technology solutions company'
})

// Create user in organization
const user = await MultiTenantService.createUser({
  clerkId: 'clerk_user_id',
  email: 'user@tecosoft.com',
  name: 'John Doe',
  role: Role.USER,
  organizationId: org.id
})

// Create project
const project = await MultiTenantService.createProject({
  name: 'Documentation Platform',
  slug: 'docs-platform',
  description: 'Multi-tenant docs platform',
  organizationId: org.id
})

// Add user to project
await MultiTenantService.addProjectMember(
  user.id,
  project.id,
  ProjectMemberRole.MEMBER
)
```

### Permission Checks
```typescript
// Check organization access
const canAccess = await MultiTenantService.canUserAccessOrganization(
  clerkId,
  organizationId
)

// Check project access
const canAccessProject = await MultiTenantService.canUserAccessProject(
  clerkId,
  projectId
)

// Get user's role in project
const projectRole = await MultiTenantService.getUserProjectRole(
  clerkId,
  projectId
)
```

## Database Setup

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Push Schema to Database
```bash
npm run db:push
```

### 3. Run Migrations (Production)
```bash
npm run db:migrate
```

### 4. Seed Database
```bash
npm run db:seed
```

### 5. Open Prisma Studio
```bash
npm run db:studio
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL="your_postgresql_connection_string"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
```

## Best Practices

1. **Always filter by organization**: Never query cross-tenant data
2. **Use middleware**: Implement tenant context in all API routes
3. **Validate permissions**: Check both organization and project-level access
4. **Audit trails**: Track all multi-tenant operations
5. **Error handling**: Provide clear error messages for access violations

## Migration Strategy

When updating the schema:

1. Create migration: `npx prisma migrate dev --name migration_name`
2. Test with seed data: `npm run db:seed`
3. Validate in staging environment
4. Deploy to production: `npx prisma migrate deploy`

This schema provides a robust foundation for multi-tenancy while maintaining data integrity and security across all tenant boundaries.
